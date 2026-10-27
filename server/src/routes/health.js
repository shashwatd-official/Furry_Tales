const express = require('express');
const prisma = require('../config/db');

const router = express.Router();

// GET /api/health - returns { "status": "ok" } and confirms the database connects
router.get('/health', async (req, res) => {
  try {
    // Check database connection by executing a simple query
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: error.message
    });
  }
});

module.exports = router;
