# 🌾 FarmAlert IA

**Plateforme collaborative d'alertes météo intelligentes pour agriculteurs normands**

FarmAlert IA est une application web complète qui permet aux agriculteurs de surveiller les conditions météorologiques de leurs fermes en temps réel et de recevoir des alertes intelligentes pour protéger leurs cultures.

## 🚀 Fonctionnalités

### 🔐 Authentification sécurisée
- Inscription et connexion avec JWT
- Gestion des profils utilisateurs
- Rôles administrateur et agriculteur

### 🏡 Gestion des fermes
- Ajout et gestion de plusieurs fermes par utilisateur
- Coordonnées GPS précises
- Types de fermes : céréales, laitier, biologique, élevage, légumes, fruits
- Informations détaillées (taille, adresse, région)

### 🌤️ Surveillance météo en temps réel
- Intégration avec l'API OpenWeatherMap
- Données météo actuelles et prévisions
- Historique des conditions météorologiques
- Graphiques et visualisations

### 🚨 Système d'alertes intelligentes
- **Risque de gelée** : Température < 2°C
- **Sécheresse** : Humidité < 40% et température > 25°C
- **Maladies fongiques** : Température 15-25°C et humidité > 85%
- **Pluie excessive** : Précipitations > 20mm/24h
- **Vents forts** : Vitesse > 15 m/s
- **Vague de chaleur** : Température > 35°C

### 📊 Tableau de bord complet
- Vue d'ensemble des fermes et alertes
- Statistiques en temps réel
- Alertes critiques prioritaires
- Interface responsive et intuitive

## 🏗️ Architecture technique

### Backend (Node.js + TypeScript)
- **Framework** : Express.js avec TypeScript
- **Base de données** : SQLite avec tables relationnelles
- **Authentification** : JWT avec bcrypt
- **API météo** : Intégration OpenWeatherMap
- **Sécurité** : Helmet, CORS, rate limiting
- **Logging** : Winston avec rotation des logs
- **Tâches automatiques** : Cron jobs pour mise à jour météo

### Frontend (React + TypeScript)
- **Framework** : React 18 avec TypeScript
- **Build tool** : Vite
- **Styling** : Tailwind CSS + shadcn/ui
- **State management** : Hooks personnalisés
- **Routing** : React Router v6
- **Forms** : React Hook Form + Zod validation
- **Notifications** : React Toastify

## 📁 Structure du projet

```
farmalert-ia/
├── server/                 # Backend Node.js/Express
│   ├── src/
│   │   ├── config/         # Configuration base de données
│   │   ├── middleware/     # Authentification, validation
│   │   ├── routes/         # Routes API (auth, farms, alerts, weather)
│   │   ├── services/       # Services météo et alertes
│   │   ├── types/          # Types TypeScript
│   │   ├── utils/          # Utilitaires (logger, init DB)
│   │   └── index.ts        # Point d'entrée serveur
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants UI réutilisables
│   │   ├── hooks/          # Hooks personnalisés
│   │   ├── pages/          # Pages de l'application
│   │   ├── services/       # Service API
│   │   ├── types/          # Types TypeScript
│   │   ├── lib/            # Utilitaires
│   │   ├── App.tsx         # Composant principal
│   │   └── main.tsx       # Point d'entrée
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── netlify.toml
└── README.md
```

## 🚀 Installation et déploiement

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte OpenWeatherMap (clé API fournie)

### Installation locale

1. **Cloner le repository**
```bash
git clone https://github.com/vidaluca77-cloud/farmalert-ia.git
cd farmalert-ia
```

2. **Installer les dépendances backend**
```bash
cd server
npm install
```

3. **Installer les dépendances frontend**
```bash
cd ../client
npm install
```

4. **Configuration des variables d'environnement**
```bash
# Backend
cd ../server
cp .env.example .env
# Modifier les valeurs dans .env si nécessaire

# Frontend
cd ../client
cp .env.example .env
# Modifier VITE_API_URL si nécessaire
```

5. **Initialiser la base de données**
```bash
cd ../server
npm run init-db
```

6. **Démarrer les serveurs**
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

L'application sera accessible sur :
- Frontend : http://localhost:3000
- Backend : http://localhost:8080

### Déploiement production

#### Backend (Railway)
1. Connecter le repository GitHub à Railway
2. Configurer les variables d'environnement :
   - `PORT=8080`
   - `NODE_ENV=production`
   - `JWT_SECRET=your-secret-key`
   - `OPENWEATHER_API_KEY=216cc64624e339d6f32a6a4c859696b1`
   - `CORS_ORIGIN=https://fermalertia.netlify.app`

