// backend/src/routes/synthesisRoutes.js
const express = require('express');
const router = express.Router();
const synthesisController = require('../controllers/synthesisController');

router.post('/start', synthesisController.startSynthesis);

router.get('/fetch/:bucket/:key', synthesisController.fetchSynthesisObject);


module.exports = router;
