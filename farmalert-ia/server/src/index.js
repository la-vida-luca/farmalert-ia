const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const logger = require('./utils/logger');
const { initDatabase } = require('./utils/database');
const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const alertsRoutes = require('./routes/alerts');
const farmsRoutes = require('./routes/farms');
const reportsRoutes = require('./routes/reports');
const notificationsRoutes = require('./routes/notifications');
const { startWeatherScheduler } = require('./services/weatherScheduler');

const app = express();

// Debug: Afficher les variables d'environnement
console.log('=== DEBUG RAILWAY PORT ===');
console.log('process.env.PORT:', process.env.PORT);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);

const PORT = process.env.PORT || 3000;
console.log('Port final utilisé:', PORT);
console.log('========================');

// Middleware de sécurité
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limite par IP
  message: {
    error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
  }
});

app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://farmalert-ia.netlify.app', 'https://farmalert-ia.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging des requêtes
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/farms', farmsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'FarmAlert IA API - Plateforme collaborative d\'alertes météo pour agriculteurs',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  logger.error('Erreur serveur:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.details
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Token d\'authentification invalide'
    });
  }
  
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl
  });
});

// Initialisation de la base de données et démarrage du serveur
async function startServer() {
  try {
    console.log('=== DÉMARRAGE DU SERVEUR ===');
    console.log('Initialisation de la base de données...');
    
    await initDatabase();
    logger.info('Base de données initialisée avec succès');
    console.log('✓ Base de données initialisée');
    
    // Démarrer le scheduler météo
    startWeatherScheduler();
    logger.info('Scheduler météo démarré');
    console.log('✓ Scheduler météo démarré');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS!');
      logger.info(`🚀 Serveur FarmAlert IA démarré sur le port ${PORT}`);
      logger.info(`📊 Environnement: ${process.env.NODE_ENV}`);
      logger.info(`🌐 API disponible sur: http://localhost:${PORT}`);
      console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Serveur écoute sur le port: ${PORT}`);
      console.log(`🌐 API disponible sur: http://localhost:${PORT}`);
      console.log('===========================\n');
    });
  } catch (error) {
    console.error('❌ ERREUR LORS DU DÉMARRAGE:', error);
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion des signaux de fermeture
process.on('SIGTERM', () => {
  console.log('\n⚠️  Signal SIGTERM reçu, fermeture du serveur...');
  logger.info('Signal SIGTERM reçu, fermeture du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️  Signal SIGINT reçu, fermeture du serveur...');
  logger.info('Signal SIGINT reçu, fermeture du serveur...');
  process.exit(0);
});

startServer();
