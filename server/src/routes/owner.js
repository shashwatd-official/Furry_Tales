const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  listCenters,
  approveCenter,
  rejectCenter,
  suspendCenter,
  reinstateCenter,
  getDocument,
} = require('../controllers/owner.controller');

const router = express.Router();

// All routes under /api/owner/* require authentication and the 'owner' role.
// 401 if not logged in, 403 if wrong role.
router.use(requireAuth, requireRole('owner'));

router.get('/centers', listCenters);
router.get('/centers/:id/document', getDocument);
router.patch('/centers/:id/approve', approveCenter);
router.patch('/centers/:id/reject', rejectCenter);
router.patch('/centers/:id/suspend', suspendCenter);
router.patch('/centers/:id/reinstate', reinstateCenter);

module.exports = router;
