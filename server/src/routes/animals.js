const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { listAnimals, getAnimal } = require('../controllers/animals.controller');

const router = express.Router();

// Require logged-in user (any role: adopter, center_admin, platform_owner)
router.use(requireAuth);

router.get('/', listAnimals);
router.get('/:id', getAnimal);

module.exports = router;
