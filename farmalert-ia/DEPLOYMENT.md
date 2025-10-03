# 🚀 Guide de déploiement FarmAlert IA

## Déploiement Backend (Railway)

### 1. Préparation
- Repository GitHub connecté à Railway
- Variables d'environnement configurées

### 2. Variables d'environnement Railway
```bash
PORT=8080
NODE_ENV=production
DATABASE_PATH=./database/farmalert.db
JWT_SECRET=farmalert-ia-super-secret-jwt-key-2024-production
JWT_EXPIRES_IN=7d
OPENWEATHER_API_KEY=216cc64624e339d6f32a6a4c859696b1
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
CORS_ORIGIN=https://fermalertia.netlify.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 3. Déploiement automatique
- Push sur la branche `main` déclenche le déploiement
- Build automatique avec Nixpacks
- Base de données SQLite persistante

### 4. URL de production
- **Backend** : https://farmalert-ia-production.up.railway.app
- **Health Check** : https://farmalert-ia-production.up.railway.app/health

## Déploiement Frontend (Netlify)

### 1. Préparation
- Repository GitHub connecté à Netlify
- Build settings configurés

### 2. Variables d'environnement Netlify
```bash
VITE_API_URL=https://farmalert-ia-production.up.railway.app
```

### 3. Build settings Netlify
- **Base directory** : `client`
- **Build command** : `npm run build`
- **Publish directory** : `client/dist`

### 4. Déploiement automatique
- Push sur la branche `main` déclenche le déploiement
- Build automatique avec Vite
- Redirections SPA configurées

### 5. URL de production
- **Frontend** : https://fermalertia.netlify.app

## Tests de déploiement

### Backend
```bash
# Health check
curl https://farmalert-ia-production.up.railway.app/health

# Données de démonstration
curl https://farmalert-ia-production.up.railway.app/api/demo/data

# Test d'authentification
curl -X POST https://farmalert-ia-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@farmalert.fr","password":"admin123"}'
```

### Frontend
- Accès à https://fermalertia.netlify.app
- Test de connexion avec les comptes de démonstration
- Vérification des fonctionnalités principales

## Comptes de démonstration

### Utilisateurs
- **Admin** : `admin@farmalert.fr` / `admin123`
- **Agriculteur** : `fermier@normandie.fr` / `farmer123`

### Fermes de démonstration
1. **Ferme Bio Caen** (49.1829, -0.3707) - Agriculture biologique
2. **Ferme Laitière Bayeux** (49.2764, -0.7024) - Élevage laitier  
3. **Exploitation Céréales Lisieux** (49.1439, 0.2300) - Céréales

## Monitoring et logs

### Railway
- Logs en temps réel dans le dashboard Railway
- Métriques de performance
- Monitoring des erreurs

### Netlify
- Logs de build dans le dashboard Netlify
- Analytics de performance
- Monitoring des erreurs client

## Maintenance

### Mise à jour des données météo
- Tâches cron automatiques toutes les 3 heures
- Vérification des alertes toutes les 6 heures
- Nettoyage des anciennes alertes

### Sauvegarde
- Base de données SQLite persistante sur Railway
- Données de démonstration recréées à chaque déploiement

## Sécurité

### Backend
- JWT avec expiration 7 jours
- Hashage bcrypt des mots de passe
- Rate limiting (100 req/15min)
- Headers sécurisés (Helmet)
- CORS configuré pour Netlify

### Frontend
- Variables d'environnement sécurisées
- Build optimisé et minifié
- Headers de sécurité configurés

## Support

En cas de problème :
1. Vérifier les logs Railway/Netlify
2. Tester les endpoints API
3. Vérifier les variables d'environnement
4. Contacter l'équipe de développement

---

**🌾 FarmAlert IA - Déployé et opérationnel !**