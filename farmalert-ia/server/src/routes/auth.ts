import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import { validate, registerSchema, loginSchema } from '../middleware/validation';
import logger from '../utils/logger';

const router = Router();

// Inscription
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Vérifier si l'utilisateur existe déjà
  return db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row: any) => {
      if (err) {
        logger.error('Erreur lors de la vérification de l\'utilisateur:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (row) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      try {
        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 12);

        // Créer l'utilisateur
  return db.run(
          'INSERT INTO users (email, password, firstName, lastName, phone) VALUES (?, ?, ?, ?, ?)',
          [email, hashedPassword, firstName, lastName, phone || null],
          function(this: { lastID: number }, err) {
            if (err) {
              logger.error('Erreur lors de la création de l\'utilisateur:', err);
              return res.status(500).json({ error: 'Erreur serveur' });
            }

            // Générer le token JWT
            const token = jwt.sign(
              { userId: (row as any).id, email },
              process.env.JWT_SECRET!
            );

            logger.info(`Nouvel utilisateur créé: ${email}`);
            return res.status(201).json({
              message: 'Utilisateur créé avec succès',
              token,
              user: {
                id: this.lastID,
                email,
                firstName,
                lastName,
                phone,
                role: 'farmer'
              }
            });
          }
        );
      } catch (error) {
        logger.error('Erreur lors du hashage du mot de passe:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    });
  } catch (error) {
    logger.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

  return db.get(
      'SELECT id, email, password, firstName, lastName, phone, role FROM users WHERE email = ?',
      [email],
      async (err, user: any) => {
        if (err) {
          logger.error('Erreur lors de la récupération de l\'utilisateur:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        try {
          // Vérifier le mot de passe
          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
          }

          // Générer le token JWT
          const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET!
          );

          logger.info(`Connexion réussie: ${email}`);
          return res.json({
            message: 'Connexion réussie',
            token,
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone,
              role: user.role
            }
          });
        } catch (error) {
          logger.error('Erreur lors de la vérification du mot de passe:', error);
          return res.status(500).json({ error: 'Erreur serveur' });
        }
      }
    );
  } catch (error) {
    logger.error('Erreur lors de la connexion:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le profil utilisateur
router.get('/profile', authenticateToken, (req: AuthRequest, res: Response) => {
  return res.json({
    user: {
      id: req.user!.id,
      email: req.user!.email,
      firstName: req.user!.firstName,
      lastName: req.user!.lastName,
      phone: req.user!.phone,
      role: req.user!.role,
      createdAt: req.user!.createdAt
    }
  });
});

// Mettre à jour le profil utilisateur
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user!.id;

  return db.run(
      'UPDATE users SET firstName = ?, lastName = ?, phone = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [firstName, lastName, phone || null, userId],
      function(err) {
        if (err) {
          logger.error('Erreur lors de la mise à jour du profil:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        logger.info(`Profil mis à jour pour l'utilisateur ${userId}`);
        return res.json({ message: 'Profil mis à jour avec succès' });
      }
    );
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du profil:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Changer le mot de passe
router.put('/password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    // Récupérer le mot de passe actuel
  return db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user: any) => {
      if (err) {
        logger.error('Erreur lors de la récupération du mot de passe:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      try {
        // Vérifier le mot de passe actuel
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // Mettre à jour le mot de passe
  return db.run(
          'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedNewPassword, userId],
          function(err) {
            if (err) {
              logger.error('Erreur lors de la mise à jour du mot de passe:', err);
              return res.status(500).json({ error: 'Erreur serveur' });
            }

            logger.info(`Mot de passe changé pour l'utilisateur ${userId}`);
            return res.json({ message: 'Mot de passe changé avec succès' });
          }
        );
      } catch (error) {
        logger.error('Erreur lors du changement de mot de passe:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    });
  } catch (error) {
    logger.error('Erreur lors du changement de mot de passe:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;