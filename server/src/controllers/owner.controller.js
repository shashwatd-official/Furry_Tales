const prisma = require('../config/db');
const { getVerificationDocSignedUrl } = require('../utils/storage');
const {
  sendEmail,
  getCenterApprovedEmail,
  getCenterRejectedEmail,
} = require('../utils/email');
const {
  listCentersQuerySchema,
  centerIdParamSchema,
  rejectBodySchema,
} = require('../validators/owner.validators');

/**
 * Task 4: GET /api/owner/centers?status=pending|approved|rejected|suspended
 * Default: pending (any other value returns 400).
 * Returns: { centers, counts }
 * Explicit select so password_hash and internal paths are never returned.
 */
async function listCenters(req, res) {
  const queryResult = listCentersQuerySchema.safeParse(req.query);
  if (!queryResult.success) {
    return res.status(400).json({ error: 'Invalid status parameter. Must be pending, approved, rejected, or suspended.' });
  }

  const { status } = queryResult.data;

  try {
    // 1. Fetch centers for the requested status
    const rawCenters = await prisma.center.findMany({
      where: { status },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        pincode: true,
        latitude: true,
        longitude: true,
        contact_email: true,
        phone: true,
        description: true,
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        verification_doc_url: true, // internal check only, will map to boolean
        users: {
          where: { role: 'center_admin' },
          select: {
            name: true,
            email: true,
            phone: true,
          },
          take: 1,
        },
      },
    });

    // 2. Map centers to ensure verification_doc_url is NEVER returned as a raw path,
    // only has_verification_doc: true/false. Flatten admin info cleanly.
    const centers = rawCenters.map((c) => {
      const admin = c.users[0] || null;
      return {
        id: c.id,
        name: c.name,
        address: c.address,
        city: c.city,
        pincode: c.pincode,
        latitude: c.latitude,
        longitude: c.longitude,
        contact_email: c.contact_email,
        phone: c.phone,
        description: c.description,
        status: c.status,
        rejection_reason: c.rejection_reason,
        reviewed_at: c.reviewed_at,
        created_at: c.created_at,
        has_verification_doc: Boolean(c.verification_doc_url),
        admin_name: admin ? admin.name : null,
        admin_email: admin ? admin.email : null,
        admin_phone: admin ? admin.phone : null,
      };
    });

    // 3. Counts per status
    const [pendingCount, approvedCount, rejectedCount, suspendedCount] = await Promise.all([
      prisma.center.count({ where: { status: 'pending' } }),
      prisma.center.count({ where: { status: 'approved' } }),
      prisma.center.count({ where: { status: 'rejected' } }),
      prisma.center.count({ where: { status: 'suspended' } }),
    ]);

    return res.status(200).json({
      centers,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        suspended: suspendedCount,
      },
    });
  } catch (err) {
    console.error('listCenters error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch centers. Please try again.' });
  }
}

/**
 * Task 5: PATCH /api/owner/centers/:id/approve
 * Allowed only when current status is pending.
 * Uses atomic conditional update (updateMany where id AND status='pending').
 * Sends "Center approved" email AFTER the database change succeeds.
 */
async function approveCenter(req, res) {
  const paramResult = centerIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid center ID.' });
  }

  const { id } = paramResult.data;

  try {
    // Check if the center exists at all
    const existing = await prisma.center.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        users: {
          where: { role: 'center_admin' },
          select: { name: true, email: true },
          take: 1,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Center not found.' });
    }

    // Atomic conditional update
    const updateResult = await prisma.center.updateMany({
      where: {
        id,
        status: 'pending',
      },
      data: {
        status: 'approved',
        reviewed_at: new Date(),
        reviewed_by: req.user.id,
        rejection_reason: null,
      },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        error: 'This center was already reviewed or is not in the right state.',
      });
    }

    // Fetch the admin user to send the approval email
    const admin = existing.users[0];
    if (admin && admin.email) {
      const emailContent = getCenterApprovedEmail({
        centerName: existing.name,
        adminName: admin.name,
      });
      // Fire-and-forget email helper; does not throw and won't block response
      sendEmail({
        to: admin.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      }).catch((emailErr) => {
        console.error('[email] Unexpected error during approveCenter email:', emailErr.message);
      });
    }

    return res.status(200).json({
      message: 'Center approved successfully.',
      centerId: id,
      status: 'approved',
    });
  } catch (err) {
    console.error('approveCenter error:', err.message);
    return res.status(500).json({ error: 'Failed to approve center. Please try again.' });
  }
}

/**
 * Task 6: PATCH /api/owner/centers/:id/reject
 * Allowed only when current status is pending.
 * Body: { reason } (5-500 chars).
 * Atomic updateMany.
 * Sends "Center rejected" email AFTER database change succeeds.
 */
