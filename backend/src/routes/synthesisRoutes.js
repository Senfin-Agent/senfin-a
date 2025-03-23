// backend/src/routes/synthesisRoutes.js
const express = require('express');
const router = express.Router();
const cors = require('cors');
const synthesisController = require('../controllers/synthesisController');

// Apply CORS middleware without restrictions (allow all origins)
router.use(cors());
router.options('*', cors());

router.post('/start', synthesisController.startSynthesis);
router.get('/fetch/:bucket/:key', synthesisController.fetchSynthesisObject);

module.exports = router;
