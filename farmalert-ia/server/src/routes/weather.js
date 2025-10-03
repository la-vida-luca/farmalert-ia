const express = require('express');
const axios = require('axios');
const { run, get, all } = require('../utils/database');
const { validateParams, paramSchemas } = require('../middleware/validation');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Service météo avec cache
class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.baseUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  async getCurrentWeather(lat, lon) {
    const cacheKey = `current_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'fr'
        },
        timeout: 5000
      });

      const weatherData = {
        temperature: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        visibility: response.data.visibility,
        windSpeed: response.data.wind?.speed || 0,
        windDirection: response.data.wind?.deg || 0,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        timestamp: new Date().toISOString()
      };

      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      logger.error('Erreur API météo actuelle:', error);
      throw new Error('Impossible de récupérer les données météo');
    }
  }

  async getForecast(lat, lon) {
    const cacheKey = `forecast_${lat}_${lon}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric',
          lang: 'fr'
        },
        timeout: 5000
      });

      // Traiter les données de prévision (5 jours, toutes les 3h)
      const forecastData = response.data.list.map(item => ({
        timestamp: new Date(item.dt * 1000).toISOString(),
        temperature: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        pressure: item.main.pressure,
        windSpeed: item.wind?.speed || 0,
        windDirection: item.wind?.deg || 0,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0
      }));

      this.cache.set(cacheKey, {
        data: forecastData,
        timestamp: Date.now()
      });

      return forecastData;
    } catch (error) {
      logger.error('Erreur API prévisions météo:', error);
      throw new Error('Impossible de récupérer les prévisions météo');
    }
  }

  // Analyser les risques météo pour l'agriculture
  analyzeWeatherRisks(currentWeather, forecast) {
    const risks = [];

    // Risque de gelée
    const minTemp = Math.min(currentWeather.temperature, ...forecast.slice(0, 8).map(f => f.temperature));
    if (minTemp < 2) {
      risks.push({
        type: 'frost',
        severity: minTemp < -2 ? 'critical' : minTemp < 0 ? 'high' : 'medium',
        message: `Risque de gelée détecté. Température minimale prévue: ${minTemp}°C`,
        recommendation: 'Protection des cultures sensibles recommandée',
        crops: ['vignes', 'légumes', 'fruits']
      });
    }

    // Risque de sécheresse
    const avgHumidity = forecast.slice(0, 8).reduce((sum, f) => sum + f.humidity, 0) / 8;
    if (avgHumidity < 40 && currentWeather.temperature > 25) {
      risks.push({
        type: 'drought',
        severity: avgHumidity < 30 ? 'high' : 'medium',
        message: `Conditions sèches détectées. Humidité moyenne: ${Math.round(avgHumidity)}%`,
        recommendation: 'Surveillance de l\'irrigation nécessaire',
        crops: ['céréales', 'légumes', 'arbres fruitiers']
      });
    }

    // Risque de maladie (mildiou)
    const avgTemp = forecast.slice(0, 8).reduce((sum, f) => sum + f.temperature, 0) / 8;
    if (avgTemp > 15 && avgTemp < 25 && avgHumidity > 85) {
      risks.push({
        type: 'disease_risk',
        severity: 'medium',
        message: `Conditions favorables aux maladies fongiques. Temp: ${Math.round(avgTemp)}°C, Humidité: ${Math.round(avgHumidity)}%`,
        recommendation: 'Traitement préventif recommandé',
        crops: ['pommes de terre', 'tomates', 'vignes']
      });
    }

    // Risque de pluie excessive
    const totalPrecipitation = forecast.slice(0, 8).reduce((sum, f) => sum + f.precipitation, 0);
    if (totalPrecipitation > 20) {
      risks.push({
        type: 'heavy_rain',
        severity: totalPrecipitation > 50 ? 'high' : 'medium',
        message: `Pluie importante prévue: ${Math.round(totalPrecipitation)}mm sur 24h`,
        recommendation: 'Protection contre l\'excès d\'eau nécessaire',
        crops: ['céréales', 'légumes']
      });
    }

    // Risque de vent fort
    const maxWindSpeed = Math.max(currentWeather.windSpeed, ...forecast.slice(0, 8).map(f => f.windSpeed));
    if (maxWindSpeed > 15) {
      risks.push({
        type: 'wind',
        severity: maxWindSpeed > 25 ? 'high' : 'medium',
        message: `Vent fort prévu: ${Math.round(maxWindSpeed)} m/s`,
        recommendation: 'Protection des cultures hautes recommandée',
        crops: ['maïs', 'tournesol', 'arbres fruitiers']
      });
    }

    return risks;
  }
}

const weatherService = new WeatherService();

