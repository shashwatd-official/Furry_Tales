const express = require('express');
const { requireCenterAdmin, requireApprovedCenter } = require('../middleware/center');
const { singlePhotoUpload } = require('../utils/imageUpload');
const {
  getCenter,
  updateCenter,
  updateCenterPhoto,
  listAnimals,
  createAnimal,
  updateAnimal,
  removeAnimal,
  updateAnimalStatus,
  replaceAnimalPhoto,
} = require('../controllers/center.controller');

const router = express.Router();

// ALL /api/center/* routes require center admin auth + fresh center load
router.use(requireCenterAdmin);

// ── Center profile ─────────────────────────────────────────────────────────────
// GET works for any center status (pending, rejected, suspended, approved)
router.get('/', getCenter);

// PATCH and POST (writes) require approved center
router.patch('/', requireApprovedCenter, updateCenter);
router.post('/photo', requireApprovedCenter, singlePhotoUpload, updateCenterPhoto);

// ── Animals ────────────────────────────────────────────────────────────────────
// GET works for any center status
router.get('/animals', listAnimals);

// All writes require approved center
router.post('/animals', requireApprovedCenter, singlePhotoUpload, createAnimal);
router.patch('/animals/:id', requireApprovedCenter, updateAnimal);
router.delete('/animals/:id', requireApprovedCenter, removeAnimal);
router.patch('/animals/:id/status', requireApprovedCenter, updateAnimalStatus);
router.post('/animals/:id/photos', requireApprovedCenter, singlePhotoUpload, replaceAnimalPhoto);

module.exports = router;
