'use strict';
/**
 * centerApplication.controller.js
 *
 * Center admin side of adoption applications — Phase 5B.
 *
 * Rules enforced:
 * - center_id is ALWAYS taken from req.center.id (set by requireCenterAdmin),
 *   never from the request body or URL.
 * - Every status-changing update is a single atomic conditional update or a
 *   transaction of conditional updates (never read-then-write as the guard).
 * - Emails fire AFTER the transaction commits and never block / roll back anything.
 * - No adopter account fields (user id, email, password_hash) are ever returned
 *   to the center admin.
 */

const prisma = require('../config/db');
const {
  listApplicationsQuerySchema,
  uuidParamSchema,
  noteBodySchema,
} = require('../validators/centerApplications.validators');
const {
  sendEmail,
  getApplicationApprovedEmail,
  getApplicationRejectedEmail,
  getApplicationNotSelectedEmail,
  getApplicationCancelledByCenterEmail,
} = require('../utils/email');

// ---------------------------------------------------------------------------
// Custom error class used to abort a Prisma transaction with a specific
// HTTP status code and message.  The transaction callback throws this;
// the outer try/catch translates it to the right HTTP response.
// ---------------------------------------------------------------------------
class TransactionAbortError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'TransactionAbortError';
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the first photo URL for an animal (or null).
 * Used in select projections that pre-fetched photos.
 */
function photoUrl(photos) {
  return Array.isArray(photos) && photos.length > 0 ? photos[0].url : null;
}

// ---------------------------------------------------------------------------
// GET /api/center/applications?status=...
// Auth: requireCenterAdmin (any center status)
//
// Returns { applications, counts }
// Applications: max 200, only for this center.
// Pending → sorted oldest first; all others → newest first.
// Each application includes:
//   id, status, admin_note, created_at, decided_at, form_data,
//   animal { id, name, category, status, photo_url },
//   competing_pending_count (number of OTHER pending apps for the same animal;
//     0 for non-pending applications)
// counts: { pending, approved, rejected, not_selected, cancelled }
// NO user account fields are returned.
// ---------------------------------------------------------------------------
async function listCenterApplications(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Validate query params (strict — unknown keys → 400)
  const parsed = listApplicationsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { status } = parsed.data;
  const centerId = req.center.id;

  // Build where clause
  const where = {
    center_id: centerId,
    ...(status !== 'all' ? { status } : {}),
  };

  // Sort: pending = oldest first; all others = newest first
  const orderBy = status === 'pending'
    ? { created_at: 'asc' }
    : { created_at: 'desc' };

  // Fetch applications (max 200) in parallel with counts
  const [rawApplications, countsByStatus] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy,
      take: 200,
      select: {
        id: true,
        status: true,
        admin_note: true,
        created_at: true,
        decided_at: true,
        form_data: true,
        animal: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true,
            photos: {
              select: { url: true },
              take: 1,
              orderBy: { position: 'asc' },
            },
          },
        },
        // No user select at all — the center sees only form_data
      },
    }),
    // Count per-status (all five statuses)
    prisma.application.groupBy({
      by: ['status'],
      where: { center_id: centerId },
      _count: { _all: true },
    }),
  ]);

  // Build counts map with defaults for all five statuses
  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    not_selected: 0,
    cancelled: 0,
  };
  for (const row of countsByStatus) {
    if (row.status in counts) {
      counts[row.status] = row._count._all;
    }
  }

  // For pending applications, compute competing_pending_count in one round-trip.
  // Fetch counts of pending applications per animal_id for animals that have
  // at least one pending application in the result set.
  const pendingApps = rawApplications.filter((a) => a.status === 'pending');
  let competingCountMap = {}; // animal_id → total pending count for that animal

  if (pendingApps.length > 0) {
    const animalIds = [...new Set(pendingApps.map((a) => a.animal.id))];
    const pendingCounts = await prisma.application.groupBy({
      by: ['animal_id'],
      where: {
        animal_id: { in: animalIds },
        status: 'pending',
      },
      _count: { _all: true },
    });
    for (const row of pendingCounts) {
      competingCountMap[row.animal_id] = row._count._all;
    }
  }

  // Map to output shape
  const applications = rawApplications.map((app) => {
    const totalPending = competingCountMap[app.animal.id] ?? 0;
    // competing_pending_count = total pending for this animal MINUS this application itself
    const competing_pending_count =
      app.status === 'pending' ? Math.max(0, totalPending - 1) : 0;

    return {
      id: app.id,
      status: app.status,
      admin_note: app.admin_note,
      created_at: app.created_at,
      decided_at: app.decided_at,
      form_data: app.form_data,
      animal: {
        id: app.animal.id,
        name: app.animal.name,
        category: app.animal.category,
        status: app.animal.status,
        photo_url: photoUrl(app.animal.photos),
      },
      competing_pending_count,
    };
  });

  return res.status(200).json({ applications, counts });
}

