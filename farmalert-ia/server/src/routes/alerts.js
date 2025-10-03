const express = require('express');
const { run, get, all } = require('../utils/database');
const { validate, alertSchemas, validateParams, paramSchemas } = require('../middleware/validation');
const { authenticateToken, checkFarmOwnership } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Créer une alerte personnalisée
router.post('/', authenticateToken, validate(alertSchemas.create), async (req, res) => {
  try {
    const { type, severity, title, message, farmId, estimatedSavings } = req.body;

    // Vérifier que la ferme appartient à l'utilisateur
    const farm = await get(
      'SELECT id, name, latitude, longitude FROM farms WHERE id = ? AND user_id = ? AND is_active = 1',
      [farmId, req.user.id]
    );

    if (!farm) {
      return res.status(404).json({
        error: 'Ferme non trouvée',
        code: 'FARM_NOT_FOUND'
      });
    }

    const result = await run(
      `INSERT INTO alerts (
        farm_id, type, severity, title, message, 
        coordinates, estimated_savings
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        farmId,
        type,
        severity,
        title,
        message,
        JSON.stringify({ latitude: farm.latitude, longitude: farm.longitude }),
        estimatedSavings || null
      ]
    );

    logger.info(`Alerte créée: ${title} (ID: ${result.id}) pour la ferme ${farm.name}`);

    // Récupérer l'alerte créée
    const newAlert = await get(
      `SELECT id, farm_id, type, severity, title, message, 
              coordinates, estimated_savings, is_read, created_at
       FROM alerts WHERE id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Alerte créée avec succès',
      alert: {
        ...newAlert,
        coordinates: JSON.parse(newAlert.coordinates)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la création de l\'alerte:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de l\'alerte',
      code: 'ALERT_CREATE_ERROR'
    });
  }
});

// Récupérer toutes les alertes d'une ferme
router.get('/farm/:farmId', authenticateToken, validateParams(paramSchemas.farmId), checkFarmOwnership, async (req, res) => {
  try {
    const { status = 'all', limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE farm_id = ? AND is_active = 1';
    let params = [req.farmId];

    if (status === 'unread') {
      whereClause += ' AND is_read = 0';
    } else if (status === 'read') {
      whereClause += ' AND is_read = 1';
    }

    const alerts = await all(
      `SELECT id, type, severity, title, message, coordinates, 
              estimated_savings, is_read, created_at
       FROM alerts 
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const alertsWithParsedCoords = alerts.map(alert => ({
      ...alert,
      coordinates: JSON.parse(alert.coordinates)
    }));

    // Compter le total d'alertes
    const totalCount = await get(
      `SELECT COUNT(*) as count FROM alerts ${whereClause}`,
      params
    );

    res.json({
      alerts: alertsWithParsedCoords,
      pagination: {
        total: totalCount.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: alertsWithParsedCoords.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des alertes',
      code: 'ALERTS_FETCH_ERROR'
    });
  }
});

// Récupérer toutes les alertes de l'utilisateur (toutes fermes)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status = 'all', severity, type, limit = 50, offset = 0 } = req.query;

    let whereClause = `WHERE f.user_id = ? AND a.is_active = 1`;
    let params = [req.user.id];

    if (status === 'unread') {
      whereClause += ' AND a.is_read = 0';
    } else if (status === 'read') {
      whereClause += ' AND a.is_read = 1';
    }

    if (severity) {
      whereClause += ' AND a.severity = ?';
      params.push(severity);
    }

    if (type) {
      whereClause += ' AND a.type = ?';
      params.push(type);
    }

    const alerts = await all(
      `SELECT a.id, a.type, a.severity, a.title, a.message, a.coordinates,
              a.estimated_savings, a.is_read, a.created_at,
              f.name as farm_name, f.id as farm_id
       FROM alerts a
       JOIN farms f ON a.farm_id = f.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const alertsWithParsedCoords = alerts.map(alert => ({
      ...alert,
      coordinates: JSON.parse(alert.coordinates)
    }));

    // Compter le total d'alertes
    const totalCount = await get(
      `SELECT COUNT(*) as count 
       FROM alerts a
       JOIN farms f ON a.farm_id = f.id
       ${whereClause}`,
      params
    );

    res.json({
      alerts: alertsWithParsedCoords,
      pagination: {
        total: totalCount.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: alertsWithParsedCoords.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des alertes',
      code: 'ALERTS_FETCH_ERROR'
    });
  }
});

// Marquer une alerte comme lue
router.put('/:alertId/read', authenticateToken, validateParams(paramSchemas.id), async (req, res) => {
  try {
    // Vérifier que l'alerte appartient à l'utilisateur
    const alert = await get(
      `SELECT a.id FROM alerts a
       JOIN farms f ON a.farm_id = f.id
       WHERE a.id = ? AND f.user_id = ? AND a.is_active = 1`,
      [req.params.id, req.user.id]
    );

    if (!alert) {
      return res.status(404).json({
        error: 'Alerte non trouvée',
        code: 'ALERT_NOT_FOUND'
      });
    }

    await run(
      'UPDATE alerts SET is_read = 1 WHERE id = ?',
      [req.params.id]
    );

    logger.info(`Alerte marquée comme lue: ID ${req.params.id} par ${req.user.email}`);

    res.json({
      message: 'Alerte marquée comme lue'
    });

  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'alerte:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de l\'alerte',
      code: 'ALERT_UPDATE_ERROR'
    });
  }
});

// Marquer toutes les alertes comme lues
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const { farmId } = req.body;

    let whereClause = `f.user_id = ?`;
    let params = [req.user.id];

    if (farmId) {
      // Vérifier que la ferme appartient à l'utilisateur
      const farm = await get(
        'SELECT id FROM farms WHERE id = ? AND user_id = ? AND is_active = 1',
        [farmId, req.user.id]
      );

      if (!farm) {
        return res.status(404).json({
          error: 'Ferme non trouvée',
          code: 'FARM_NOT_FOUND'
        });
      }

      whereClause += ' AND a.farm_id = ?';
      params.push(farmId);
    }

    const result = await run(
      `UPDATE alerts SET is_read = 1 
       WHERE id IN (
         SELECT a.id FROM alerts a
         JOIN farms f ON a.farm_id = f.id
         WHERE ${whereClause} AND a.is_read = 0 AND a.is_active = 1
       )`,
      params
    );

    logger.info(`${result.changes} alertes marquées comme lues par ${req.user.email}`);

    res.json({
      message: `${result.changes} alertes marquées comme lues`,
      count: result.changes
    });

  } catch (error) {
    logger.error('Erreur lors de la mise à jour des alertes:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour des alertes',
      code: 'ALERTS_UPDATE_ERROR'
    });
  }
});

