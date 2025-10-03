const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let db = null;

// Initialisation de la base de données
async function initDatabase() {
  return new Promise((resolve, reject) => {
    const dbPath = process.env.DB_PATH || './database/farmalert.db';
    const dbDir = path.dirname(dbPath);
    
    // Créer le dossier database s'il n'existe pas
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Créer le dossier logs s'il n'existe pas
    const logsDir = path.join(__dirname, '../../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Erreur lors de l\'ouverture de la base de données:', err);
        reject(err);
      } else {
        logger.info(`Base de données SQLite ouverte: ${dbPath}`);
        createTables().then(resolve).catch(reject);
      }
    });
  });
}

// Création des tables
async function createTables() {
  const tables = [
    // Table utilisateurs
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Table fermes
    `CREATE TABLE IF NOT EXISTS farms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      address TEXT,
      crops JSON,
      area_hectares REAL,
      soil_type TEXT,
      irrigation_system TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // Table alertes
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      weather_data JSON,
      coordinates JSON,
      estimated_savings REAL,
      is_read BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    )`,
    
    // Table signalements communautaires
    `CREATE TABLE IF NOT EXISTS community_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      report_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      coordinates JSON,
      images JSON,
      severity TEXT DEFAULT 'medium',
      is_verified BOOLEAN DEFAULT 0,
      verified_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
      FOREIGN KEY (verified_by) REFERENCES users(id)
    )`,
    
    // Table données météo
    `CREATE TABLE IF NOT EXISTS weather_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farm_id INTEGER NOT NULL,
      coordinates JSON NOT NULL,
      current_weather JSON,
      forecast_5d JSON,
      alerts_generated JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
    )`,
    
    // Table notifications push
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    // Table sessions utilisateur
    `CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];
  
  return new Promise((resolve, reject) => {
    let completed = 0;
    const total = tables.length;
    
    tables.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          logger.error(`Erreur lors de la création de la table ${index + 1}:`, err);
          reject(err);
        } else {
          completed++;
          logger.info(`Table ${index + 1}/${total} créée avec succès`);
          
          if (completed === total) {
            logger.info('Toutes les tables ont été créées avec succès');
            resolve();
          }
        }
      });
    });
  });
}

// Fonction utilitaire pour exécuter des requêtes
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Fonction utilitaire pour récupérer une ligne
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Fonction utilitaire pour récupérer plusieurs lignes
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Fermeture de la base de données
function close() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          logger.info('Base de données fermée');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initDatabase,
  run,
  get,
  all,
  close,
  getDb: () => db
};