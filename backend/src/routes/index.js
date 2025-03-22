const express = require('express');
const router = express.Router();



const synthesisRoutes = require('./synthesisRoutes');
router.use('/synthesis', synthesisRoutes);


const recallRoutes = require('./recallRoutes');
router.use('/recall', recallRoutes);

const agentRoutes = require('./agentRoutes');
router.use('/agent', agentRoutes); // make sure this is mounted

const paymentRouter = require('./paymentRouter');
router.use('/access', paymentRouter); // mount payment router for access control



// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
