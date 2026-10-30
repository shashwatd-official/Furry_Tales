const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { updateMyLocation } = require('../controllers/me.controller');

const router = express.Router();

// PATCH /api/me/location (requireAuth + requireRole('adopter'))
router.patch('/location', requireAuth, requireRole('adopter'), updateMyLocation);

module.exports = router;