// Supprimer une alerte
router.delete('/:alertId', authenticateToken, validateParams(paramSchemas.id), async (req, res) => {
  try {
    // Vérifier que l'alerte appartient à l'utilisateur
    const alert = await get(
      `SELECT a.id FROM alerts a
       JOIN farms f ON a.farm_id = f.id
       WHERE a.id = ? AND f.user_id = ? AND a.is_active = 1`,
      [req.params.id, req.user.id]
    );

    if (!alert) {
      return res.status(404).json({
        error: 'Alerte non trouvée',
        code: 'ALERT_NOT_FOUND'
      });
    }

    await run(
      'UPDATE alerts SET is_active = 0 WHERE id = ?',
      [req.params.id]
    );

    logger.info(`Alerte supprimée: ID ${req.params.id} par ${req.user.email}`);

    res.json({
      message: 'Alerte supprimée avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'alerte:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de l\'alerte',
      code: 'ALERT_DELETE_ERROR'
    });
  }
});

// Statistiques des alertes
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { farmId, period = '30' } = req.query;

    let whereClause = `f.user_id = ?`;
    let params = [req.user.id];

    if (farmId) {
      // Vérifier que la ferme appartient à l'utilisateur
      const farm = await get(
        'SELECT id FROM farms WHERE id = ? AND user_id = ? AND is_active = 1',
        [farmId, req.user.id]
      );

      if (!farm) {
        return res.status(404).json({
          error: 'Ferme non trouvée',
          code: 'FARM_NOT_FOUND'
        });
      }

      whereClause += ' AND a.farm_id = ?';
      params.push(farmId);
    }

    whereClause += ` AND a.created_at >= datetime('now', '-${parseInt(period)} days')`;

    const stats = await get(
      `SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN a.is_read = 0 THEN 1 END) as unread_alerts,
        COUNT(CASE WHEN a.severity = 'critical' THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN a.severity = 'high' THEN 1 END) as high_alerts,
        COUNT(CASE WHEN a.severity = 'medium' THEN 1 END) as medium_alerts,
        COUNT(CASE WHEN a.severity = 'low' THEN 1 END) as low_alerts,
        SUM(a.estimated_savings) as total_savings,
        COUNT(CASE WHEN a.type = 'frost' THEN 1 END) as frost_alerts,
        COUNT(CASE WHEN a.type = 'drought' THEN 1 END) as drought_alerts,
        COUNT(CASE WHEN a.type = 'heavy_rain' THEN 1 END) as rain_alerts,
        COUNT(CASE WHEN a.type = 'disease_risk' THEN 1 END) as disease_alerts
       FROM alerts a
       JOIN farms f ON a.farm_id = f.id
       WHERE ${whereClause} AND a.is_active = 1`,
      params
    );

    res.json({
      stats: {
        period: parseInt(period),
        total: stats.total_alerts || 0,
        unread: stats.unread_alerts || 0,
        bySeverity: {
          critical: stats.critical_alerts || 0,
          high: stats.high_alerts || 0,
          medium: stats.medium_alerts || 0,
          low: stats.low_alerts || 0
        },
        byType: {
          frost: stats.frost_alerts || 0,
          drought: stats.drought_alerts || 0,
          heavyRain: stats.rain_alerts || 0,
          diseaseRisk: stats.disease_alerts || 0
        },
        totalSavings: stats.total_savings || 0
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques d\'alertes:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques d\'alertes',
      code: 'ALERT_STATS_ERROR'
    });
  }
});

module.exports = router;