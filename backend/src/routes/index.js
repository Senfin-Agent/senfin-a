const express = require('express');
const router = express.Router();
const cors = require('cors');

router.use(cors());

const synthesisRoutes = require('./synthesisRoutes');
router.use('/synthesis', synthesisRoutes);

const recallRoutes = require('./recallRoutes');
router.use('/recall', recallRoutes);

const agentRoutes = require('./agentRoutes');
router.use('/agent', agentRoutes);

const paymentRouter = require('./paymentRouter');
router.use('/access', paymentRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
