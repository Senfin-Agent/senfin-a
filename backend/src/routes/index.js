const express = require('express');
const router = express.Router();

// Verification routes
const verificationRoutes = require('./verificationRoutes');
router.use('/verification', verificationRoutes);


const synthesisRoutes = require('./synthesisRoutes');
router.use('/synthesis', synthesisRoutes);


const recallRoutes = require('./recallRoutes');
router.use('/recall', recallRoutes);

const agentRoutes = require('./agentRoutes');
router.use('/agent', agentRoutes); // make sure this is mounted



// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
