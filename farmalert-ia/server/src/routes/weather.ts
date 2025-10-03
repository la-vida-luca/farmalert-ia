import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { WeatherService } from '../services/weatherService';
import logger from '../utils/logger';

const router = Router();

// Obtenir les données météo pour une localisation spécifique
router.get('/current', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude et longitude requises' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Coordonnées invalides' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Coordonnées hors limites' });
    }

    const weatherData = await WeatherService.getCurrentWeather(latitude, longitude);
    res.json({ weather: weatherData });
  } catch (error) {
    logger.error('Erreur lors de la récupération des données météo:', error);
    res.status(500).json({ error: 'Impossible de récupérer les données météo' });
  }
});

// Obtenir les prévisions météo pour une localisation spécifique
router.get('/forecast', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude et longitude requises' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Coordonnées invalides' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Coordonnées hors limites' });
    }

    const forecast = await WeatherService.getWeatherForecast(latitude, longitude);
    res.json({ forecast });
  } catch (error) {
    logger.error('Erreur lors de la récupération des prévisions météo:', error);
    res.status(500).json({ error: 'Impossible de récupérer les prévisions météo' });
  }
});

// Mettre à jour les données météo pour toutes les fermes
router.post('/update-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Accès administrateur requis' });
    }

    await WeatherService.updateWeatherForAllFarms();
    
    logger.info('Données météo mises à jour pour toutes les fermes');
    res.json({ message: 'Données météo mises à jour avec succès' });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des données météo:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des données météo' });
  }
});

// Obtenir l'historique météo pour une localisation spécifique
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lon, days = '7' } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude et longitude requises' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const daysCount = parseInt(days as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Coordonnées invalides' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Coordonnées hors limites' });
    }

    if (isNaN(daysCount) || daysCount < 1 || daysCount > 30) {
      return res.status(400).json({ error: 'Nombre de jours invalide (1-30)' });
    }

    // Pour l'historique, on utilise les données stockées dans la base
    // Si aucune ferme n'existe à cette localisation, on retourne un message
    const db = require('../config/database').db;
    
    // Chercher une ferme proche de cette localisation (dans un rayon de 10km)
    const sql = `
      SELECT id FROM farms 
      WHERE ABS(latitude - ?) < 0.1 AND ABS(longitude - ?) < 0.1
      LIMIT 1
    `;

    db.get(sql, [latitude, longitude], async (err: any, farm: any) => {
      if (err) {
        logger.error('Erreur lors de la recherche de ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!farm) {
        return res.status(404).json({ 
          error: 'Aucune ferme trouvée à cette localisation',
          message: 'L\'historique météo n\'est disponible que pour les fermes enregistrées'
        });
      }

      try {
        const history = await WeatherService.getWeatherHistory(farm.id, daysCount * 24);
        res.json({ history });
      } catch (error) {
        logger.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique météo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les conditions météo optimales pour différents types de cultures
router.get('/optimal-conditions/:cropType', authenticateToken, (req: AuthRequest, res: Response) => {
  const cropType = req.params.cropType;

  const optimalConditions: { [key: string]: any } = {
    'cereals': {
      temperature: { min: 10, max: 25, optimal: 18 },
      humidity: { min: 40, max: 80, optimal: 60 },
      precipitation: { min: 500, max: 1000, optimal: 750 }, // mm/an
      windSpeed: { max: 10 },
      description: 'Céréales (blé, orge, maïs)'
    },
    'dairy': {
      temperature: { min: 5, max: 20, optimal: 12 },
      humidity: { min: 50, max: 85, optimal: 70 },
      precipitation: { min: 600, max: 1200, optimal: 900 },
      windSpeed: { max: 8 },
      description: 'Élevage laitier'
    },
    'organic': {
      temperature: { min: 8, max: 22, optimal: 15 },
      humidity: { min: 45, max: 75, optimal: 60 },
      precipitation: { min: 400, max: 800, optimal: 600 },
      windSpeed: { max: 12 },
      description: 'Agriculture biologique'
    },
    'livestock': {
      temperature: { min: 0, max: 25, optimal: 15 },
      humidity: { min: 40, max: 80, optimal: 60 },
      precipitation: { min: 500, max: 1000, optimal: 750 },
      windSpeed: { max: 15 },
      description: 'Élevage'
    },
    'vegetables': {
      temperature: { min: 12, max: 28, optimal: 20 },
      humidity: { min: 50, max: 85, optimal: 70 },
      precipitation: { min: 300, max: 600, optimal: 450 },
      windSpeed: { max: 8 },
      description: 'Légumes'
    },
    'fruits': {
      temperature: { min: 10, max: 30, optimal: 22 },
      humidity: { min: 45, max: 80, optimal: 65 },
      precipitation: { min: 400, max: 800, optimal: 600 },
      windSpeed: { max: 10 },
      description: 'Fruits'
    }
  };

  const conditions = optimalConditions[cropType];
  if (!conditions) {
    return res.status(400).json({ error: 'Type de culture non supporté' });
  }

  res.json({ 
    cropType,
    optimalConditions: conditions,
    recommendations: {
      temperature: `Température optimale entre ${conditions.temperature.min}°C et ${conditions.temperature.max}°C`,
      humidity: `Humidité optimale entre ${conditions.humidity.min}% et ${conditions.humidity.max}%`,
      precipitation: `Précipitations annuelles recommandées entre ${conditions.precipitation.min}mm et ${conditions.precipitation.max}mm`,
      windSpeed: `Vitesse du vent ne doit pas dépasser ${conditions.windSpeed.max} m/s`
    }
  });
});

export default router;