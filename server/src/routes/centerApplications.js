'use strict';
/**
 * center applications routes — Phase 5B
 * Mounted under /api/center via center.js router (see index.js comment).
 *
 * All routes use requireCenterAdmin (already applied by the parent center router
 * via router.use(requireCenterAdmin)).
 * PATCH routes also require requireApprovedCenter.
 */

const express = require('express');
const { requireApprovedCenter } = require('../middleware/center');
const {
  listCenterApplications,
  approveCenterApplication,
  rejectCenterApplication,
} = require('../controllers/centerApplication.controller');

const router = express.Router();

// GET  /api/center/applications?status=...  — any center status
router.get('/', listCenterApplications);

// PATCH /api/center/applications/:id/approve — approved center only
router.patch('/:id/approve', requireApprovedCenter, approveCenterApplication);

// PATCH /api/center/applications/:id/reject  — approved center only
router.patch('/:id/reject', requireApprovedCenter, rejectCenterApplication);

module.exports = router;

