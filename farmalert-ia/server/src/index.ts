import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { initDatabase } from './config/database';
import logger from './utils/logger';
import { WeatherService } from './services/weatherService';
import { AlertsEngine } from './services/alertsEngine';

// Routes
import authRoutes from './routes/auth';
import farmsRoutes from './routes/farms';
import alertsRoutes from './routes/alerts';
import weatherRoutes from './routes/weather';

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8080', 10);

// Configuration CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://fermalertia.netlify.app',
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware de compression
app.use(compression());

// Middleware CORS
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limite par IP
  message: {
    error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging des requêtes
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: '🌾 FarmAlert IA API',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      farms: '/api/farms',
      alerts: '/api/alerts',
      weather: '/api/weather'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/farms', farmsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/weather', weatherRoutes);

// Route pour les données de démonstration
app.get('/api/demo/data', async (req, res) => {
  try {
    const db = require('./config/database').db;
    
    // Récupérer les données de démonstration
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT id, email, firstName, lastName, role FROM users', (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const farms = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM farms', (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const alerts = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM alerts ORDER BY triggeredAt DESC LIMIT 10', (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      users,
      farms,
      alerts,
      message: 'Données de démonstration FarmAlert IA'
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des données de démonstration:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Middleware de gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware de gestion des erreurs globales
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Erreur non gérée:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erreur serveur interne' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Tâches cron pour la mise à jour automatique des données météo
cron.schedule('0 */3 * * *', async () => {
  try {
    logger.info('Début de la mise à jour automatique des données météo');
    await WeatherService.updateWeatherForAllFarms();
    logger.info('Mise à jour automatique des données météo terminée');
  } catch (error) {
    logger.error('Erreur lors de la mise à jour automatique des données météo:', error);
  }
});

// Tâche cron pour la vérification des alertes
cron.schedule('0 */6 * * *', async () => {
  try {
    logger.info('Début de la vérification automatique des alertes');
    
    const db = require('./config/database').db;
    const farms = await new Promise((resolve, reject) => {
      db.all('SELECT id, userId FROM farms', (err: any, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }) as any[];

    for (const farm of farms) {
      try {
        await AlertsEngine.checkAlerts(farm.id, farm.userId);
      } catch (error) {
        logger.error(`Erreur lors de la vérification des alertes pour la ferme ${farm.id}:`, error);
      }
    }

    // Désactiver les anciennes alertes
    await AlertsEngine.deactivateOldAlerts();
    
    logger.info('Vérification automatique des alertes terminée');
  } catch (error) {
    logger.error('Erreur lors de la vérification automatique des alertes:', error);
  }
});

// Fonction d'initialisation
async function initializeApp() {
  try {
    // Initialiser la base de données
    await initDatabase();
    logger.info('Base de données initialisée');

    // Démarrer le serveur
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🌾 FarmAlert IA API démarrée sur le port ${PORT}`);
      logger.info(`Environnement: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`CORS autorisé pour: ${process.env.CORS_ORIGIN || 'https://fermalertia.netlify.app'}`);
    });
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation de l\'application:', error);
    process.exit(1);
  }
}

// Gestion des signaux de fermeture
process.on('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu, fermeture du serveur...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Signal SIGINT reçu, fermeture du serveur...');
  process.exit(0);
});

// Démarrer l'application
initializeApp();

export default app;