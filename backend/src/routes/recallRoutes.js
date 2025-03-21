// backend/src/routes/recallRoutes.js
const express = require('express');
const router = express.Router();
const recallController = require('../controllers/recallController');

router.post('/queryBucket', recallController.queryBucket);
router.post('/getObject', recallController.getObject);

module.exports = router;
