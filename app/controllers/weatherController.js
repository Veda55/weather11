const weatherService = require('../services/weatherService');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/weather.json');

const getWeather = async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const weatherData = JSON.parse(data);
    res.status(200).json(weatherData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ 
        error: 'Weather data not found. Please refresh to fetch initial data.',
        message: 'Call POST /api/refresh to initialize dataset'
      });
    } else {
      console.error('Error reading weather data:', error);
      res.status(500).json({ 
        error: 'Failed to read weather data',
        message: error.message 
      });
    }
  }
};

const refreshWeather = async (req, res) => {
  try {
    console.log('Refreshing weather data...');
    const weatherData = await weatherService.fetchAllCitiesWeather();
    
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(weatherData, null, 2), 'utf8');
    
    console.log('Weather data refreshed successfully');
    res.status(200).json({ 
      message: 'Weather data refreshed successfully',
      data: weatherData 
    });
  } catch (error) {
    console.error('Error refreshing weather data:', error);
    res.status(500).json({ 
      error: 'Failed to refresh weather data',
      message: error.message 
    });
  }
};

const getCities = async (req, res) => {
  try {
    const cities = weatherService.getCityList();
    res.status(200).json({ cities });
  } catch (error) {
    console.error('Error getting cities:', error);
    res.status(500).json({ 
      error: 'Failed to get cities',
      message: error.message 
    });
  }
};

module.exports = {
  getWeather,
  refreshWeather,
  getCities
};