// ---------------------------------------------------------------------------
// PATCH /api/center/applications/:id/approve
// Auth: requireCenterAdmin + requireApprovedCenter
//
// ONE Prisma interactive transaction in this exact order:
//   a. Load application (with animal name, applicant name + email)
//   b. Update animal: WHERE id AND center_id AND status='available' → pending_pickup
//   c. Update application: WHERE id AND center_id AND status='pending' → approved
//   d. Read + mark other pending applications for same animal as not_selected
// Return 200 { ok: true, not_selected_count: n }
// After commit: send approval email, then not-selected emails.
// ---------------------------------------------------------------------------
async function approveCenterApplication(req, res) {
  // Validate :id
  const idParsed = uuidParamSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(400).json({ error: 'Invalid application ID.' });
  }

  // Validate body
  const bodyParsed = noteBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.issues[0].message });
  }

  const applicationId = idParsed.data;
  const note = bodyParsed.data.note ?? null;
  const centerId = req.center.id;
  const now = new Date();

  // Data to carry out of the transaction for email sending
  let emailData = null;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ── a. Load the application ──────────────────────────────────────────
        const app = await tx.application.findFirst({
          where: { id: applicationId, center_id: centerId },
          select: {
            id: true,
            status: true,
            animal_id: true,
            form_data: true,
            user: { select: { name: true, email: true } },
            animal: { select: { name: true } },
          },
        });

        if (!app) {
          throw new TransactionAbortError(404, 'Application not found.');
        }
        if (app.status !== 'pending') {
          throw new TransactionAbortError(
            409,
            'This application has already been decided or was withdrawn.'
          );
        }

        // ── b. Update animal: available → pending_pickup ──────────────────────
        // This runs FIRST to acquire a row-level lock.
        // If the animal was already grabbed by another simultaneous approval,
        // zero rows change and we abort, rolling back everything.
        const animalUpdate = await tx.animal.updateMany({
          where: {
            id: app.animal_id,
            center_id: centerId,
            status: 'available',
          },
          data: { status: 'pending_pickup' },
        });

        if (animalUpdate.count === 0) {
          throw new TransactionAbortError(
            409,
            "This animal is no longer available, so this application can't be approved."
          );
        }

        // ── c. Update application: pending → approved ─────────────────────────
        // The adopter may have withdrawn at the exact same moment.
        const appUpdate = await tx.application.updateMany({
          where: {
            id: applicationId,
            center_id: centerId,
            status: 'pending',
          },
          data: {
            status: 'approved',
            admin_note: note,
            decided_at: now,
          },
        });

        if (appUpdate.count === 0) {
          // Adopter withdrew at the same millisecond — roll back b.
          throw new TransactionAbortError(
            409,
            'This application has already been decided or was withdrawn.'
          );
        }

        // ── d. Mark other pending applications as not_selected ────────────────
        const otherPending = await tx.application.findMany({
          where: {
            animal_id: app.animal_id,
            status: 'pending',
            id: { not: applicationId },
          },
          select: {
            id: true,
            form_data: true,
            user: { select: { name: true, email: true } },
          },
        });

        if (otherPending.length > 0) {
          await tx.application.updateMany({
            where: {
              animal_id: app.animal_id,
              status: 'pending',
              id: { not: applicationId },
            },
            data: { status: 'not_selected', decided_at: now },
          });
        }

        return {
          animalName: app.animal.name,
          approvedApplicant: {
            name: app.user.name,
            email: app.user.email,
            formName: (app.form_data && app.form_data.full_name) || app.user.name,
          },
          notSelectedApplicants: otherPending.map((o) => ({
            name: o.user.name,
            email: o.user.email,
          })),
        };
      },
      { timeout: 15000 } // 15-second transaction timeout
    );

    emailData = result;
  } catch (err) {
    if (err instanceof TransactionAbortError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('[approveCenterApplication] Transaction error:', err.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }

  // Transaction committed. Send emails — failures NEVER block the response.
  const not_selected_count = emailData.notSelectedApplicants.length;

  // Approval email to the approved applicant
  const approvedEmail = getApplicationApprovedEmail({
    adopterName:        emailData.approvedApplicant.name,
    animalName:         emailData.animalName,
    centerName:         req.center.name,
    centerAddress:      req.center.address,
    centerPhone:        req.center.phone,
    centerContactEmail: req.center.contact_email,
    note,
  });
  sendEmail({ to: emailData.approvedApplicant.email, ...approvedEmail }).catch(() => {});

  // Not-selected emails to other applicants
  for (const applicant of emailData.notSelectedApplicants) {
    const nsEmail = getApplicationNotSelectedEmail({
      adopterName: applicant.name,
      animalName:  emailData.animalName,
    });
    sendEmail({ to: applicant.email, ...nsEmail }).catch(() => {});
  }

  return res.status(200).json({ ok: true, not_selected_count });
}

// ---------------------------------------------------------------------------
// PATCH /api/center/applications/:id/reject
// Auth: requireCenterAdmin + requireApprovedCenter
//
// ONE atomic conditional update:
//   updateMany WHERE id AND center_id AND status='pending'
//   → SET status='rejected', admin_note=note, decided_at=now
//
// If 1 row changed: 200 { ok: true } + send rejection email after commit.
// If 0 rows: follow-up read to choose 404 vs 409.
// Rejecting never changes the animal.
// ---------------------------------------------------------------------------
async function rejectCenterApplication(req, res) {
  // Validate :id
  const idParsed = uuidParamSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(400).json({ error: 'Invalid application ID.' });
  }

  // Validate body
  const bodyParsed = noteBodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: bodyParsed.error.issues[0].message });
  }

  const applicationId = idParsed.data;
  const note = bodyParsed.data.note ?? null;
  const centerId = req.center.id;

  // Single atomic conditional update
  const updated = await prisma.application.updateMany({
    where: {
      id: applicationId,
      center_id: centerId,
      status: 'pending',
    },
    data: {
      status: 'rejected',
      admin_note: note,
      decided_at: new Date(),
    },
  });

  if (updated.count === 1) {
    // Committed. Now load info needed for the email (applicant account email,
    // applicant name, animal name) — this is a cheap read-after-write.
    const app = await prisma.application.findFirst({
      where: { id: applicationId, center_id: centerId },
      select: {
        animal: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (app) {
      const rejectedEmail = getApplicationRejectedEmail({
        adopterName: app.user.name,
        animalName:  app.animal.name,
        centerName:  req.center.name,
        note,
      });
      sendEmail({ to: app.user.email, ...rejectedEmail }).catch(() => {});
    }

    return res.status(200).json({ ok: true });
  }

  // Zero rows updated — determine why
  const existing = await prisma.application.findFirst({
    where: { id: applicationId, center_id: centerId },
    select: { id: true, status: true },
  });

  if (existing) {
    return res.status(409).json({
      error: 'This application has already been decided or was withdrawn.',
    });
  }

  return res.status(404).json({ error: 'Application not found.' });
}

// ---------------------------------------------------------------------------
// updateAnimalStatusWithApplications
//
// Called from center.controller.js → updateAnimalStatus after the animal
// status update succeeds. This function handles the application-side logic.
//
// When new status = 'available' (return from pending_pickup):
//   - In ONE transaction with the animal update (passed in as `tx` or done
//     here if tx is null): find approved applications for the animal,
//     updateMany → 'cancelled', then email each one.
//
// When new status = 'adopted': no application changes.
//
// Because center.controller.js's updateAnimalStatus already did the animal
// update atomically, we wrap the application update separately here.
// The whole thing is kept atomic by the caller (see Task 7 in center.controller.js).
// ---------------------------------------------------------------------------
async function cancelApprovedApplicationsForAnimal({ animalId, centerId, animalName, centerName }) {
  // Find approved applications for this animal (need account email + name)
  const approvedApps = await prisma.application.findMany({
    where: {
      animal_id: animalId,
      status: 'approved',
    },
    select: {
      id: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (approvedApps.length === 0) {
    return 0;
  }

  // Atomically cancel them
  await prisma.application.updateMany({
    where: {
      animal_id: animalId,
      status: 'approved',
    },
    data: {
      status: 'cancelled',
      decided_at: new Date(),
    },
  });

  // Email each cancelled applicant (after the update commits)
  for (const app of approvedApps) {
    const cancelledEmail = getApplicationCancelledByCenterEmail({
      adopterName: app.user.name,
      animalName,
    });
    sendEmail({ to: app.user.email, ...cancelledEmail }).catch(() => {});
  }

  return approvedApps.length;
}

module.exports = {
  listCenterApplications,
  approveCenterApplication,
  rejectCenterApplication,
  cancelApprovedApplicationsForAnimal,
};

