import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { validateParams, idParamSchema } from '../middleware/validation';
import { AlertsEngine } from '../services/alertsEngine';
import logger from '../utils/logger';

const router = Router();

// Obtenir toutes les alertes de l'utilisateur
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const alerts = await AlertsEngine.getUserAlerts(userId, limit);
    res.json({ alerts });
  } catch (error) {
    logger.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les alertes actives
router.get('/active', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const db = require('../config/database').db;
    const sql = `
      SELECT a.*, f.name as farmName 
      FROM alerts a
      JOIN farms f ON a.farmId = f.id
      WHERE a.userId = ? AND a.isActive = 1
      ORDER BY a.triggeredAt DESC
    `;

    db.all(sql, [userId], (err: any, alerts: any[]) => {
      if (err) {
        logger.error('Erreur lors de la récupération des alertes actives:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      res.json({ alerts });
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des alertes actives:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les alertes par ferme
router.get('/farm/:farmId', authenticateToken, validateParams(require('../middleware/validation').farmIdParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const farmId = req.params.farmId;

    // Vérifier que la ferme appartient à l'utilisateur
    const db = require('../config/database').db;
    db.get('SELECT id FROM farms WHERE id = ? AND userId = ?', [farmId, userId], (err: any, farm: any) => {
      if (err) {
        logger.error('Erreur lors de la vérification de la ferme:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!farm) {
        return res.status(404).json({ error: 'Ferme non trouvée' });
      }

      const sql = `
        SELECT a.*, f.name as farmName 
        FROM alerts a
        JOIN farms f ON a.farmId = f.id
        WHERE a.farmId = ? AND a.userId = ?
        ORDER BY a.triggeredAt DESC
      `;

      db.all(sql, [farmId, userId], (err: any, alerts: any[]) => {
        if (err) {
          logger.error('Erreur lors de la récupération des alertes de la ferme:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ alerts });
      });
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des alertes de la ferme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir une alerte spécifique
router.get('/:id', authenticateToken, validateParams(idParamSchema), (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const alertId = req.params.id;

  const db = require('../config/database').db;
  const sql = `
    SELECT a.*, f.name as farmName 
    FROM alerts a
    JOIN farms f ON a.farmId = f.id
    WHERE a.id = ? AND a.userId = ?
  `;

  db.get(sql, [alertId, userId], (err: any, alert: any) => {
    if (err) {
      logger.error('Erreur lors de la récupération de l\'alerte:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!alert) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    res.json({ alert });
  });
});

// Marquer une alerte comme lue
router.put('/:id/acknowledge', authenticateToken, validateParams(idParamSchema), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const alertId = req.params.id;

    const success = await AlertsEngine.acknowledgeAlert(alertId, userId);

    if (!success) {
      return res.status(404).json({ error: 'Alerte non trouvée' });
    }

    logger.info(`Alerte ${alertId} marquée comme lue par l'utilisateur ${userId}`);
    res.json({ message: 'Alerte marquée comme lue' });
  } catch (error) {
    logger.error('Erreur lors de la reconnaissance de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques des alertes
router.get('/stats/summary', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  const db = require('../config/database').db;
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN type = 'frost' THEN 1 ELSE 0 END) as frost,
      SUM(CASE WHEN type = 'drought' THEN 1 ELSE 0 END) as drought,
      SUM(CASE WHEN type = 'fungal_disease' THEN 1 ELSE 0 END) as fungal_disease,
      SUM(CASE WHEN type = 'excessive_rain' THEN 1 ELSE 0 END) as excessive_rain,
      SUM(CASE WHEN type = 'strong_wind' THEN 1 ELSE 0 END) as strong_wind,
      SUM(CASE WHEN type = 'heat_wave' THEN 1 ELSE 0 END) as heat_wave
    FROM alerts 
    WHERE userId = ?
  `;

  db.get(sql, [userId], (err: any, stats: any) => {
    if (err) {
      logger.error('Erreur lors de la récupération des statistiques:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({ stats });
  });
});

// Obtenir les alertes par type
router.get('/type/:type', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const alertType = req.params.type;

  const validTypes = ['frost', 'drought', 'fungal_disease', 'excessive_rain', 'strong_wind', 'heat_wave'];
  if (!validTypes.includes(alertType)) {
    return res.status(400).json({ error: 'Type d\'alerte invalide' });
  }

  const db = require('../config/database').db;
  const sql = `
    SELECT a.*, f.name as farmName 
    FROM alerts a
    JOIN farms f ON a.farmId = f.id
    WHERE a.userId = ? AND a.type = ?
    ORDER BY a.triggeredAt DESC
  `;

  db.all(sql, [userId, alertType], (err: any, alerts: any[]) => {
    if (err) {
      logger.error('Erreur lors de la récupération des alertes par type:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({ alerts });
  });
});

// Obtenir les alertes par gravité
router.get('/severity/:severity', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const severity = req.params.severity;

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(severity)) {
    return res.status(400).json({ error: 'Niveau de gravité invalide' });
  }

  const db = require('../config/database').db;
  const sql = `
    SELECT a.*, f.name as farmName 
    FROM alerts a
    JOIN farms f ON a.farmId = f.id
    WHERE a.userId = ? AND a.severity = ?
    ORDER BY a.triggeredAt DESC
  `;

  db.all(sql, [userId, severity], (err: any, alerts: any[]) => {
    if (err) {
      logger.error('Erreur lors de la récupération des alertes par gravité:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({ alerts });
  });
});

export default router;