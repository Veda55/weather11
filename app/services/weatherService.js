const axios = require('axios');
require('dotenv').config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad'];

const fetchCityWeather = async (city) => {
  try {
    const response = await axios.get(OPENWEATHER_BASE_URL, {
      params: {
        q: city,
        appid: OPENWEATHER_API_KEY,
        units: 'metric'
      }
    });

    const { main, wind, weather } = response.data;

    return {
      temp: Math.round(main.temp * 10) / 10,
      feels_like: Math.round(main.feels_like * 10) / 10,
      humidity: main.humidity,
      pressure: main.pressure,

      temp_min: main.temp_min ? Math.round(main.temp_min * 10) / 10 : main.temp,
      temp_max: main.temp_max ? Math.round(main.temp_max * 10) / 10 : main.temp,

      // FRONTEND EXPECTS wind, not wind_speed
      wind: wind.speed ? Math.round(wind.speed * 10) / 10 : 0,

      description: weather[0].description,

      // FRONTEND expects only icon code like "01d"
      icon: weather[0].icon
    };

  } catch (error) {
    console.error(`Error fetching weather for ${city}:`, error.message);

    return {
      temp: null,
      feels_like: null,
      humidity: null,
      pressure: null,
      temp_min: null,
      temp_max: null,
      wind: null,
      description: "Data unavailable",
      icon: null
    };
  }
};

const fetchAllCitiesWeather = async () => {
  try {
    const promises = CITIES.map(city =>
      fetchCityWeather(city)
        .then(data => ({ city, data }))
        .catch(err => ({ city, error: err.message }))
    );

    const results = await Promise.all(promises);

    const cities = {};
    results.forEach(result => {
      cities[result.city] = result.data;
    });

    return {
      last_updated: new Date().toISOString(),
      cities,
      metadata: {
        total_cities: CITIES.length,
        successful: results.length,
        failed: 0
      }
    };

  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = {
  fetchCityWeather,
  fetchAllCitiesWeather,
  getCityList: () => CITIES
};

