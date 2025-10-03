const express = require('express');
const { run, get, all } = require('../utils/database');
const { validate, farmSchemas, validateParams, paramSchemas } = require('../middleware/validation');
const { authenticateToken, checkFarmOwnership } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Créer une nouvelle ferme
router.post('/', authenticateToken, validate(farmSchemas.create), async (req, res) => {
  try {
    const {
      name,
      description,
      latitude,
      longitude,
      address,
      crops,
      areaHectares,
      soilType,
      irrigationSystem
    } = req.body;

    const result = await run(
      `INSERT INTO farms (
        user_id, name, description, latitude, longitude, address,
        crops, area_hectares, soil_type, irrigation_system
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        name,
        description || null,
        latitude,
        longitude,
        address || null,
        JSON.stringify(crops || []),
        areaHectares || null,
        soilType || null,
        irrigationSystem || null
      ]
    );

    logger.info(`Nouvelle ferme créée: ${name} (ID: ${result.id}) par ${req.user.email}`);

    // Récupérer la ferme créée
    const newFarm = await get(
      `SELECT id, name, description, latitude, longitude, address,
              crops, area_hectares, soil_type, irrigation_system, created_at
       FROM farms WHERE id = ?`,
      [result.id]
    );

    res.status(201).json({
      message: 'Ferme créée avec succès',
      farm: {
        ...newFarm,
        crops: JSON.parse(newFarm.crops || '[]')
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la création de la ferme:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la ferme',
      code: 'FARM_CREATE_ERROR'
    });
  }
});

// Récupérer toutes les fermes de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const farms = await all(
      `SELECT id, name, description, latitude, longitude, address,
              crops, area_hectares, soil_type, irrigation_system, created_at
       FROM farms 
       WHERE user_id = ? AND is_active = 1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const farmsWithParsedCrops = farms.map(farm => ({
      ...farm,
      crops: JSON.parse(farm.crops || '[]')
    }));

    res.json({
      farms: farmsWithParsedCrops,
      count: farmsWithParsedCrops.length
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des fermes:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des fermes',
      code: 'FARMS_FETCH_ERROR'
    });
  }
});

// Récupérer une ferme spécifique
router.get('/:farmId', authenticateToken, validateParams(paramSchemas.farmId), checkFarmOwnership, async (req, res) => {
  try {
    const farm = await get(
      `SELECT id, name, description, latitude, longitude, address,
              crops, area_hectares, soil_type, irrigation_system, created_at, updated_at
       FROM farms 
       WHERE id = ? AND is_active = 1`,
      [req.farmId]
    );

    if (!farm) {
      return res.status(404).json({
        error: 'Ferme non trouvée',
        code: 'FARM_NOT_FOUND'
      });
    }

    res.json({
      farm: {
        ...farm,
        crops: JSON.parse(farm.crops || '[]')
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération de la ferme:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la ferme',
      code: 'FARM_FETCH_ERROR'
    });
  }
});

// Mettre à jour une ferme
router.put('/:farmId', authenticateToken, validateParams(paramSchemas.farmId), checkFarmOwnership, validate(farmSchemas.update), async (req, res) => {
  try {
    const {
      name,
      description,
      latitude,
      longitude,
      address,
      crops,
      areaHectares,
      soilType,
      irrigationSystem
    } = req.body;

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (latitude !== undefined) {
      updates.push('latitude = ?');
      values.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push('longitude = ?');
      values.push(longitude);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (crops !== undefined) {
      updates.push('crops = ?');
      values.push(JSON.stringify(crops));
    }
    if (areaHectares !== undefined) {
      updates.push('area_hectares = ?');
      values.push(areaHectares);
    }
    if (soilType !== undefined) {
      updates.push('soil_type = ?');
      values.push(soilType);
    }
    if (irrigationSystem !== undefined) {
      updates.push('irrigation_system = ?');
      values.push(irrigationSystem);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Aucune donnée à mettre à jour',
        code: 'NO_UPDATES'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.farmId);

    const sql = `UPDATE farms SET ${updates.join(', ')} WHERE id = ?`;
    await run(sql, values);

    logger.info(`Ferme mise à jour: ID ${req.farmId} par ${req.user.email}`);

    // Récupérer la ferme mise à jour
    const updatedFarm = await get(
      `SELECT id, name, description, latitude, longitude, address,
              crops, area_hectares, soil_type, irrigation_system, created_at, updated_at
       FROM farms WHERE id = ?`,
      [req.farmId]
    );

    res.json({
      message: 'Ferme mise à jour avec succès',
      farm: {
        ...updatedFarm,
        crops: JSON.parse(updatedFarm.crops || '[]')
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la ferme:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour de la ferme',
      code: 'FARM_UPDATE_ERROR'
    });
  }
});

// Supprimer une ferme (soft delete)
router.delete('/:farmId', authenticateToken, validateParams(paramSchemas.farmId), checkFarmOwnership, async (req, res) => {
  try {
    await run(
      'UPDATE farms SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.farmId]
    );

    logger.info(`Ferme supprimée: ID ${req.farmId} par ${req.user.email}`);

    res.json({
      message: 'Ferme supprimée avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression de la ferme:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression de la ferme',
      code: 'FARM_DELETE_ERROR'
    });
  }
});

// Récupérer les fermes proches (pour le réseau communautaire)
router.get('/:farmId/nearby', authenticateToken, validateParams(paramSchemas.farmId), checkFarmOwnership, async (req, res) => {
  try {
    const { radius = 10 } = req.query; // Rayon en km par défaut

    // Récupérer les coordonnées de la ferme
    const farm = await get(
      'SELECT latitude, longitude FROM farms WHERE id = ? AND is_active = 1',
      [req.farmId]
    );

    if (!farm) {
      return res.status(404).json({
        error: 'Ferme non trouvée',
        code: 'FARM_NOT_FOUND'
      });
    }

    // Calculer les fermes proches avec la formule de Haversine
    const nearbyFarms = await all(
      `SELECT f.id, f.name, f.latitude, f.longitude, f.crops, f.area_hectares,
              u.first_name, u.last_name,
              (6371 * acos(cos(radians(?)) * cos(radians(f.latitude)) * 
               cos(radians(f.longitude) - radians(?)) + 
               sin(radians(?)) * sin(radians(f.latitude)))) AS distance
       FROM farms f
       JOIN users u ON f.user_id = u.id
       WHERE f.id != ? AND f.is_active = 1 AND u.is_active = 1
       HAVING distance <= ?
       ORDER BY distance ASC
       LIMIT 20`,
      [farm.latitude, farm.longitude, farm.latitude, req.farmId, radius]
    );

    const farmsWithParsedCrops = nearbyFarms.map(farm => ({
      ...farm,
      crops: JSON.parse(farm.crops || '[]'),
      distance: Math.round(farm.distance * 100) / 100 // Arrondir à 2 décimales
    }));

    res.json({
      nearbyFarms: farmsWithParsedCrops,
      count: farmsWithParsedCrops.length,
      radius: parseInt(radius)
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des fermes proches:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des fermes proches',
      code: 'NEARBY_FARMS_ERROR'
    });
  }
});

// Statistiques de la ferme
router.get('/:farmId/stats', authenticateToken, validateParams(paramSchemas.farmId), checkFarmOwnership, async (req, res) => {
  try {
    // Récupérer les statistiques des alertes
    const alertStats = await get(
      `SELECT 
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_alerts,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts,
        SUM(estimated_savings) as total_savings
       FROM alerts 
       WHERE farm_id = ? AND is_active = 1`,
      [req.farmId]
    );

    // Récupérer les statistiques des signalements
    const reportStats = await get(
      `SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN report_type = 'disease' THEN 1 END) as disease_reports,
        COUNT(CASE WHEN report_type = 'pest' THEN 1 END) as pest_reports,
        COUNT(CASE WHEN report_type = 'good_practice' THEN 1 END) as good_practice_reports
       FROM community_reports 
       WHERE farm_id = ?`,
      [req.farmId]
    );

    // Récupérer les données météo récentes
    const weatherStats = await get(
      `SELECT COUNT(*) as weather_data_points
       FROM weather_data 
       WHERE farm_id = ? 
       AND created_at >= datetime('now', '-7 days')`,
      [req.farmId]
    );

    res.json({
      stats: {
        alerts: {
          total: alertStats.total_alerts || 0,
          unread: alertStats.unread_alerts || 0,
          critical: alertStats.critical_alerts || 0,
          high: alertStats.high_alerts || 0,
          totalSavings: alertStats.total_savings || 0
        },
        reports: {
          total: reportStats.total_reports || 0,
          disease: reportStats.disease_reports || 0,
          pest: reportStats.pest_reports || 0,
          goodPractice: reportStats.good_practice_reports || 0
        },
        weather: {
          dataPointsLast7Days: weatherStats.weather_data_points || 0
        }
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques',
      code: 'FARM_STATS_ERROR'
    });
  }
});

module.exports = router;