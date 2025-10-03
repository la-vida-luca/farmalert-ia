import bcrypt from 'bcryptjs';
import { initDatabase } from '../config/database';
import { WeatherService } from '../services/weatherService';
import { AlertsEngine } from '../services/alertsEngine';
import logger from '../utils/logger';

async function createDemoData() {
  const db = require('../config/database').db;

  try {
    // Vérifier si des données existent déjà
    const userCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    }) as number;

    if (userCount > 0) {
      logger.info('Des données existent déjà dans la base de données');
      return;
    }

    logger.info('Création des données de démonstration...');

    // Créer les utilisateurs de démonstration
    const adminPassword = await bcrypt.hash('admin123', 12);
    const farmerPassword = await bcrypt.hash('farmer123', 12);

    // Utilisateur admin
    const adminId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, password, firstName, lastName, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin@farmalert.fr', adminPassword, 'Admin', 'FarmAlert', '+33 1 23 45 67 89', 'admin'],
        function(err: any) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }) as number;

    // Utilisateur fermier
    const farmerId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, password, firstName, lastName, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['fermier@normandie.fr', farmerPassword, 'Jean', 'Dupont', '+33 2 31 45 67 89', 'farmer'],
        function(err: any) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }) as number;

    logger.info('Utilisateurs de démonstration créés');

    // Créer les fermes de démonstration
    const farms = [
      {
        userId: farmerId,
        name: 'Ferme Bio Caen',
        description: 'Exploitation agricole biologique spécialisée dans les légumes et céréales',
        latitude: 49.1829,
        longitude: -0.3707,
        address: '123 Route de la Ferme',
        city: 'Caen',
        postalCode: '14000',
        region: 'Normandie',
        farmType: 'organic',
        size: 45.5
      },
      {
        userId: farmerId,
        name: 'Ferme Laitière Bayeux',
        description: 'Élevage laitier avec 120 vaches laitières',
        latitude: 49.2764,
        longitude: -0.7024,
        address: '456 Chemin des Vaches',
        city: 'Bayeux',
        postalCode: '14400',
        region: 'Normandie',
        farmType: 'dairy',
        size: 78.2
      },
      {
        userId: adminId,
        name: 'Exploitation Céréales Lisieux',
        description: 'Culture de céréales et oléagineux sur 120 hectares',
        latitude: 49.1439,
        longitude: 0.2300,
        address: '789 Avenue des Champs',
        city: 'Lisieux',
        postalCode: '14100',
        region: 'Normandie',
        farmType: 'cereals',
        size: 120.0
      }
    ];

    const farmIds: number[] = [];

    for (const farm of farms) {
      const farmId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO farms (userId, name, description, latitude, longitude, address, city, postalCode, region, farmType, size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            farm.userId, farm.name, farm.description, farm.latitude, farm.longitude,
            farm.address, farm.city, farm.postalCode, farm.region, farm.farmType, farm.size
          ],
          function(err: any) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      }) as number;

      farmIds.push(farmId);
      logger.info(`Ferme créée: ${farm.name} (ID: ${farmId})`);
    }

    // Récupérer les données météo actuelles pour chaque ferme
    logger.info('Récupération des données météo actuelles...');
    
    for (let i = 0; i < farms.length; i++) {
      try {
        const weatherData = await WeatherService.getCurrentWeather(farms[i].latitude, farms[i].longitude);
        await WeatherService.saveWeatherData(farmIds[i], weatherData);
        logger.info(`Données météo sauvegardées pour ${farms[i].name}`);
      } catch (error) {
        logger.error(`Erreur lors de la récupération des données météo pour ${farms[i].name}:`, error);
      }
    }

    // Créer des alertes de démonstration
    const demoAlerts = [
      {
        farmId: farmIds[0],
        userId: farmerId,
        type: 'frost',
        severity: 'high',
        title: 'Risque de gelée',
        description: 'Température très basse détectée: -1.2°C',
        recommendation: 'Protégez vos cultures sensibles au gel. Utilisez des voiles d\'hivernage ou des systèmes de chauffage si disponibles.',
        triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Il y a 2 heures
      },
      {
        farmId: farmIds[1],
        userId: farmerId,
        type: 'drought',
        severity: 'medium',
        title: 'Risque de sécheresse',
        description: 'Humidité faible (35%) et température élevée (28°C)',
        recommendation: 'Augmentez l\'irrigation si possible. Surveillez l\'état de vos cultures et ajustez les apports d\'eau.',
        triggeredAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // Il y a 4 heures
      },
      {
        farmId: farmIds[2],
        userId: adminId,
        type: 'strong_wind',
        severity: 'medium',
        title: 'Vents forts',
        description: 'Vitesse du vent élevée: 18.5 m/s',
        recommendation: 'Sécurisez les équipements et structures. Évitez les travaux en hauteur. Surveillez les cultures sensibles au vent.',
        triggeredAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // Il y a 6 heures
      },
      {
        farmId: farmIds[0],
        userId: farmerId,
        type: 'fungal_disease',
        severity: 'medium',
        title: 'Risque de maladies fongiques',
        description: 'Conditions favorables aux champignons: 18°C et 88% d\'humidité',
        recommendation: 'Surveillez vos cultures pour détecter les premiers signes de maladies fongiques. Considérez un traitement préventif si nécessaire.',
        triggeredAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() // Il y a 8 heures
      },
      {
        farmId: farmIds[1],
        userId: farmerId,
        type: 'excessive_rain',
        severity: 'high',
        title: 'Pluie excessive',
        description: 'Précipitations importantes: 25.3mm',
        recommendation: 'Vérifiez le drainage de vos parcelles. Surveillez les risques d\'inondation et d\'érosion.',
        triggeredAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // Il y a 12 heures
      }
    ];

    for (const alert of demoAlerts) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO alerts (farmId, userId, type, severity, title, description, recommendation, isActive, triggeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            alert.farmId, alert.userId, alert.type, alert.severity, alert.title,
            alert.description, alert.recommendation, 1, alert.triggeredAt
          ],
          function(err: any) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }

    logger.info('Alertes de démonstration créées');

    // Créer quelques données météo historiques
    logger.info('Création de données météo historiques...');
    
    for (let i = 0; i < farmIds.length; i++) {
      const farmId = farmIds[i];
      const farm = farms[i];
      
      // Créer 24 heures de données historiques (une par heure)
      for (let j = 1; j <= 24; j++) {
        const timestamp = new Date(Date.now() - j * 60 * 60 * 1000).toISOString();
        
        // Générer des données météo réalistes avec variation
        const baseTemp = 15 + Math.sin(j / 24 * Math.PI * 2) * 10; // Variation diurne
        const temperature = baseTemp + (Math.random() - 0.5) * 4; // Variation aléatoire
        const humidity = 60 + Math.sin(j / 24 * Math.PI * 2) * 20 + (Math.random() - 0.5) * 10;
        const windSpeed = 5 + Math.random() * 10;
        const precipitation = Math.random() > 0.8 ? Math.random() * 5 : 0; // 20% de chance de pluie
        
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO weather_data (farmId, temperature, humidity, pressure, windSpeed, windDirection, precipitation, cloudiness, visibility, uvIndex, timestamp, weatherCondition, weatherDescription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              farmId, temperature, humidity, 1013 + (Math.random() - 0.5) * 20,
              windSpeed, Math.random() * 360, precipitation, Math.random() * 100,
              10 + Math.random() * 5, Math.random() * 8, timestamp,
              precipitation > 0 ? 'Rain' : 'Clear', 
              precipitation > 0 ? 'Pluie légère' : 'Ciel dégagé'
            ],
            function(err: any) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
      }
    }

    logger.info('Données météo historiques créées');

    logger.info('✅ Données de démonstration créées avec succès!');
    logger.info('👤 Utilisateurs créés:');
    logger.info('   - admin@farmalert.fr / admin123 (Admin)');
    logger.info('   - fermier@normandie.fr / farmer123 (Agriculteur)');
    logger.info('🏡 Fermes créées: 3 fermes en Normandie');
    logger.info('🌤️ Données météo: Données actuelles + 24h d\'historique');
    logger.info('🚨 Alertes: 5 alertes de démonstration');

  } catch (error) {
    logger.error('Erreur lors de la création des données de démonstration:', error);
    throw error;
  }
}

// Exécuter l'initialisation si ce script est appelé directement
if (require.main === module) {
  initDatabase()
    .then(() => createDemoData())
    .then(() => {
      logger.info('Initialisation terminée');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erreur lors de l\'initialisation:', error);
      process.exit(1);
    });
}

export { createDemoData };