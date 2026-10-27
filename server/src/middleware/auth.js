const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

/**
 * requireAuth – reads the auth_token cookie, verifies the JWT,
 * then loads the user FRESH from the database on every request.
 * This means any role or center-status change takes effect immediately.
 */
async function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Not logged in.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        center: {
          select: {
            id: true,
            name: true,
            status: true,
            rejection_reason: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Attach user to request – never expose password_hash downstream
    const { password_hash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    console.error('requireAuth DB error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

/**
 * requireRole – factory that returns a middleware checking req.user.role.
 * Must be used AFTER requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not logged in.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
