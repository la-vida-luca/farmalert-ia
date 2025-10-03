const cron = require('node-cron');
const axios = require('axios');
const { all, run, get } = require('../utils/database');
const { sendWeatherAlertNotification } = require('../routes/notifications');
const logger = require('../utils/logger');

class WeatherScheduler {
  constructor() {
    this.isRunning = false;
    this.weatherApiKey = process.env.WEATHER_API_KEY;
    this.baseUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
  }

  // Démarrer le scheduler
  start() {
    if (this.isRunning) {
      logger.warn('Le scheduler météo est déjà en cours d\'exécution');
      return;
    }

    // Vérification météo toutes les heures
    cron.schedule('0 * * * *', async () => {
      await this.checkWeatherForAllFarms();
    });

    // Nettoyage des données anciennes tous les jours à 2h
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldData();
    });

    this.isRunning = true;
    logger.info('Scheduler météo démarré - Vérifications toutes les heures');
  }

  // Arrêter le scheduler
  stop() {
    this.isRunning = false;
    logger.info('Scheduler météo arrêté');
  }

  // Vérifier la météo pour toutes les fermes actives
  async checkWeatherForAllFarms() {
    try {
      logger.info('Début de la vérification météo automatique');

      const farms = await all(
        'SELECT id, name, latitude, longitude, user_id FROM farms WHERE is_active = 1'
      );

      if (farms.length === 0) {
        logger.info('Aucune ferme active trouvée');
        return;
      }

      logger.info(`${farms.length} ferme(s) à vérifier`);

      for (const farm of farms) {
        try {
          await this.checkWeatherForFarm(farm);
          // Pause entre les requêtes pour éviter de surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error(`Erreur lors de la vérification météo pour la ferme ${farm.id}:`, error);
        }
      }

      logger.info('Vérification météo automatique terminée');

    } catch (error) {
      logger.error('Erreur lors de la vérification météo automatique:', error);
    }
  }

  // Vérifier la météo pour une ferme spécifique
  async checkWeatherForFarm(farm) {
    try {
      // Récupérer les données météo actuelles
      const currentWeather = await this.getCurrentWeather(farm.latitude, farm.longitude);
      const forecast = await this.getForecast(farm.latitude, farm.longitude);

      // Analyser les risques
      const risks = this.analyzeWeatherRisks(currentWeather, forecast);

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

      // Créer des alertes pour les risques détectés
      for (const risk of risks) {
        await this.createWeatherAlert(farm, risk, currentWeather);
      }

    } catch (error) {
      logger.error(`Erreur lors de la vérification météo pour la ferme ${farm.id}:`, error);
      throw error;
    }
  }

  // Récupérer les données météo actuelles
  async getCurrentWeather(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.weatherApiKey,
          units: 'metric',
          lang: 'fr'
        },
        timeout: 5000
      });

      return {
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
    } catch (error) {
      logger.error('Erreur API météo actuelle:', error);
      throw new Error('Impossible de récupérer les données météo');
    }
  }

  // Récupérer les prévisions météo
  async getForecast(lat, lon) {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.weatherApiKey,
          units: 'metric',
          lang: 'fr'
        },
        timeout: 5000
      });

      return response.data.list.map(item => ({
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
        crops: ['vignes', 'légumes', 'fruits'],
        estimatedSavings: minTemp < -2 ? 500 : minTemp < 0 ? 300 : 150
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
        crops: ['céréales', 'légumes', 'arbres fruitiers'],
        estimatedSavings: avgHumidity < 30 ? 400 : 200
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
        crops: ['pommes de terre', 'tomates', 'vignes'],
        estimatedSavings: 250
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
        crops: ['céréales', 'légumes'],
        estimatedSavings: totalPrecipitation > 50 ? 350 : 200
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
        crops: ['maïs', 'tournesol', 'arbres fruitiers'],
        estimatedSavings: maxWindSpeed > 25 ? 300 : 150
      });
    }

    return risks;
  }

  // Créer une alerte météo
  async createWeatherAlert(farm, risk, weatherData) {
    try {
      // Vérifier si une alerte similaire existe déjà dans les dernières 6 heures
      const existingAlert = await get(
        `SELECT id FROM alerts 
         WHERE farm_id = ? AND type = ? AND severity = ?
         AND created_at >= datetime('now', '-6 hours')
         AND is_active = 1`,
        [farm.id, risk.type, risk.severity]
      );

      if (existingAlert) {
        logger.info(`Alerte ${risk.type} déjà existante pour la ferme ${farm.id}`);
        return;
      }

      // Créer l'alerte
      const result = await run(
        `INSERT INTO alerts (
          farm_id, type, severity, title, message, 
          weather_data, coordinates, estimated_savings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          farm.id,
          risk.type,
          risk.severity,
          `Alerte ${this.getRiskTypeLabel(risk.type)}`,
          risk.message,
          JSON.stringify(weatherData),
          JSON.stringify({ latitude: farm.latitude, longitude: farm.longitude }),
          risk.estimatedSavings || 0
        ]
      );

      logger.info(`Alerte météo créée: ${risk.type} (ID: ${result.id}) pour la ferme ${farm.name}`);

      // Envoyer une notification push
      await sendWeatherAlertNotification(farm.user_id, {
        id: result.id,
        type: risk.type,
        severity: risk.severity,
        title: `Alerte ${this.getRiskTypeLabel(risk.type)}`,
        message: risk.message
      });

    } catch (error) {
      logger.error('Erreur lors de la création de l\'alerte météo:', error);
    }
  }

  // Obtenir le libellé du type de risque
  getRiskTypeLabel(type) {
    const labels = {
      frost: 'Gelée',
      drought: 'Sécheresse',
      disease_risk: 'Risque de maladie',
      heavy_rain: 'Pluie excessive',
      wind: 'Vent fort',
      hail: 'Grêle',
      pest_risk: 'Risque de ravageurs'
    };
    return labels[type] || type;
  }

  // Nettoyer les données anciennes
  async cleanupOldData() {
    try {
      logger.info('Début du nettoyage des données anciennes');

      // Supprimer les données météo de plus de 30 jours
      const weatherResult = await run(
        'DELETE FROM weather_data WHERE created_at < datetime("now", "-30 days")'
      );

      // Supprimer les alertes lues de plus de 7 jours
      const alertsResult = await run(
        'DELETE FROM alerts WHERE is_read = 1 AND created_at < datetime("now", "-7 days")'
      );

      // Supprimer les sessions expirées
      const sessionsResult = await run(
        'DELETE FROM user_sessions WHERE expires_at < datetime("now")'
      );

      logger.info(`Nettoyage terminé: ${weatherResult.changes} données météo, ${alertsResult.changes} alertes, ${sessionsResult.changes} sessions supprimées`);

    } catch (error) {
      logger.error('Erreur lors du nettoyage des données anciennes:', error);
    }
  }

  // Vérification manuelle pour une ferme spécifique
  async checkWeatherForFarmId(farmId) {
    try {
      const farm = await get(
        'SELECT id, name, latitude, longitude, user_id FROM farms WHERE id = ? AND is_active = 1',
        [farmId]
      );

      if (!farm) {
        throw new Error('Ferme non trouvée');
      }

      await this.checkWeatherForFarm(farm);
      return { success: true, message: 'Vérification météo effectuée avec succès' };

    } catch (error) {
      logger.error(`Erreur lors de la vérification météo manuelle pour la ferme ${farmId}:`, error);
      throw error;
    }
  }
}

// Instance singleton
const weatherScheduler = new WeatherScheduler();

// Fonction pour démarrer le scheduler
function startWeatherScheduler() {
  weatherScheduler.start();
}

// Fonction pour arrêter le scheduler
function stopWeatherScheduler() {
  weatherScheduler.stop();
}

// Fonction pour vérification manuelle
async function checkWeatherForFarm(farmId) {
  return await weatherScheduler.checkWeatherForFarmId(farmId);
}

module.exports = {
  startWeatherScheduler,
  stopWeatherScheduler,
  checkWeatherForFarm,
  weatherScheduler
};