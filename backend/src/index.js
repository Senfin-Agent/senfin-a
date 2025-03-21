require('dotenv').config(); // loads environment variables
const express = require('express');
const app = express();

app.use(express.json());

// Load routes
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Senfin-A backend running on port ${PORT}`);
});
