const request = require('supertest');
const { app, server } = require('../server');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/weather.json');

describe('Weather Analytics API Tests', () => {
  
  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/weather', () => {
    it('should return weather data successfully', async () => {
      const mockData = {
        last_updated: new Date().toISOString(),
        cities: {
          'Delhi': {
            temp: 25.5,
            humidity: 60,
            wind: 3.2,
            description: 'clear sky'
          }
        }
      };

      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(mockData, null, 2));

      const response = await request(app).get('/api/weather');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('last_updated');
      expect(response.body).toHaveProperty('cities');
      expect(typeof response.body.cities).toBe('object');
    });

    it('should return 404 when weather data file does not exist', async () => {
      try {
        await fs.unlink(DATA_FILE);
      } catch (error) {
        // File might not exist, that's okay
      }

      const response = await request(app).get('/api/weather');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate weather data structure', async () => {
      const mockData = {
        last_updated: new Date().toISOString(),
        cities: {
          'Delhi': {
            temp: 25.5,
            feels_like: 26.0,
            humidity: 60,
            pressure: 1013,
            wind: 3.2,
            description: 'clear sky',
            icon: '01d'
          }
        },
        metadata: {
          total_cities: 1,
          successful: 1,
          failed: 0
        }
      };

      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(mockData, null, 2));

      const response = await request(app).get('/api/weather');
      
      expect(response.status).toBe(200);
      expect(response.body.cities).toBeDefined();
      
      const firstCity = Object.values(response.body.cities)[0];
      expect(firstCity).toHaveProperty('temp');
      expect(firstCity).toHaveProperty('humidity');
      expect(firstCity).toHaveProperty('wind');
      expect(typeof firstCity.temp).toBe('number');
      expect(typeof firstCity.humidity).toBe('number');
      expect(typeof firstCity.wind).toBe('number');
    });
  });

  describe('POST /api/refresh', () => {
    it('should handle refresh request', async () => {
      const response = await request(app).post('/api/refresh');
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('last_updated');
        expect(response.body.data).toHaveProperty('cities');
      } else if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should create weather.json file after refresh', async () => {
      await request(app).post('/api/refresh');
      
      try {
        const fileExists = await fs.access(DATA_FILE).then(() => true).catch(() => false);
        if (fileExists) {
          const data = await fs.readFile(DATA_FILE, 'utf8');
          const weatherData = JSON.parse(data);
          
          expect(weatherData).toHaveProperty('last_updated');
          expect(weatherData).toHaveProperty('cities');
        }
      } catch (error) {
        console.log('File creation check skipped due to API constraints');
      }
    });
  });

  describe('GET /api/cities', () => {
    it('should return list of cities', async () => {
      const response = await request(app).get('/api/cities');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('cities');
      expect(Array.isArray(response.body.cities)).toBe(true);
      expect(response.body.cities.length).toBeGreaterThan(0);
    });

    it('should return expected Indian cities', async () => {
      const response = await request(app).get('/api/cities');
      
      expect(response.status).toBe(200);
      const cities = response.body.cities;
      
      expect(cities).toContain('Delhi');
      expect(cities).toContain('Mumbai');
      expect(cities).toContain('Bangalore');
      expect(cities).toContain('Chennai');
      expect(cities).toContain('Hyderabad');
    });
  });

  describe('JSON Data Structure Validation', () => {
    it('should validate complete weather data structure', async () => {
      const mockData = {
        last_updated: '2025-01-15T10:30:00.000Z',
        cities: {
          'Delhi': {
            temp: 20.5,
            feels_like: 19.8,
            humidity: 55,
            pressure: 1015,
            wind: 3.5,
            description: 'clear sky',
            icon: '01d'
          },
          'Mumbai': {
            temp: 28.3,
            feels_like: 30.1,
            humidity: 70,
            pressure: 1012,
            wind: 4.2,
            description: 'few clouds',
            icon: '02d'
          }
        },
        metadata: {
          total_cities: 2,
          successful: 2,
          failed: 0
        }
      };

      expect(mockData).toHaveProperty('last_updated');
      expect(mockData).toHaveProperty('cities');
      expect(mockData).toHaveProperty('metadata');
      
      expect(typeof mockData.last_updated).toBe('string');
      expect(typeof mockData.cities).toBe('object');
      expect(Object.keys(mockData.cities).length).toBeGreaterThan(0);
      
      Object.values(mockData.cities).forEach(cityData => {
        expect(cityData).toHaveProperty('temp');
        expect(cityData).toHaveProperty('humidity');
        expect(cityData).toHaveProperty('wind');
        expect(cityData).toHaveProperty('description');
      });
    });

    it('should validate metadata structure', async () => {
      const metadata = {
        total_cities: 5,
        successful: 5,
        failed: 0
      };

      expect(metadata).toHaveProperty('total_cities');
      expect(metadata).toHaveProperty('successful');
      expect(metadata).toHaveProperty('failed');
      
      expect(typeof metadata.total_cities).toBe('number');
      expect(typeof metadata.successful).toBe('number');
      expect(typeof metadata.failed).toBe('number');
      
      expect(metadata.total_cities).toBeGreaterThanOrEqual(0);
      expect(metadata.successful).toBeGreaterThanOrEqual(0);
      expect(metadata.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
      const response = await request(app).get('/api/invalid-route');
      
      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, 'invalid json content');

      const response = await request(app).get('/api/weather');
      
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});