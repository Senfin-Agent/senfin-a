// backend/src/routes/agentRoutes.js
const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

// GET /agent/objects?prefix=cot/
router.get('/objects', agentController.listObjects);

// GET /agent/object/synthetic-data/1678912345.json
router.get('/object/:key(*)', agentController.fetchObject);

module.exports = router;
