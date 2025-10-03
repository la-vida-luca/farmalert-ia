import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './database/farmalert.db';

// Créer le dossier database s'il n'existe pas
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
  } else {
    console.log('Connexion à la base de données SQLite réussie');
  }
});

export const initDatabase = () => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      // Table des utilisateurs
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          phone TEXT,
          role TEXT DEFAULT 'farmer' CHECK(role IN ('admin', 'farmer')),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Table des fermes
      db.run(`
        CREATE TABLE IF NOT EXISTS farms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          address TEXT NOT NULL,
          city TEXT NOT NULL,
          postalCode TEXT NOT NULL,
          region TEXT NOT NULL,
          farmType TEXT NOT NULL CHECK(farmType IN ('cereals', 'dairy', 'organic', 'livestock', 'vegetables', 'fruits')),
          size REAL NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Table des données météo
      db.run(`
        CREATE TABLE IF NOT EXISTS weather_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          farmId INTEGER NOT NULL,
          temperature REAL NOT NULL,
          humidity REAL NOT NULL,
          pressure REAL NOT NULL,
          windSpeed REAL NOT NULL,
          windDirection REAL NOT NULL,
          precipitation REAL NOT NULL,
          cloudiness REAL NOT NULL,
          visibility REAL NOT NULL,
          uvIndex REAL NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          weatherCondition TEXT NOT NULL,
          weatherDescription TEXT NOT NULL,
          FOREIGN KEY (farmId) REFERENCES farms (id) ON DELETE CASCADE
        )
      `);

      // Table des alertes
      db.run(`
        CREATE TABLE IF NOT EXISTS alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          farmId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('frost', 'drought', 'fungal_disease', 'excessive_rain', 'strong_wind', 'heat_wave')),
          severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          recommendation TEXT NOT NULL,
          isActive BOOLEAN DEFAULT 1,
          triggeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          acknowledgedAt DATETIME,
          weatherDataId INTEGER,
          FOREIGN KEY (farmId) REFERENCES farms (id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (weatherDataId) REFERENCES weather_data (id)
        )
      `, (err) => {
        if (err) {
          console.error('Erreur lors de la création des tables:', err.message);
          reject(err);
        } else {
          console.log('Tables créées avec succès');
          resolve();
        }
      });
    });
  });
};

export const closeDatabase = () => {
  return new Promise<void>((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Erreur lors de la fermeture de la base de données:', err.message);
      } else {
        console.log('Connexion à la base de données fermée');
      }
      resolve();
    });
  });
};