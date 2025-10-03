const express = require('express');
const { run, get, all } = require('../utils/database');
const { validate, reportSchemas, validateParams, paramSchemas } = require('../middleware/validation');
const { authenticateToken, checkFarmOwnership } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Créer un signalement communautaire
router.post('/', authenticateToken, validate(reportSchemas.create), async (req, res) => {
  try {
    const { reportType, title, description, coordinates, severity } = req.body;

    // Récupérer la première ferme active de l'utilisateur pour l'associer au signalement
    const farm = await get(
      'SELECT id, name, latitude, longitude FROM farms WHERE user_id = ? AND is_active = 1 LIMIT 1',
      [req.user.id]
    );

    if (!farm) {
      return res.status(400).json({
        error: 'Aucune ferme trouvée. Créez d\'abord une ferme pour pouvoir faire des signalements.',
        code: 'NO_FARM_FOUND'
      });
    }

    // Utiliser les coordonnées fournies ou celles de la ferme
    const reportCoordinates = coordinates || {
      latitude: farm.latitude,
      longitude: farm.longitude
    };

    const result = await run(
      `INSERT INTO community_reports (
        farm_id, report_type, title, description, coordinates, severity
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        farm.id,
        reportType,
        title,
        description,
        JSON.stringify(reportCoordinates),
        severity || 'medium'
      ]
    );

    logger.info(`Signalement créé: ${title} (ID: ${result.id}) par ${req.user.email}`);

    // Récupérer le signalement créé avec les informations de la ferme
    const newReport = await get(
      `SELECT cr.id, cr.report_type, cr.title, cr.description, cr.coordinates,
              cr.severity, cr.is_verified, cr.created_at,
              f.name as farm_name, f.id as farm_id,
              u.first_name, u.last_name
       FROM community_reports cr
       JOIN farms f ON cr.farm_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE cr.id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Signalement créé avec succès',
      report: {
        ...newReport,
        coordinates: JSON.parse(newReport.coordinates)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la création du signalement:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du signalement',
      code: 'REPORT_CREATE_ERROR'
    });
  }
});

// Récupérer tous les signalements (réseau communautaire)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      type, 
      severity, 
      verified, 
      radius = 50, 
      lat, 
      lon, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Filtrer par type
    if (type) {
      whereClause += ' AND cr.report_type = ?';
      params.push(type);
    }

    // Filtrer par gravité
    if (severity) {
      whereClause += ' AND cr.severity = ?';
      params.push(severity);
    }

    // Filtrer par statut de vérification
    if (verified !== undefined) {
      whereClause += ' AND cr.is_verified = ?';
      params.push(verified === 'true' ? 1 : 0);
    }

    // Filtrer par rayon géographique si coordonnées fournies
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const radiusKm = parseFloat(radius);

      if (!isNaN(latitude) && !isNaN(longitude) && !isNaN(radiusKm)) {
        whereClause += ` AND (6371 * acos(cos(radians(?)) * cos(radians(CAST(json_extract(cr.coordinates, '$.latitude') AS REAL))) * 
                      cos(radians(CAST(json_extract(cr.coordinates, '$.longitude') AS REAL)) - radians(?)) + 
                      sin(radians(?)) * sin(radians(CAST(json_extract(cr.coordinates, '$.latitude') AS REAL))))) <= ?`;
        params.push(latitude, longitude, latitude, radiusKm);
      }
    }

    const reports = await all(
      `SELECT cr.id, cr.report_type, cr.title, cr.description, cr.coordinates,
              cr.severity, cr.is_verified, cr.created_at,
              f.name as farm_name, f.id as farm_id,
              u.first_name, u.last_name,
              (6371 * acos(cos(radians(?)) * cos(radians(CAST(json_extract(cr.coordinates, '$.latitude') AS REAL))) * 
               cos(radians(CAST(json_extract(cr.coordinates, '$.longitude') AS REAL)) - radians(?)) + 
               sin(radians(?)) * sin(radians(CAST(json_extract(cr.coordinates, '$.latitude') AS REAL))))) AS distance
       FROM community_reports cr
       JOIN farms f ON cr.farm_id = f.id
       JOIN users u ON f.user_id = u.id
       ${whereClause}
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const reportsWithParsedCoords = reports.map(report => ({
      ...report,
      coordinates: JSON.parse(report.coordinates),
      distance: report.distance ? Math.round(report.distance * 100) / 100 : null
    }));

    // Compter le total de signalements
    const totalCount = await get(
      `SELECT COUNT(*) as count 
       FROM community_reports cr
       JOIN farms f ON cr.farm_id = f.id
       JOIN users u ON f.user_id = u.id
       ${whereClause}`,
      params
    );

    res.json({
      reports: reportsWithParsedCoords,
      pagination: {
        total: totalCount.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: reportsWithParsedCoords.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des signalements:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des signalements',
      code: 'REPORTS_FETCH_ERROR'
    });
  }
});

// Récupérer les signalements d'une ferme spécifique
router.get('/farm/:farmId', authenticateToken, validateParams(paramSchemas.farmId), checkFarmOwnership, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const reports = await all(
      `SELECT cr.id, cr.report_type, cr.title, cr.description, cr.coordinates,
              cr.severity, cr.is_verified, cr.created_at,
              u.first_name, u.last_name
       FROM community_reports cr
       JOIN farms f ON cr.farm_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE cr.farm_id = ?
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.farmId, parseInt(limit), parseInt(offset)]
    );

    const reportsWithParsedCoords = reports.map(report => ({
      ...report,
      coordinates: JSON.parse(report.coordinates)
    }));

    // Compter le total de signalements pour cette ferme
    const totalCount = await get(
      'SELECT COUNT(*) as count FROM community_reports WHERE farm_id = ?',
      [req.farmId]
    );

    res.json({
      reports: reportsWithParsedCoords,
      pagination: {
        total: totalCount.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: reportsWithParsedCoords.length === parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des signalements de la ferme:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des signalements de la ferme',
      code: 'FARM_REPORTS_ERROR'
    });
  }
});

