import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, User } from '../types';
import { db } from '../config/database';
import logger from '../utils/logger';

// Export the AuthRequest interface so it can be used in route files
export { AuthRequest } from '../types';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'accès requis' });
  }

  return jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      logger.error('Erreur de vérification du token:', err);
      return res.status(403).json({ error: 'Token invalide' });
    }

    // Récupérer les informations utilisateur depuis la base de données
    return db.get(
      'SELECT id, email, firstName, lastName, phone, role, createdAt, updatedAt FROM users WHERE id = ?',
      [decoded.userId],
      (err, row: any) => {
        if (err) {
          logger.error('Erreur lors de la récupération de l\'utilisateur:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        if (!row) {
          return res.status(403).json({ error: 'Utilisateur non trouvé' });
        }

        req.user = row as User;
        return next();
      }
    );
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès administrateur requis' });
  }

  return next();
};

export const requireFarmer = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentification requise' });
  }

  if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès agriculteur requis' });
  }

  return next();
};