const Joi = require('joi');
const logger = require('../utils/logger');

// Middleware de validation générique
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Erreur de validation:', {
        path: req.path,
        method: req.method,
        errors: errorDetails
      });

      return res.status(400).json({
        error: 'Données invalides',
        code: 'VALIDATION_ERROR',
        details: errorDetails
      });
    }

    req[property] = value;
    next();
  };
};

// Schémas de validation pour l'authentification
const authSchemas = {
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'L\'email doit être valide',
        'any.required': 'L\'email est requis'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial',
        'any.required': 'Le mot de passe est requis'
      }),
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Le prénom doit contenir au moins 2 caractères',
        'string.max': 'Le prénom ne peut pas dépasser 50 caractères',
        'any.required': 'Le prénom est requis'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut pas dépasser 50 caractères',
        'any.required': 'Le nom est requis'
      }),
    phone: Joi.string()
      .pattern(/^[0-9+\-\s()]+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Le numéro de téléphone n\'est pas valide'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'L\'email doit être valide',
        'any.required': 'L\'email est requis'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Le mot de passe est requis'
      })
  })
};

// Schémas de validation pour les fermes
const farmSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Le nom de la ferme doit contenir au moins 2 caractères',
        'string.max': 'Le nom de la ferme ne peut pas dépasser 100 caractères',
        'any.required': 'Le nom de la ferme est requis'
      }),
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'La description ne peut pas dépasser 500 caractères'
      }),
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .required()
      .messages({
        'number.min': 'La latitude doit être entre -90 et 90',
        'number.max': 'La latitude doit être entre -90 et 90',
        'any.required': 'La latitude est requise'
      }),
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .required()
      .messages({
        'number.min': 'La longitude doit être entre -180 et 180',
        'number.max': 'La longitude doit être entre -180 et 180',
        'any.required': 'La longitude est requise'
      }),
    address: Joi.string()
      .max(200)
      .optional()
      .messages({
        'string.max': 'L\'adresse ne peut pas dépasser 200 caractères'
      }),
    crops: Joi.array()
      .items(Joi.string().max(50))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Vous ne pouvez pas avoir plus de 10 cultures',
        'string.max': 'Le nom d\'une culture ne peut pas dépasser 50 caractères'
      }),
    areaHectares: Joi.number()
      .min(0.1)
      .max(10000)
      .optional()
      .messages({
        'number.min': 'La superficie doit être d\'au moins 0.1 hectare',
        'number.max': 'La superficie ne peut pas dépasser 10000 hectares'
      }),
    soilType: Joi.string()
      .valid('argileux', 'sableux', 'limoneux', 'calcaire', 'humifère', 'autre')
      .optional(),
    irrigationSystem: Joi.string()
      .valid('aucun', 'aspersion', 'goutte_a_goutte', 'gravitaire', 'pivot', 'autre')
      .optional()
  }),

  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .optional(),
    description: Joi.string()
      .max(500)
      .optional()
      .allow(''),
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .optional(),
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .optional(),
    address: Joi.string()
      .max(200)
      .optional()
      .allow(''),
    crops: Joi.array()
      .items(Joi.string().max(50))
      .max(10)
      .optional(),
    areaHectares: Joi.number()
      .min(0.1)
      .max(10000)
      .optional(),
    soilType: Joi.string()
      .valid('argileux', 'sableux', 'limoneux', 'calcaire', 'humifère', 'autre')
      .optional(),
    irrigationSystem: Joi.string()
      .valid('aucun', 'aspersion', 'goutte_a_goutte', 'gravitaire', 'pivot', 'autre')
      .optional()
  })
};

// Schémas de validation pour les signalements communautaires
const reportSchemas = {
  create: Joi.object({
    reportType: Joi.string()
      .valid('disease', 'pest', 'weather_damage', 'good_practice', 'market_info', 'other')
      .required()
      .messages({
        'any.only': 'Le type de signalement doit être valide',
        'any.required': 'Le type de signalement est requis'
      }),
    title: Joi.string()
      .min(5)
      .max(100)
      .required()
      .messages({
        'string.min': 'Le titre doit contenir au moins 5 caractères',
        'string.max': 'Le titre ne peut pas dépasser 100 caractères',
        'any.required': 'Le titre est requis'
      }),
    description: Joi.string()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'La description doit contenir au moins 10 caractères',
        'string.max': 'La description ne peut pas dépasser 1000 caractères',
        'any.required': 'La description est requise'
      }),
    coordinates: Joi.object({
      latitude: Joi.number()
        .min(-90)
        .max(90)
        .required(),
      longitude: Joi.number()
        .min(-180)
        .max(180)
        .required()
    }).optional(),
    severity: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .default('medium')
      .messages({
        'any.only': 'La gravité doit être low, medium, high ou critical'
      })
  })
};

// Schémas de validation pour les alertes
const alertSchemas = {
  create: Joi.object({
    type: Joi.string()
      .valid('frost', 'drought', 'heavy_rain', 'disease_risk', 'pest_risk', 'wind', 'hail', 'custom')
      .required()
      .messages({
        'any.only': 'Le type d\'alerte doit être valide',
        'any.required': 'Le type d\'alerte est requis'
      }),
    severity: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .required()
      .messages({
        'any.only': 'La gravité doit être low, medium, high ou critical',
        'any.required': 'La gravité est requise'
      }),
    title: Joi.string()
      .min(5)
      .max(100)
      .required()
      .messages({
        'string.min': 'Le titre doit contenir au moins 5 caractères',
        'string.max': 'Le titre ne peut pas dépasser 100 caractères',
        'any.required': 'Le titre est requis'
      }),
    message: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        'string.min': 'Le message doit contenir au moins 10 caractères',
        'string.max': 'Le message ne peut pas dépasser 500 caractères',
        'any.required': 'Le message est requis'
      }),
    estimatedSavings: Joi.number()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Les économies estimées ne peuvent pas être négatives'
      })
  })
};

// Validation des paramètres d'URL
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params);
    
    if (error) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        code: 'INVALID_PARAMS',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.params = value;
    next();
  };
};

// Schémas pour les paramètres
const paramSchemas = {
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  farmId: Joi.object({
    farmId: Joi.number().integer().positive().required()
  })
};

module.exports = {
  validate,
  validateParams,
  authSchemas,
  farmSchemas,
  reportSchemas,
  alertSchemas,
  paramSchemas
};