import { WeatherData, Alert, AlertRule } from '../types';
import { db } from '../config/database';
import logger from '../utils/logger';

export class AlertsEngine {
  private static alertRules: AlertRule[] = [
    {
      type: 'frost',
      condition: (weather) => weather.temperature < 2,
      severity: 'high',
      title: 'Risque de gelée',
      description: 'Température très basse détectée',
      recommendation: 'Protégez vos cultures sensibles au gel. Utilisez des voiles d\'hivernage ou des systèmes de chauffage si disponibles.'
    },
    {
      type: 'drought',
      condition: (weather) => weather.humidity < 40 && weather.temperature > 25,
      severity: 'medium',
      title: 'Risque de sécheresse',
      description: 'Humidité faible et température élevée',
      recommendation: 'Augmentez l\'irrigation si possible. Surveillez l\'état de vos cultures et ajustez les apports d\'eau.'
    },
    {
      type: 'fungal_disease',
      condition: (weather) => weather.temperature >= 15 && weather.temperature <= 25 && weather.humidity > 85,
      severity: 'medium',
      title: 'Risque de maladies fongiques',
      description: 'Conditions favorables aux champignons',
      recommendation: 'Surveillez vos cultures pour détecter les premiers signes de maladies fongiques. Considérez un traitement préventif si nécessaire.'
    },
    {
      type: 'excessive_rain',
      condition: (weather) => weather.precipitation > 20,
      severity: 'high',
      title: 'Pluie excessive',
      description: 'Précipitations importantes',
      recommendation: 'Vérifiez le drainage de vos parcelles. Surveillez les risques d\'inondation et d\'érosion.'
    },
    {
      type: 'strong_wind',
      condition: (weather) => weather.windSpeed > 15,
      severity: 'medium',
      title: 'Vents forts',
      description: 'Vitesse du vent élevée',
      recommendation: 'Sécurisez les équipements et structures. Évitez les travaux en hauteur. Surveillez les cultures sensibles au vent.'
    },
    {
      type: 'heat_wave',
      condition: (weather) => weather.temperature > 35,
      severity: 'critical',
      title: 'Vague de chaleur',
      description: 'Température très élevée',
      recommendation: 'Augmentez l\'irrigation pour éviter le stress hydrique. Protégez les animaux de la chaleur excessive.'
    }
  ];

  static async checkAlerts(farmId: number, userId: number): Promise<Alert[]> {
    try {
      // Récupérer les dernières données météo pour la ferme
      const weatherData = await this.getLatestWeatherData(farmId);
      if (!weatherData) {
        return [];
      }

      const newAlerts: Alert[] = [];

      // Vérifier chaque règle d'alerte
      for (const rule of this.alertRules) {
        if (rule.condition(weatherData)) {
          // Vérifier si une alerte de ce type existe déjà et est active
          const existingAlert = await this.getActiveAlert(farmId, rule.type);
          
          if (!existingAlert) {
            const alert = await this.createAlert(farmId, userId, rule, weatherData);
            newAlerts.push(alert);
            logger.info(`Nouvelle alerte créée: ${rule.type} pour la ferme ${farmId}`);
          }
        }
      }

      return newAlerts;
    } catch (error) {
      logger.error('Erreur lors de la vérification des alertes:', error);
      throw error;
    }
  }

  static async getLatestWeatherData(farmId: number): Promise<WeatherData | null> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM weather_data 
        WHERE farmId = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `;

      db.get(sql, [farmId], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as WeatherData || null);
        }
      });
    });
  }

  static async getActiveAlert(farmId: number, alertType: string): Promise<Alert | null> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM alerts 
        WHERE farmId = ? AND type = ? AND isActive = 1 
        ORDER BY triggeredAt DESC 
        LIMIT 1
      `;

      db.get(sql, [farmId, alertType], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as Alert || null);
        }
      });
    });
  }

  static async createAlert(
    farmId: number, 
    userId: number, 
    rule: AlertRule, 
    weatherData: WeatherData
  ): Promise<Alert> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO alerts (
          farmId, userId, type, severity, title, description, 
          recommendation, isActive, triggeredAt, weatherDataId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `;

      const description = rule.description.replace('${weather.temperature}', weatherData.temperature.toString())
                                         .replace('${weather.humidity}', weatherData.humidity.toString())
                                         .replace('${weather.precipitation}', weatherData.precipitation.toString())
                                         .replace('${weather.windSpeed}', weatherData.windSpeed.toString());

      db.run(sql, [
        farmId,
        userId,
        rule.type,
        rule.severity,
        rule.title,
        description,
        rule.recommendation,
        new Date().toISOString(),
        weatherData.id
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          // Récupérer l'alerte créée
          db.get('SELECT * FROM alerts WHERE id = ?', [this.lastID], (err, row: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(row as Alert);
            }
          });
        }
      });
    });
  }

  static async getUserAlerts(userId: number, limit: number = 50): Promise<Alert[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT a.*, f.name as farmName 
        FROM alerts a
        JOIN farms f ON a.farmId = f.id
        WHERE a.userId = ?
        ORDER BY a.triggeredAt DESC
        LIMIT ?
      `;

      db.all(sql, [userId, limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as Alert[]);
        }
      });
    });
  }

  static async acknowledgeAlert(alertId: number, userId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE alerts 
        SET acknowledgedAt = ?, isActive = 0 
        WHERE id = ? AND userId = ?
      `;

      db.run(sql, [new Date().toISOString(), alertId, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async deactivateOldAlerts(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Désactiver les alertes de plus de 7 jours
      const sql = `
        UPDATE alerts 
        SET isActive = 0 
        WHERE triggeredAt < datetime('now', '-7 days') AND isActive = 1
      `;

      db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}