async function rejectCenter(req, res) {
  const paramResult = centerIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid center ID.' });
  }

  const bodyResult = rejectBodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    const errorMsg = bodyResult.error.errors[0]?.message || 'Invalid rejection reason.';
    return res.status(400).json({ error: errorMsg });
  }

  const { id } = paramResult.data;
  const { reason } = bodyResult.data;

  try {
    const existing = await prisma.center.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        users: {
          where: { role: 'center_admin' },
          select: { name: true, email: true },
          take: 1,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Center not found.' });
    }

    // Atomic conditional update
    const updateResult = await prisma.center.updateMany({
      where: {
        id,
        status: 'pending',
      },
      data: {
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date(),
        reviewed_by: req.user.id,
      },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        error: 'This center was already reviewed or is not in the right state.',
      });
    }

    // Send rejection email to admin
    const admin = existing.users[0];
    if (admin && admin.email) {
      const emailContent = getCenterRejectedEmail({
        centerName: existing.name,
        adminName: admin.name,
        reason,
      });
      sendEmail({
        to: admin.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      }).catch((emailErr) => {
        console.error('[email] Unexpected error during rejectCenter email:', emailErr.message);
      });
    }

    return res.status(200).json({
      message: 'Center rejected successfully.',
      centerId: id,
      status: 'rejected',
    });
  } catch (err) {
    console.error('rejectCenter error:', err.message);
    return res.status(500).json({ error: 'Failed to reject center. Please try again.' });
  }
}

/**
 * Task 7: PATCH /api/owner/centers/:id/suspend
 * Allowed only when current status is approved.
 * Sets status=suspended, reviewed_at, reviewed_by. No email.
 */
async function suspendCenter(req, res) {
  const paramResult = centerIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid center ID.' });
  }

  const { id } = paramResult.data;

  try {
    const existing = await prisma.center.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Center not found.' });
    }

    const updateResult = await prisma.center.updateMany({
      where: {
        id,
        status: 'approved',
      },
      data: {
        status: 'suspended',
        reviewed_at: new Date(),
        reviewed_by: req.user.id,
      },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        error: 'This center was already reviewed or is not in the right state.',
      });
    }

    return res.status(200).json({
      message: 'Center suspended successfully.',
      centerId: id,
      status: 'suspended',
    });
  } catch (err) {
    console.error('suspendCenter error:', err.message);
    return res.status(500).json({ error: 'Failed to suspend center. Please try again.' });
  }
}

/**
 * Task 8: PATCH /api/owner/centers/:id/reinstate
 * Allowed only when current status is suspended.
 * Sets status=approved. No email.
 */
async function reinstateCenter(req, res) {
  const paramResult = centerIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid center ID.' });
  }

  const { id } = paramResult.data;

  try {
    const existing = await prisma.center.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Center not found.' });
    }

    const updateResult = await prisma.center.updateMany({
      where: {
        id,
        status: 'suspended',
      },
      data: {
        status: 'approved',
        reviewed_at: new Date(),
        reviewed_by: req.user.id,
      },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        error: 'This center was already reviewed or is not in the right state.',
      });
    }

    return res.status(200).json({
      message: 'Center reinstated successfully.',
      centerId: id,
      status: 'approved',
    });
  } catch (err) {
    console.error('reinstateCenter error:', err.message);
    return res.status(500).json({ error: 'Failed to reinstate center. Please try again.' });
  }
}

/**
 * Task 10: GET /api/owner/centers/:id/document
 * Returns a 60-second signed URL for the center's verification document.
 * Storage path and keys are NEVER returned to browser.
 * Returns 404 if the center has no document or does not exist.
 */
async function getDocument(req, res) {
  const paramResult = centerIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return res.status(400).json({ error: 'Invalid center ID.' });
  }

  const { id } = paramResult.data;

  try {
    const center = await prisma.center.findUnique({
      where: { id },
      select: {
        id: true,
        verification_doc_url: true,
      },
    });

    if (!center) {
      return res.status(404).json({ error: 'Center not found.' });
    }

    if (!center.verification_doc_url) {
      return res.status(404).json({ error: 'This center has no verification document.' });
    }

    const signedUrl = await getVerificationDocSignedUrl(center.verification_doc_url, 60);

    return res.status(200).json({ url: signedUrl });
  } catch (err) {
    console.error('getDocument error:', err.message);
    return res.status(500).json({ error: 'Failed to generate document link. Please try again.' });
  }
}

module.exports = {
  listCenters,
  approveCenter,
  rejectCenter,
  suspendCenter,
  reinstateCenter,
  getDocument,
};
