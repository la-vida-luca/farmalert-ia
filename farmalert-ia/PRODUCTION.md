# 🚀 Configuration Production FarmAlert IA

## URLs de production

- **Frontend** : https://fermalertia.netlify.app
- **Backend** : https://farmalert-ia-production.up.railway.app
- **Health Check** : https://farmalert-ia-production.up.railway.app/health

## Comptes de démonstration

### Utilisateurs
- **Admin** : `admin@farmalert.fr` / `admin123`
- **Agriculteur** : `fermier@normandie.fr` / `farmer123`

### Fermes de démonstration
1. **Ferme Bio Caen** (49.1829, -0.3707) - Agriculture biologique
2. **Ferme Laitière Bayeux** (49.2764, -0.7024) - Élevage laitier
3. **Exploitation Céréales Lisieux** (49.1439, 0.2300) - Céréales

## Fonctionnalités disponibles

### ✅ Authentification
- Inscription/Connexion sécurisée
- Gestion des profils utilisateurs
- Rôles admin/agriculteur

### ✅ Gestion des fermes
- Ajout/modification/suppression de fermes
- Coordonnées GPS précises
- Types de fermes multiples
- Informations détaillées

### ✅ Surveillance météo
- Données météo temps réel (OpenWeatherMap)
- Prévisions 5 jours
- Historique des conditions
- Graphiques et visualisations

### ✅ Système d'alertes intelligentes
- **Risque de gelée** : Température < 2°C
- **Sécheresse** : Humidité < 40% et température > 25°C
- **Maladies fongiques** : Température 15-25°C et humidité > 85%
- **Pluie excessive** : Précipitations > 20mm/24h
- **Vents forts** : Vitesse > 15 m/s
- **Vague de chaleur** : Température > 35°C

### ✅ Tableau de bord
- Vue d'ensemble des fermes et alertes
- Statistiques en temps réel
- Alertes critiques prioritaires
- Interface responsive

## Architecture technique

### Backend (Railway)
- **Node.js 18** + Express + TypeScript
- **Base SQLite** avec tables relationnelles
- **JWT** authentification avec bcrypt
- **OpenWeatherMap API** intégration
- **Cron jobs** pour mise à jour automatique
- **Logs structurés** avec Winston

### Frontend (Netlify)
- **React 18** + TypeScript + Vite
- **Tailwind CSS** + shadcn/ui
- **React Router** navigation
- **Hooks personnalisés** state management
- **Responsive design** mobile-first

## Sécurité

### Authentification
- JWT avec expiration 7 jours
- Hashage bcrypt des mots de passe
- Validation Zod sur toutes les entrées

### API
- Rate limiting (100 req/15min)
- Headers sécurisés (Helmet)
- CORS configuré pour Netlify
- Validation des coordonnées GPS

### Frontend
- Variables d'environnement sécurisées
- Build optimisé et minifié
- Headers de sécurité configurés

## Performance

### Backend
- Compression gzip activée
- Cache SQLite optimisé
- Logs rotatifs
- Monitoring des erreurs

### Frontend
- Build Vite optimisé
- Code splitting automatique
- Assets optimisés
- Lazy loading

## Monitoring

### Tâches automatiques
- **Mise à jour météo** : Toutes les 3 heures
- **Vérification alertes** : Toutes les 6 heures
- **Nettoyage alertes** : Suppression après 7 jours

### Logs
- Logs structurés avec Winston
- Rotation automatique
- Monitoring des erreurs
- Métriques de performance

## Tests de production

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
- Test responsive sur mobile/tablet/desktop

## Maintenance

### Mise à jour des données
- Données météo mises à jour automatiquement
- Alertes générées en temps réel
- Base de données persistante

### Sauvegarde
- Base SQLite persistante sur Railway
- Données de démonstration recréées à chaque déploiement
- Configuration versionnée dans Git

## Support

### En cas de problème
1. Vérifier les logs Railway/Netlify
2. Tester les endpoints API
3. Vérifier les variables d'environnement
4. Contacter l'équipe de développement

### Contact
- 📧 Email : support@farmalert.fr
- 🐛 Issues : GitHub Issues
- 📖 Documentation : README.md

## Évolutions futures

- [ ] **Notifications push** web
- [ ] **API mobile** React Native
- [ ] **Machine Learning** pour prédictions
- [ ] **Intégration IoT** capteurs
- [ ] **Export données** PDF/Excel
- [ ] **Chat communautaire** agriculteurs
- [ ] **Météo satellite** haute résolution
- [ ] **Recommandations IA** personnalisées

---

**🌾 FarmAlert IA - Production Ready & Operational !**