// Récupérer un signalement spécifique
router.get('/:reportId', authenticateToken, validateParams(paramSchemas.id), async (req, res) => {
  try {
    const report = await get(
      `SELECT cr.id, cr.report_type, cr.title, cr.description, cr.coordinates,
              cr.severity, cr.is_verified, cr.created_at,
              f.name as farm_name, f.id as farm_id,
              u.first_name, u.last_name
       FROM community_reports cr
       JOIN farms f ON cr.farm_id = f.id
       JOIN users u ON f.user_id = u.id
       WHERE cr.id = ?`,
      [req.params.id]
    );

    if (!report) {
      return res.status(404).json({
        error: 'Signalement non trouvé',
        code: 'REPORT_NOT_FOUND'
      });
    }

    res.json({
      report: {
        ...report,
        coordinates: JSON.parse(report.coordinates)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération du signalement:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du signalement',
      code: 'REPORT_FETCH_ERROR'
    });
  }
});

// Supprimer un signalement (seulement le créateur)
router.delete('/:reportId', authenticateToken, validateParams(paramSchemas.id), async (req, res) => {
  try {
    // Vérifier que le signalement appartient à l'utilisateur
    const report = await get(
      `SELECT cr.id FROM community_reports cr
       JOIN farms f ON cr.farm_id = f.id
       WHERE cr.id = ? AND f.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!report) {
      return res.status(404).json({
        error: 'Signalement non trouvé ou vous n\'êtes pas autorisé à le supprimer',
        code: 'REPORT_NOT_FOUND'
      });
    }

    await run('DELETE FROM community_reports WHERE id = ?', [req.params.id]);

    logger.info(`Signalement supprimé: ID ${req.params.id} par ${req.user.email}`);

    res.json({
      message: 'Signalement supprimé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression du signalement:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du signalement',
      code: 'REPORT_DELETE_ERROR'
    });
  }
});

// Statistiques des signalements
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { period = '30', farmId } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

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

      whereClause += ' AND cr.farm_id = ?';
      params.push(farmId);
    }

    whereClause += ` AND cr.created_at >= datetime('now', '-${parseInt(period)} days')`;

    const stats = await get(
      `SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN cr.report_type = 'disease' THEN 1 END) as disease_reports,
        COUNT(CASE WHEN cr.report_type = 'pest' THEN 1 END) as pest_reports,
        COUNT(CASE WHEN cr.report_type = 'weather_damage' THEN 1 END) as weather_reports,
        COUNT(CASE WHEN cr.report_type = 'good_practice' THEN 1 END) as good_practice_reports,
        COUNT(CASE WHEN cr.report_type = 'market_info' THEN 1 END) as market_reports,
        COUNT(CASE WHEN cr.report_type = 'other' THEN 1 END) as other_reports,
        COUNT(CASE WHEN cr.severity = 'critical' THEN 1 END) as critical_reports,
        COUNT(CASE WHEN cr.severity = 'high' THEN 1 END) as high_reports,
        COUNT(CASE WHEN cr.severity = 'medium' THEN 1 END) as medium_reports,
        COUNT(CASE WHEN cr.severity = 'low' THEN 1 END) as low_reports,
        COUNT(CASE WHEN cr.is_verified = 1 THEN 1 END) as verified_reports
       FROM community_reports cr
       JOIN farms f ON cr.farm_id = f.id
       WHERE ${whereClause} AND f.user_id = ?`,
      [...params, req.user.id]
    );

    res.json({
      stats: {
        period: parseInt(period),
        total: stats.total_reports || 0,
        byType: {
          disease: stats.disease_reports || 0,
          pest: stats.pest_reports || 0,
          weatherDamage: stats.weather_reports || 0,
          goodPractice: stats.good_practice_reports || 0,
          marketInfo: stats.market_reports || 0,
          other: stats.other_reports || 0
        },
        bySeverity: {
          critical: stats.critical_reports || 0,
          high: stats.high_reports || 0,
          medium: stats.medium_reports || 0,
          low: stats.low_reports || 0
        },
        verified: stats.verified_reports || 0
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques de signalements:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques de signalements',
      code: 'REPORT_STATS_ERROR'
    });
  }
});

module.exports = router;