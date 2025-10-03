const jwt = require('jsonwebtoken');
const { get } = require('../utils/database');
const logger = require('../utils/logger');

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Token d\'accès requis',
      code: 'MISSING_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours
    const user = await get(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Utilisateur non trouvé ou inactif',
        code: 'USER_NOT_FOUND'
      });
    }

    // Vérifier que la session existe
    const session = await get(
      'SELECT id FROM user_sessions WHERE token = ? AND expires_at > datetime("now")',
      [token]
    );

    if (!session) {
      return res.status(401).json({
        error: 'Session expirée',
        code: 'SESSION_EXPIRED'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Erreur de vérification du token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(500).json({
      error: 'Erreur de vérification du token',
      code: 'TOKEN_VERIFICATION_ERROR'
    });
  }
};

// Middleware optionnel d'authentification (pour les routes publiques avec données utilisateur si connecté)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await get(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );
    
    req.user = user || null;
  } catch (error) {
    req.user = null;
  }
  
  next();
};

// Middleware de vérification des permissions (propriétaire de la ferme)
const checkFarmOwnership = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    
    if (!farmId) {
      return res.status(400).json({
        error: 'ID de ferme requis',
        code: 'FARM_ID_REQUIRED'
      });
    }

    const farm = await get(
      'SELECT user_id FROM farms WHERE id = ? AND is_active = 1',
      [farmId]
    );

    if (!farm) {
      return res.status(404).json({
        error: 'Ferme non trouvée',
        code: 'FARM_NOT_FOUND'
      });
    }

    if (farm.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Accès non autorisé à cette ferme',
        code: 'FARM_ACCESS_DENIED'
      });
    }

    req.farmId = farmId;
    next();
  } catch (error) {
    logger.error('Erreur de vérification de propriété de ferme:', error);
    res.status(500).json({
      error: 'Erreur de vérification des permissions',
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
};

// Middleware de vérification des rôles (pour futures fonctionnalités admin)
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      // Pour l'instant, tous les utilisateurs ont le même rôle
      // Cette fonctionnalité peut être étendue plus tard
      const user = await get(
        'SELECT id FROM users WHERE id = ? AND is_active = 1',
        [req.user.id]
      );

      if (!user) {
        return res.status(403).json({
          error: 'Utilisateur non autorisé',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      logger.error('Erreur de vérification de rôle:', error);
      res.status(500).json({
        error: 'Erreur de vérification des permissions',
        code: 'ROLE_CHECK_ERROR'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  checkFarmOwnership,
  checkRole
};