// api/index.js
const express = require('express');
const app = express();
const cors = require('cors');


// 1. Import your main router (the one that uses router.use('/agent', agentRoutes))
const mainRouter = require('../src/routes'); 
// Adjust the relative path as needed

app.use(cors());

// 2. Middleware
app.use(express.json());

// 3. Mount your main router
app.use('/', mainRouter);

// 4. Export the Express app as a serverless function
module.exports = app;
