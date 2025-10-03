const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get } = require('../utils/database');
const { validate, authSchemas } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Inscription
router.post('/register', validate(authSchemas.register), async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        error: 'Un compte avec cet email existe déjà',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Hacher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const result = await run(
      `INSERT INTO users (email, password, first_name, last_name, phone) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, hashedPassword, firstName, lastName, phone || null]
    );

    logger.info(`Nouvel utilisateur créé: ${email} (ID: ${result.id})`);

    // Générer le token JWT
    const token = jwt.sign(
      { userId: result.id, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Enregistrer la session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

    await run(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [result.id, token, expiresAt.toISOString()]
    );

    res.status(201).json({
      message: 'Compte créé avec succès',
      user: {
        id: result.id,
        email,
        firstName,
        lastName,
        phone
      },
      token,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      error: 'Erreur lors de la création du compte',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Connexion
router.post('/login', validate(authSchemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Récupérer l'utilisateur
    const user = await get(
      'SELECT id, email, password, first_name, last_name, phone, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Compte désactivé',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Email ou mot de passe incorrect',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Enregistrer la session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

    await run(
      'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt.toISOString()]
    );

    logger.info(`Connexion réussie: ${email} (ID: ${user.id})`);

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone
      },
      token,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion',
      code: 'LOGIN_ERROR'
    });
  }
});

// Déconnexion
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Supprimer la session
    await run(
      'DELETE FROM user_sessions WHERE token = ?',
      [req.token]
    );

    logger.info(`Déconnexion: ${req.user.email} (ID: ${req.user.id})`);

    res.json({
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    logger.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      error: 'Erreur lors de la déconnexion',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Déconnexion de tous les appareils
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // Supprimer toutes les sessions de l'utilisateur
    await run(
      'DELETE FROM user_sessions WHERE user_id = ?',
      [req.user.id]
    );

    logger.info(`Déconnexion globale: ${req.user.email} (ID: ${req.user.id})`);

    res.json({
      message: 'Déconnexion de tous les appareils réussie'
    });

  } catch (error) {
    logger.error('Erreur lors de la déconnexion globale:', error);
    res.status(500).json({
      error: 'Erreur lors de la déconnexion globale',
      code: 'LOGOUT_ALL_ERROR'
    });
  }
});

// Vérifier le token (profil utilisateur)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Récupérer les informations complètes de l'utilisateur
    const user = await get(
      `SELECT id, email, first_name, last_name, phone, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    // Récupérer les fermes de l'utilisateur
    const farms = await get(
      `SELECT id, name, latitude, longitude, crops, area_hectares 
       FROM farms WHERE user_id = ? AND is_active = 1`,
      [req.user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        createdAt: user.created_at
      },
      farms: farms || []
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil',
      code: 'PROFILE_ERROR'
    });
  }
});

// Changer le mot de passe
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validation basique
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Mot de passe actuel et nouveau mot de passe requis',
        code: 'PASSWORDS_REQUIRED'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Récupérer le mot de passe actuel
    const user = await get('SELECT password FROM users WHERE id = ?', [req.user.id]);

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Mot de passe actuel incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Hacher le nouveau mot de passe
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le mot de passe
    await run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    // Supprimer toutes les sessions existantes (forcer une reconnexion)
    await run('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id]);

    logger.info(`Mot de passe changé: ${req.user.email} (ID: ${req.user.id})`);

    res.json({
      message: 'Mot de passe changé avec succès. Veuillez vous reconnecter.'
    });

  } catch (error) {
    logger.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({
      error: 'Erreur lors du changement de mot de passe',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
});

// Supprimer le compte
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Mot de passe requis pour supprimer le compte',
        code: 'PASSWORD_REQUIRED'
      });
    }

    // Récupérer le mot de passe
    const user = await get('SELECT password FROM users WHERE id = ?', [req.user.id]);

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Mot de passe incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Désactiver le compte (soft delete)
    await run(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id]
    );

    // Supprimer toutes les sessions
    await run('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id]);

    logger.info(`Compte supprimé: ${req.user.email} (ID: ${req.user.id})`);

    res.json({
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du compte',
      code: 'ACCOUNT_DELETE_ERROR'
    });
  }
});

module.exports = router;