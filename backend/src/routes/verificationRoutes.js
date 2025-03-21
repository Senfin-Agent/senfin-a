const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');

// POST endpoint to start a verification
router.post('/start', verificationController.startVerification);

module.exports = router;
