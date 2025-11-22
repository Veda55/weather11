const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');

router.get('/weather', weatherController.getWeather);
router.post('/refresh', weatherController.refreshWeather);
router.get('/cities', weatherController.getCities);

module.exports = router;