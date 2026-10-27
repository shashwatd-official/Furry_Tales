const express = require('express');
const multer = require('multer');

const {
  signupAdopter,
  signupCenter,
  login,
  logout,
  me,
} = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Multer: store file in memory (no temp disk writes), max 6 MB (checked again in controller)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6 MB hard limit at transport layer
});

// Public routes
router.post('/signup/adopter', signupAdopter);
router.post('/signup/center', upload.single('verificationDoc'), signupCenter);
router.post('/login', login);

// Any-logged-in routes
router.post('/logout', logout); // works even without auth – just clears cookie
router.get('/me', requireAuth, me);

module.exports = router;
