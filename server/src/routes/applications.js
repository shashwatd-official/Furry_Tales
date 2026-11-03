const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  submitApplication,
  getMyApplications,
  cancelApplication,
} = require('../controllers/application.controller');

// All routes require an authenticated adopter
const adopterOnly = [requireAuth, requireRole('adopter')];

// POST /api/applications — submit a new adoption application
router.post('/', adopterOnly, submitApplication);

// GET /api/applications/mine — list own applications
// NOTE: must be defined before /:id to avoid "mine" being parsed as a UUID param
router.get('/mine', adopterOnly, getMyApplications);

// PATCH /api/applications/:id/cancel — withdraw a pending application
router.patch('/:id/cancel', adopterOnly, cancelApplication);

module.exports = router;
