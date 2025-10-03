import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';

// Schémas de validation
export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  phone: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis')
});

export const createFarmSchema = z.object({
  name: z.string().min(1, 'Le nom de la ferme est requis'),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90, 'Latitude invalide'),
  longitude: z.number().min(-180).max(180, 'Longitude invalide'),
  address: z.string().min(1, 'L\'adresse est requise'),
  city: z.string().min(1, 'La ville est requise'),
  postalCode: z.string().min(1, 'Le code postal est requis'),
  region: z.string().min(1, 'La région est requise'),
  farmType: z.enum(['cereals', 'dairy', 'organic', 'livestock', 'vegetables', 'fruits'], {
    errorMap: () => ({ message: 'Type de ferme invalide' })
  }),
  size: z.number().positive('La taille doit être positive')
});

export const updateFarmSchema = createFarmSchema.partial();

// Middleware de validation générique
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        logger.warn('Erreur de validation:', { errors, body: req.body });
        return res.status(400).json({
          error: 'Données invalides',
          details: errors
        });
      }
      
      logger.error('Erreur de validation inattendue:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  };
};

// Middleware de validation des paramètres
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Paramètres invalides',
          details: errors
        });
      }
      
      return res.status(500).json({ error: 'Erreur serveur' });
    }
  };
};

// Schémas pour les paramètres
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID invalide').transform(Number)
});

export const farmIdParamSchema = z.object({
  farmId: z.string().regex(/^\d+$/, 'ID de ferme invalide').transform(Number)
});