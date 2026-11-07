const prisma = require('../config/db');
const {
  submitApplicationSchema,
  uuidParamSchema,
} = require('../validators/application.validators');
const {
  sendEmail,
  getApplicationReceivedAdopterEmail,
  getApplicationReceivedCenterEmail,
} = require('../utils/email');

// ---------------------------------------------------------------------------
// POST /api/applications
// Auth: adopter only
//
// Check order:
//   1. Validate body (400 on any violation)
//   2. Look up animal — must exist, be 'available', at an 'approved' center (404 if not)
//   3. Create application (catch P2002 unique violation → 409)
//   4. Fire emails asynchronously (failures never block the response)
// ---------------------------------------------------------------------------
async function submitApplication(req, res) {
  // 1. Validate body — schema is { animal_id: uuid, form_data: {...} }
  const parsed = submitApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return res.status(400).json({ error: firstIssue.message });
  }

  const { animal_id, form_data } = parsed.data;
  const userId = req.user.id;

  // 2. Look up the animal — must be available at an approved center.
  //    center_id comes from the animal's own DB row, never from the request.
  const animal = await prisma.animal.findFirst({
    where: {
      id: animal_id,
      status: 'available',
      center: { status: 'approved' },
    },
    select: {
      id: true,
      name: true,
      center_id: true,
      center: {
        select: {
          id: true,
          name: true,
          contact_email: true,
        },
      },
    },
  });

  if (!animal) {
    return res.status(404).json({ error: 'Animal not found.' });
  }

  // 3. Create the application.
  //    The database has a unique partial index (user_id, animal_id) WHERE
  //    status = 'pending'. A duplicate pending application raises P2002.
  let application;
  try {
    application = await prisma.application.create({
      data: {
        user_id: userId,
        animal_id: animal.id,
        center_id: animal.center_id,
        status: 'pending',
        // Store the full form_data JSON as-is. The schema already validated
        // and normalised every field (strings trimmed, email lowercased).
        form_data,
      },
      select: { id: true },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error:
          'You already have a pending application for this animal. Please withdraw it before applying again.',
      });
    }
    throw err;
  }

  // 4. Send emails — failures must NEVER block the response.
  const adopterEmail = getApplicationReceivedAdopterEmail({
    adopterName: req.user.name,
    animalName: animal.name,
    centerName: animal.center.name,
  });
  sendEmail({ to: req.user.email, ...adopterEmail }).catch(() => {});

  // Skip center email if the center has no contact_email.
  if (animal.center.contact_email) {
    const centerEmail = getApplicationReceivedCenterEmail({
      centerName: animal.center.name,
      animalName: animal.name,
      adopterName: form_data.full_name,
      adopterEmail: req.user.email,
    });
    sendEmail({ to: animal.center.contact_email, ...centerEmail }).catch(() => {});
  }

  return res.status(201).json({ id: application.id });
}

// ---------------------------------------------------------------------------
// GET /api/applications/mine
// Auth: adopter only
// Returns all applications for the logged-in adopter.
// Center contact details (address, phone, contact_email) are included ONLY
// when the application status is 'approved'.
// ---------------------------------------------------------------------------
async function getMyApplications(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const userId = req.user.id;

  const applications = await prisma.application.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      status: true,
      admin_note: true,
      decided_at: true,
      created_at: true,
      animal: {
        select: {
          id: true,
          name: true,
          category: true,
          photos: {
            select: { url: true },
            take: 1,
            orderBy: { position: 'asc' },
          },
        },
      },
      center: {
        select: {
          name: true,
          city: true,
          // Contact fields selected here; only exposed for approved status below
          address: true,
          phone: true,
          contact_email: true,
        },
      },
    },
  });

  const results = applications.map((app) => {
    const isApproved = app.status === 'approved';
    return {
      id: app.id,
      status: app.status,
      admin_note: app.admin_note,
      decided_at: app.decided_at,
      created_at: app.created_at,
      animal: {
        id: app.animal.id,
        name: app.animal.name,
        category: app.animal.category,
        photo_url: app.animal.photos[0]?.url ?? null,
      },
      center: {
        name: app.center.name,
        city: app.center.city,
        // Pickup / contact details — only for approved applications
        address:       isApproved ? app.center.address       : undefined,
        phone:         isApproved ? app.center.phone         : undefined,
        contact_email: isApproved ? app.center.contact_email : undefined,
      },
    };
  });

  return res.status(200).json({ applications: results });
}

// ---------------------------------------------------------------------------
// PATCH /api/applications/:id/cancel
// Auth: adopter, own application only
//
// MUST be a single atomic conditional update (updateMany).
// Reason: between the time we read the status and the time we write,
// a center admin (Phase 5B) may approve the application. A two-step
// find+update would create a race condition where we could cancel an
// already-approved application. updateMany with the 'pending' condition
// in the WHERE clause eliminates that race — if the row is not pending at
// the moment the UPDATE runs, zero rows are affected and we know it.
// ---------------------------------------------------------------------------
async function cancelApplication(req, res) {
  // Validate :id param
  const idParsed = uuidParamSchema.safeParse(req.params.id);
  if (!idParsed.success) {
    return res.status(400).json({ error: 'Invalid application ID.' });
  }

  const applicationId = idParsed.data;
  const userId = req.user.id;

  // Single atomic update: only touches rows where ALL three conditions hold.
  const result = await prisma.application.updateMany({
    where: {
      id: applicationId,
      user_id: userId,
      status: 'pending',
    },
    data: {
      status: 'cancelled',
      decided_at: new Date(),
    },
  });

  if (result.count === 1) {
    return res.status(200).json({ ok: true });
  }

  // Zero rows updated — determine why so we can return the right message.
  const existing = await prisma.application.findFirst({
    where: { id: applicationId, user_id: userId },
    select: { status: true },
  });

  if (existing) {
    // Application exists and belongs to this user, but is no longer pending
    return res.status(409).json({
      error: 'Only pending applications can be withdrawn.',
    });
  }

  // Application does not exist OR belongs to a different user
  // (identical message for both — no information leak)
  return res.status(404).json({ error: 'Application not found.' });
}

module.exports = {
  submitApplication,
  getMyApplications,
  cancelApplication,
};
