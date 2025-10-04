const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const db = require('./database');
const { migrate } = require('./migration');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Récupérer toutes les fermes
app.get('/api/fermes', async (req, res) => {
  try {
    const fermes = await db.getAllFermes();
    res.json(fermes);
  } catch (error) {
    console.error('Erreur lors de la récupération des fermes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer une ferme spécifique
app.get('/api/fermes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ferme = await db.getFermeById(id);
    if (!ferme) {
      return res.status(404).json({ error: 'Ferme non trouvée' });
    }
    res.json(ferme);
  } catch (error) {
    console.error('Erreur lors de la récupération de la ferme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle ferme
app.post('/api/fermes', async (req, res) => {
  try {
    const { nom, location, latitude, longitude, cultures, superficie } = req.body;
    const ferme = await db.createFerme(nom, location, latitude, longitude, cultures, superficie);
    res.status(201).json(ferme);
  } catch (error) {
    console.error('Erreur lors de la création de la ferme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour une ferme
app.put('/api/fermes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, location, latitude, longitude, cultures, superficie } = req.body;
    const ferme = await db.updateFerme(id, nom, location, latitude, longitude, cultures, superficie);
    res.json(ferme);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la ferme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une ferme
app.delete('/api/fermes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteFerme(id);
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression de la ferme:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les alertes météo d'une ferme
app.get('/api/alertes/:fermeId', async (req, res) => {
  try {
    const { fermeId } = req.params;
    const alertes = await db.getAlertesByFerme(fermeId);
    res.json(alertes);
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle alerte météo
app.post('/api/alertes', async (req, res) => {
  try {
    const { ferme_id, type_alerte, message, severite, date_debut, date_fin } = req.body;
    const alerte = await db.createAlerte(ferme_id, type_alerte, message, severite, date_debut, date_fin);
    res.status(201).json(alerte);
  } catch (error) {
    console.error('Erreur lors de la création de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les données météo pour une ferme
app.get('/api/meteo/:fermeId', async (req, res) => {
  try {
    const { fermeId } = req.params;
    const ferme = await db.getFermeById(fermeId);
    
    if (!ferme) {
      return res.status(404).json({ error: 'Ferme non trouvée' });
    }

    // Appel à l'API météo (exemple avec OpenWeatherMap)
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${ferme.latitude}&lon=${ferme.longitude}&appid=${apiKey}&units=metric&lang=fr`;
    
    const response = await axios.get(weatherUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Erreur lors de la récupération des données météo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les prévisions météo pour une ferme
app.get('/api/meteo/previsions/:fermeId', async (req, res) => {
  try {
    const { fermeId } = req.params;
    const ferme = await db.getFermeById(fermeId);
    
    if (!ferme) {
      return res.status(404).json({ error: 'Ferme non trouvée' });
    }

    // Appel à l'API météo pour les prévisions
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${ferme.latitude}&lon=${ferme.longitude}&appid=${apiKey}&units=metric&lang=fr`;
    
    const response = await axios.get(forecastUrl);
    res.json(response.data);
  } catch (error) {
    console.error('Erreur lors de la récupération des prévisions météo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Analyse IA des conditions de culture
app.post('/api/analyse-culture', async (req, res) => {
  try {
    const { fermeId, culture, conditions } = req.body;
    // Ici vous pourrez intégrer votre logique IA pour l'analyse
    // Pour l'instant, retour d'un exemple de réponse
    const analyse = {
      culture,
      recommandations: [
        'Irrigation recommandée dans les 48h',
        'Risque de gel prévu - protection nécessaire',
        'Conditions optimales pour la récolte'
      ],
      score_sante: 85,
      actions_prioritaires: ['Vérifier l\'humidité du sol', 'Surveiller les prévisions de gel']
    };
    res.json(analyse);
  } catch (error) {
    console.error('Erreur lors de l\'analyse de culture:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de base
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrage du serveur
async function startServer() {
  try {
    console.log('🚀 Démarrage de FarmAlert IA...');
    
    // Exécution des migrations
    console.log('📦 Exécution des migrations de la base de données...');
    await migrate();
    console.log('✅ Migrations terminées avec succès');
    
    // Démarrage du serveur Express
    app.listen(PORT, () => {
      console.log(`✅ Serveur FarmAlert IA démarré sur le port ${PORT}`);
      console.log(`🌐 Accès: http://localhost:${PORT}`);
      console.log('🌾 Système de monitoring agricole opérationnel');
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

startServer();