#### Frontend (Netlify)
1. Connecter le repository GitHub à Netlify
2. Configurer les variables d'environnement :
   - `VITE_API_URL=https://farmalert-ia-production.up.railway.app`
3. Le build se fait automatiquement avec Vite

## 🎯 Comptes de démonstration

L'application inclut des données de démonstration :

### Utilisateurs
- **Admin** : `admin@farmalert.fr` / `admin123`
- **Agriculteur** : `fermier@normandie.fr` / `farmer123`

### Fermes de démonstration
1. **Ferme Bio Caen** (49.1829, -0.3707) - Agriculture biologique
2. **Ferme Laitière Bayeux** (49.2764, -0.7024) - Élevage laitier
3. **Exploitation Céréales Lisieux** (49.1439, 0.2300) - Céréales

### Alertes de démonstration
- 5 alertes avec différents types et niveaux de gravité
- Données météo historiques sur 24 heures
- Recommandations personnalisées par type d'alerte

## 🔧 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur
- `PUT /api/auth/profile` - Mise à jour profil
- `PUT /api/auth/password` - Changement mot de passe

### Fermes
- `GET /api/farms` - Liste des fermes
- `POST /api/farms` - Créer une ferme
- `GET /api/farms/:id` - Détails d'une ferme
- `PUT /api/farms/:id` - Mettre à jour une ferme
- `DELETE /api/farms/:id` - Supprimer une ferme
- `GET /api/farms/:id/weather` - Météo d'une ferme
- `GET /api/farms/:id/forecast` - Prévisions d'une ferme

### Alertes
- `GET /api/alerts` - Liste des alertes
- `GET /api/alerts/active` - Alertes actives
- `GET /api/alerts/:id` - Détails d'une alerte
- `PUT /api/alerts/:id/acknowledge` - Marquer comme lue
- `GET /api/alerts/stats/summary` - Statistiques

### Météo
- `GET /api/weather/current` - Météo actuelle
- `GET /api/weather/forecast` - Prévisions
- `GET /api/weather/optimal-conditions/:cropType` - Conditions optimales

## 🛡️ Sécurité

- **Authentification JWT** avec expiration 7 jours
- **Hashage bcrypt** des mots de passe
- **Validation Zod** sur toutes les entrées
- **Rate limiting** API (100 req/15min)
- **Headers sécurisés** (Helmet)
- **CORS** configuré pour Netlify
- **Validation des coordonnées GPS**

## 📱 Responsive Design

L'application est entièrement responsive et optimisée pour :
- 📱 Mobile (320px+)
- 📱 Tablette (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1440px+)

## 🎨 Design System

### Couleurs
- **Vert agriculture** : #22c55e (FarmAlert)
- **Bleu météo** : #3b82f6 (Weather)
- **Orange alerte** : #f97316 (Alert)
- **Rouge critique** : #ef4444 (Critical)

### Typographie
- **Police** : Inter (Google Fonts)
- **Tailles** : 12px à 48px
- **Poids** : 300 à 700

### Composants
- **Cartes** : Border radius 8px, shadow subtile
- **Boutons** : Gradients, hover effects
- **Alertes** : Border gauche colorée, badges
- **Icônes** : Lucide React + emojis météo

## 🔄 Tâches automatiques

### Cron Jobs
- **Mise à jour météo** : Toutes les 3 heures
- **Vérification alertes** : Toutes les 6 heures
- **Nettoyage alertes** : Suppression après 7 jours

### Monitoring
- **Logs structurés** avec Winston
- **Health check** endpoint
- **Gestion d'erreurs** centralisée

## 🚀 Performance

### Backend
- **Compression gzip** activée
- **Cache SQLite** optimisé
- **Rate limiting** intelligent
- **Logs rotatifs**

### Frontend
- **Vite** build optimisé
- **Code splitting** automatique
- **Tree shaking** activé
- **Assets optimisés**

## 📈 Évolutions futures

- [ ] **Notifications push** web
- [ ] **API mobile** React Native
- [ ] **Machine Learning** pour prédictions
- [ ] **Intégration IoT** capteurs
- [ ] **Export données** PDF/Excel
- [ ] **Chat communautaire** agriculteurs
- [ ] **Météo satellite** haute résolution
- [ ] **Recommandations IA** personnalisées

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Équipe

- **Développement** : FarmAlert IA Team
- **Design** : Interface moderne et intuitive
- **API** : OpenWeatherMap
- **Hébergement** : Railway + Netlify

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@farmalert.fr
- 🐛 Issues : GitHub Issues
- 📖 Documentation : README.md

---

**🌾 FarmAlert IA - L'intelligence météo au service de l'agriculture normande**