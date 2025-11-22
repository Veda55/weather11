const express = require('express');
const path = require('path');
const weatherRoutes = require('./routes/weatherRoutes');
const weatherService = require('./services/weatherService'); // NEW
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data/weather.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API ROUTES
app.use('/api', weatherRoutes);

// STATIC FILES
app.use(express.static(path.join(__dirname, 'public')));

// HEALTH CHECK FOR K8S
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ----------------------------------------
// NEW: Initialize weather data on startup
// ----------------------------------------
async function initializeWeatherCache() {
  try {
    console.log("⏳ Fetching initial weather data...");

    const data = await weatherService.fetchAllCitiesWeather();

    // Ensure /data folder exists
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Write weather.json
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log("✔ Weather cache initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize weather cache:", err.message);
  }
}

const server = app.listen(PORT, () => {
  console.log(`Weather Analytics Server running on port ${PORT}`);
  console.log(`Access dashboard at http://localhost:${PORT}`);

  // Initialize weather cache (IMPORTANT FOR K8S)
  initializeWeatherCache();
});

module.exports = { app, server };