// Récupérer les données météo pour une ferme
router.get('/farm/:farmId', authenticateToken, validateParams(paramSchemas.farmId), async (req, res) => {
  try {
    // Récupérer les coordonnées de la ferme
    const farm = await get(
      'SELECT id, name, latitude, longitude FROM farms WHERE id = ? AND user_id = ? AND is_active = 1',
      [req.params.farmId, req.user.id]
    );

    if (!farm) {
      return res.status(404).json({
        error: 'Ferme non trouvée',
        code: 'FARM_NOT_FOUND'
      });
    }

    // Récupérer les données météo
    const [currentWeather, forecast] = await Promise.all([
      weatherService.getCurrentWeather(farm.latitude, farm.longitude),
      weatherService.getForecast(farm.latitude, farm.longitude)
    ]);

    // Analyser les risques
    const risks = weatherService.analyzeWeatherRisks(currentWeather, forecast);

    // Sauvegarder les données météo
    await run(
      `INSERT INTO weather_data (farm_id, coordinates, current_weather, forecast_5d, alerts_generated)
       VALUES (?, ?, ?, ?, ?)`,
      [
        farm.id,
        JSON.stringify({ latitude: farm.latitude, longitude: farm.longitude }),
        JSON.stringify(currentWeather),
        JSON.stringify(forecast),
        JSON.stringify(risks)
      ]
    );

    res.json({
      farm: {
        id: farm.id,
        name: farm.name,
        coordinates: {
          latitude: farm.latitude,
          longitude: farm.longitude
        }
      },
      currentWeather,
      forecast: forecast.slice(0, 24), // Prochaines 24h
      risks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des données météo:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données météo',
      code: 'WEATHER_FETCH_ERROR'
    });
  }
});

// Récupérer les données météo par coordonnées (route publique avec auth optionnelle)
router.get('/coordinates/:lat/:lon', optionalAuth, async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lon = parseFloat(req.params.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Coordonnées invalides',
        code: 'INVALID_COORDINATES'
      });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        error: 'Coordonnées hors limites',
        code: 'COORDINATES_OUT_OF_BOUNDS'
      });
    }

    // Récupérer les données météo
    const [currentWeather, forecast] = await Promise.all([
      weatherService.getCurrentWeather(lat, lon),
      weatherService.getForecast(lat, lon)
    ]);

    // Analyser les risques seulement si l'utilisateur est connecté
    let risks = [];
    if (req.user) {
      risks = weatherService.analyzeWeatherRisks(currentWeather, forecast);
    }

    res.json({
      coordinates: { latitude: lat, longitude: lon },
      currentWeather,
      forecast: forecast.slice(0, 24), // Prochaines 24h
      risks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des données météo par coordonnées:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des données météo',
      code: 'WEATHER_FETCH_ERROR'
    });
  }
});

// Historique des données météo pour une ferme
router.get('/farm/:farmId/history', authenticateToken, validateParams(paramSchemas.farmId), async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    // Vérifier que la ferme appartient à l'utilisateur
    const farm = await get(
      'SELECT id FROM farms WHERE id = ? AND user_id = ? AND is_active = 1',
      [req.params.farmId, req.user.id]
    );

    if (!farm) {
      return res.status(404).json({
        error: 'Ferme non trouvée',
        code: 'FARM_NOT_FOUND'
      });
    }

    const history = await all(
      `SELECT id, current_weather, forecast_5d, alerts_generated, created_at
       FROM weather_data 
       WHERE farm_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.params.farmId, parseInt(limit), parseInt(offset)]
    );

    const formattedHistory = history.map(record => ({
      id: record.id,
      currentWeather: JSON.parse(record.current_weather),
      forecast: JSON.parse(record.forecast_5d),
      alertsGenerated: JSON.parse(record.alerts_generated),
      createdAt: record.created_at
    }));

    res.json({
      history: formattedHistory,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: formattedHistory.length
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique météo:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de l\'historique météo',
      code: 'WEATHER_HISTORY_ERROR'
    });
  }
});

// Statistiques météo pour une ferme
router.get('/farm/:farmId/stats', authenticateToken, validateParams(paramSchemas.farmId), async (req, res) => {
  try {
    const { period = '7' } = req.query; // Période en jours

    // Vérifier que la ferme appartient à l'utilisateur
    const farm = await get(
      'SELECT id FROM farms WHERE id = ? AND user_id = ? AND is_active = 1',
      [req.params.farmId, req.user.id]
    );

    if (!farm) {
      return res.status(404).json({
        error: 'Ferme non trouvée',
        code: 'FARM_NOT_FOUND'
      });
    }

    // Récupérer les données météo de la période
    const weatherData = await all(
      `SELECT current_weather, alerts_generated, created_at
       FROM weather_data 
       WHERE farm_id = ? 
       AND created_at >= datetime('now', '-${parseInt(period)} days')
       ORDER BY created_at DESC`,
      [req.params.farmId]
    );

    if (weatherData.length === 0) {
      return res.json({
        stats: {
          period: parseInt(period),
          dataPoints: 0,
          averageTemperature: 0,
          averageHumidity: 0,
          totalPrecipitation: 0,
          riskCounts: {},
          alertsGenerated: 0
        }
      });
    }

    // Calculer les statistiques
    const temperatures = weatherData.map(d => JSON.parse(d.current_weather).temperature);
    const humidities = weatherData.map(d => JSON.parse(d.current_weather).humidity);
    const allAlerts = weatherData.flatMap(d => JSON.parse(d.alerts_generated));

    const riskCounts = allAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      stats: {
        period: parseInt(period),
        dataPoints: weatherData.length,
        averageTemperature: Math.round(temperatures.reduce((a, b) => a + b, 0) / temperatures.length * 10) / 10,
        averageHumidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
        totalPrecipitation: weatherData.reduce((sum, d) => {
          const forecast = JSON.parse(d.forecast_5d);
          return sum + forecast.slice(0, 8).reduce((s, f) => s + f.precipitation, 0);
        }, 0),
        riskCounts,
        alertsGenerated: allAlerts.length
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques météo:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques météo',
      code: 'WEATHER_STATS_ERROR'
    });
  }
});

module.exports = router;