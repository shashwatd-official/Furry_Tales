const prisma = require('../config/db');
const { requireAuth, requireRole } = require('./auth');

/**
 * requireCenterAdmin
 *
 * Middleware chain: requireAuth → requireRole('center_admin') → load center fresh from DB.
 *
 * Attaches req.center to the request.
 * Returns 403 if the user has no center_id or the center doesn't exist.
 *
 * ALL /api/center/* routes use this middleware.
 */
async function requireCenterAdmin(req, res, next) {
  // First run requireAuth (will 401 if not logged in)
  requireAuth(req, res, async (authErr) => {
    if (authErr) return next(authErr);

    // Then requireRole('center_admin') (will 403 if wrong role)
    requireRole('center_admin')(req, res, async (roleErr) => {
      if (roleErr) return next(roleErr);

      // Load the center fresh from DB (never trust body/session)
      const centerId = req.user.center_id;
      if (!centerId) {
        return res.status(403).json({ error: 'You do not have a center associated with your account.' });
      }

      try {
        const center = await prisma.center.findUnique({
          where: { id: centerId },
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
            photo_url: true,
            status: true,
            rejection_reason: true,
            reviewed_at: true,
            created_at: true,
          },
        });

        if (!center) {
          return res.status(403).json({ error: 'Your center could not be found. Please contact support.' });
        }

        req.center = center;
        next();
      } catch (err) {
        console.error('requireCenterAdmin: DB error loading center:', err.message);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
      }
    });
  });
}

/**
 * requireApprovedCenter
 *
 * Must be used AFTER requireCenterAdmin (req.center must be set).
 *
 * Returns 403 if the center's status is not 'approved'.
 * Used on all POST, PATCH and DELETE routes under /api/center/*.
 */
function requireApprovedCenter(req, res, next) {
  if (!req.center) {
    return res.status(500).json({ error: 'Center middleware not applied.' });
  }

  if (req.center.status !== 'approved') {
    return res.status(403).json({
      error: 'Your center must be approved before you can do this.',
    });
  }

  next();
}

module.exports = { requireCenterAdmin, requireApprovedCenter };
