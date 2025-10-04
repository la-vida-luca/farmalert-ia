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

// Récupérer tous les médicaments
app.get('/api/medicaments', async (req, res) => {
  try {
    const medicaments = await db.getAllMedicaments();
    res.json(medicaments);
  } catch (error) {
    console.error('Erreur lors de la récupération des médicaments:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les alertes d'un utilisateur
app.get('/api/alertes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const alertes = await db.getAlertesByUser(userId);
    res.json(alertes);
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une nouvelle alerte
app.post('/api/alertes', async (req, res) => {
  try {
    const { userId, medicamentId, seuil, email } = req.body;
    
    if (!userId || !medicamentId || !seuil) {
      return res.status(400).json({ error: 'Données manquantes' });
    }
    
    const id = await db.createAlerte(userId, medicamentId, seuil, email);
    res.status(201).json({ id, message: 'Alerte créée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une alerte
app.delete('/api/alertes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteAlerte(id);
    res.json({ message: 'Alerte supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'alerte:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Rechercher des médicaments dans l'API publique
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 3) {
      return res.json([]);
    }
    
    // Recherche dans l'API Open Medicaments
    const response = await axios.get(
      `https://open-medicaments.fr/api/v1/medicaments`,
      {
        params: {
          query: q,
          limit: 20
        }
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// Vérifier les stocks et déclencher les alertes
app.post('/api/check-stocks', async (req, res) => {
  try {
    const alertes = await db.getAllAlertes();
    const triggered = [];
    
    for (const alerte of alertes) {
      // Simuler une vérification de stock (à remplacer par une vraie API)
      const stockActuel = Math.floor(Math.random() * 100);
      
      if (stockActuel <= alerte.seuil && alerte.active) {
        triggered.push({
          alerteId: alerte.id,
          medicament: alerte.nom_medicament,
          stockActuel,
          seuil: alerte.seuil,
          email: alerte.email
        });
        
        // Désactiver l'alerte temporairement
        await db.updateAlerteStatus(alerte.id, false);
      }
    }
    
    res.json({ 
      message: 'Vérification terminée',
      alertesDeclenchees: triggered.length,
      details: triggered
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des stocks:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Servir le frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialisation et démarrage du serveur
async function startServer() {
  try {
    // Exécuter la migration au démarrage
    console.log('Exécution de la migration de la base de données...');
    await migrate();
    console.log('Migration terminée avec succès');
    
    // Initialiser la base de données
    await db.init();
    console.log('Base de données initialisée');
    
    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
      console.log(`Interface disponible sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startServer();

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\nArrêt du serveur...');
  await db.close();
  process.exit(0);
});

module.exports = app;
