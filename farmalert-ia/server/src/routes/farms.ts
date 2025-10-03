import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { validate, validateParams, createFarmSchema, updateFarmSchema, idParamSchema } from '../middleware/validation';
import { WeatherService } from '../services/weatherService';
import { AlertsEngine } from '../services/alertsEngine';
import logger from '../utils/logger';

const router = Router();

// Obtenir toutes les fermes de l'utilisateur
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const sql = 'SELECT * FROM farms WHERE userId = ? ORDER BY createdAt DESC';
  
  require('sqlite3').Database.prototype.all.call(
    require('../config/database').db,
    sql,
    [userId],
    (err: any, farms: any[]) => {
      if (err) {
        logger.error('Erreur lors de la récupération des fermes:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      res.json({ farms });
    }
  );
});

// Obtenir une ferme spécifique
router.get('/:id', authenticateToken, validateParams(idParamSchema), (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const farmId = req.params.id;

  const sql = 'SELECT * FROM farms WHERE id = ? AND userId = ?';
  
  require('sqlite3').Database.prototype.get.call(
    require('../config/database').db,
    sql,
    [farmId, userId],
    (err: any, farm: any) => {
      if (err) {
        logger.error('Erreur lors de la récupération de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!farm) {
        return res.status(404).json({ error: 'Ferme non trouvée' });
      }

      res.json({ farm });
    }
  );
});

// Créer une nouvelle ferme
router.post('/', authenticateToken, validate(createFarmSchema), (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, description, latitude, longitude, address, city, postalCode, region, farmType, size } = req.body;

  const sql = `
    INSERT INTO farms (
      userId, name, description, latitude, longitude, address, 
      city, postalCode, region, farmType, size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  require('sqlite3').Database.prototype.run.call(
    require('../config/database').db,
    sql,
    [userId, name, description || null, latitude, longitude, address, city, postalCode, region, farmType, size],
    function(err: any) {
      if (err) {
        logger.error('Erreur lors de la création de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      logger.info(`Nouvelle ferme créée: ${name} pour l'utilisateur ${userId}`);
      res.status(201).json({
        message: 'Ferme créée avec succès',
        farm: {
          id: this.lastID,
          userId,
          name,
          description,
          latitude,
          longitude,
          address,
          city,
          postalCode,
          region,
          farmType,
          size
        }
      });
    }
  );
});

// Mettre à jour une ferme
router.put('/:id', authenticateToken, validateParams(idParamSchema), validate(updateFarmSchema), (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const farmId = req.params.id;
  const updates = req.body;

  // Construire la requête SQL dynamiquement
  const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'userId');
  if (fields.length === 0) {
    return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
  }

  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => updates[field]);
  values.push(farmId, userId);

  const sql = `UPDATE farms SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?`;

  require('sqlite3').Database.prototype.run.call(
    require('../config/database').db,
    sql,
    values,
    function(err: any) {
      if (err) {
        logger.error('Erreur lors de la mise à jour de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Ferme non trouvée' });
      }

      logger.info(`Ferme ${farmId} mise à jour par l'utilisateur ${userId}`);
      res.json({ message: 'Ferme mise à jour avec succès' });
    }
  );
});

// Supprimer une ferme
router.delete('/:id', authenticateToken, validateParams(idParamSchema), (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const farmId = req.params.id;

  const sql = 'DELETE FROM farms WHERE id = ? AND userId = ?';

  require('sqlite3').Database.prototype.run.call(
    require('../config/database').db,
    sql,
    [farmId, userId],
    function(err: any) {
      if (err) {
        logger.error('Erreur lors de la suppression de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Ferme non trouvée' });
      }

      logger.info(`Ferme ${farmId} supprimée par l'utilisateur ${userId}`);
      res.json({ message: 'Ferme supprimée avec succès' });
    }
  );
});

// Obtenir les données météo d'une ferme
router.get('/:id/weather', authenticateToken, validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const farmId = req.params.id;

    // Vérifier que la ferme appartient à l'utilisateur
    const db = require('../config/database').db;
    db.get('SELECT * FROM farms WHERE id = ? AND userId = ?', [farmId, userId], async (err: any, farm: any) => {
      if (err) {
        logger.error('Erreur lors de la vérification de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!farm) {
        return res.status(404).json({ error: 'Ferme non trouvée' });
      }

      try {
        // Récupérer les données météo actuelles
        const currentWeather = await WeatherService.getCurrentWeather(farm.latitude, farm.longitude);
        
        // Sauvegarder les données météo
        await WeatherService.saveWeatherData(farmId, currentWeather);

        // Récupérer l'historique météo
        const weatherHistory = await WeatherService.getWeatherHistory(farmId, 24);

        res.json({
          current: currentWeather,
          history: weatherHistory
        });
      } catch (error) {
        logger.error('Erreur lors de la récupération des données météo:', error);
        res.status(500).json({ error: 'Impossible de récupérer les données météo' });
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des données météo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les prévisions météo d'une ferme
router.get('/:id/forecast', authenticateToken, validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const farmId = req.params.id;

    // Vérifier que la ferme appartient à l'utilisateur
    const db = require('../config/database').db;
    db.get('SELECT * FROM farms WHERE id = ? AND userId = ?', [farmId, userId], async (err: any, farm: any) => {
      if (err) {
        logger.error('Erreur lors de la vérification de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!farm) {
        return res.status(404).json({ error: 'Ferme non trouvée' });
      }

      try {
        const forecast = await WeatherService.getWeatherForecast(farm.latitude, farm.longitude);
        res.json({ forecast });
      } catch (error) {
        logger.error('Erreur lors de la récupération des prévisions:', error);
        res.status(500).json({ error: 'Impossible de récupérer les prévisions météo' });
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des prévisions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Vérifier les alertes pour une ferme
router.post('/:id/check-alerts', authenticateToken, validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const farmId = req.params.id;

    // Vérifier que la ferme appartient à l'utilisateur
    const db = require('../config/database').db;
    db.get('SELECT * FROM farms WHERE id = ? AND userId = ?', [farmId, userId], async (err: any, farm: any) => {
      if (err) {
        logger.error('Erreur lors de la vérification de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!farm) {
        return res.status(404).json({ error: 'Ferme non trouvée' });
      }

      try {
        // Récupérer les données météo actuelles
        const currentWeather = await WeatherService.getCurrentWeather(farm.latitude, farm.longitude);
        await WeatherService.saveWeatherData(farmId, currentWeather);

        // Vérifier les alertes
        const newAlerts = await AlertsEngine.checkAlerts(farmId, userId);

        res.json({
          message: 'Vérification des alertes terminée',
          newAlerts,
          weatherData: currentWeather
        });
      } catch (error) {
        logger.error('Erreur lors de la vérification des alertes:', error);
        res.status(500).json({ error: 'Impossible de vérifier les alertes' });
      }
    });
  } catch (error) {
    logger.error('Erreur lors de la vérification des alertes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;