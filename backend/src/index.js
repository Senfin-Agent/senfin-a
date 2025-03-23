require('dotenv').config(); // loads environment variables
const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors()); // Enable CORS globally

// Load routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Senfin-A backend running on port ${PORT}`);
});
