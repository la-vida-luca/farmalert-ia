# 🛠️ Guide de développement FarmAlert IA

## Prérequis

- **Node.js** 18+ 
- **npm** 9+
- **Git**
- **Compte OpenWeatherMap** (clé API fournie)

## Installation rapide

```bash
# Cloner le repository
git clone https://github.com/vidaluca77-cloud/farmalert-ia.git
cd farmalert-ia

# Installation complète
npm run install-all

# Démarrage en mode développement
npm run dev
```

## Structure du projet

```
farmalert-ia/
├── server/                 # Backend Node.js/Express
│   ├── src/
│   │   ├── config/         # Configuration DB
│   │   ├── middleware/      # Auth, validation
│   │   ├── routes/         # Routes API
│   │   ├── services/       # Services météo/alertes
│   │   ├── types/          # Types TypeScript
│   │   ├── utils/          # Utilitaires
│   │   └── index.ts        # Point d'entrée
│   ├── package.json
│   └── tsconfig.json
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants UI
│   │   ├── hooks/          # Hooks personnalisés
│   │   ├── pages/          # Pages
│   │   ├── services/       # Service API
│   │   ├── types/          # Types TypeScript
│   │   └── App.tsx         # App principale
│   ├── package.json
│   └── vite.config.ts
└── package.json            # Workspace root
```

## Commandes disponibles

### Workspace root
```bash
npm run dev          # Démarre backend + frontend
npm run build        # Build complet
npm run test         # Tests backend
npm run lint         # Lint frontend
npm run clean        # Nettoie node_modules
npm run install-all  # Installe toutes les dépendances
```

### Backend (server/)
```bash
npm run dev          # Démarre en mode développement
npm run build        # Compile TypeScript
npm run start        # Démarre en production
npm run test         # Lance les tests
npm run init-db      # Initialise la DB avec données demo
```

### Frontend (client/)
```bash
npm run dev          # Démarre Vite dev server
npm run build        # Build pour production
npm run preview      # Preview du build
npm run lint         # ESLint
npm run type-check   # Vérification TypeScript
```

## Développement

### Backend

1. **Structure des routes** :
   - `/api/auth/*` - Authentification
   - `/api/farms/*` - Gestion des fermes
   - `/api/alerts/*` - Système d'alertes
   - `/api/weather/*` - Données météo

2. **Base de données** :
   - SQLite avec tables : users, farms, weather_data, alerts
   - Initialisation automatique avec données de démonstration
   - Migrations via scripts d'initialisation

3. **Services** :
   - `WeatherService` - Intégration OpenWeatherMap
   - `AlertsEngine` - Moteur d'alertes intelligentes
   - `AuthService` - Gestion JWT

### Frontend

1. **Architecture** :
   - React 18 + TypeScript
   - Vite pour le build
   - Tailwind CSS + shadcn/ui
   - React Router pour la navigation

2. **Hooks personnalisés** :
   - `useAuth` - Gestion authentification
   - `useFarms` - Gestion des fermes
   - `useAlerts` - Gestion des alertes
   - `useWeather` - Données météo

3. **Composants** :
   - `AlertCard` - Affichage des alertes
   - `FarmCard` - Affichage des fermes
   - `WeatherCard` - Données météo
   - `WeatherIcon` - Icônes météo

## Tests

### Backend
```bash
cd server
npm test                    # Tests unitaires
npm run test -- --coverage # Avec couverture
```

### Frontend
```bash
cd client
npm run type-check         # Vérification TypeScript
npm run lint               # ESLint
```

## API Documentation

### Authentification
```bash
# Inscription
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password",
  "firstName": "John",
  "lastName": "Doe"
}

# Connexion
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### Fermes
```bash
# Liste des fermes
GET /api/farms
Authorization: Bearer <token>

# Créer une ferme
POST /api/farms
Authorization: Bearer <token>
{
  "name": "Ma Ferme",
  "latitude": 49.1829,
  "longitude": -0.3707,
  "farmType": "organic",
  "size": 50
}
```

### Alertes
```bash
# Liste des alertes
GET /api/alerts
Authorization: Bearer <token>

# Marquer comme lue
PUT /api/alerts/:id/acknowledge
Authorization: Bearer <token>
```

### Météo
```bash
# Météo actuelle
GET /api/weather/current?lat=49.1829&lon=-0.3707
Authorization: Bearer <token>

# Prévisions
GET /api/weather/forecast?lat=49.1829&lon=-0.3707
Authorization: Bearer <token>
```

## Variables d'environnement

### Backend (.env)
```bash
PORT=8080
NODE_ENV=development
DATABASE_PATH=./database/farmalert.db
JWT_SECRET=your-secret-key
OPENWEATHER_API_KEY=216cc64624e339d6f32a6a4c859696b1
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8080
```

## Débogage

### Backend
```bash
# Logs détaillés
DEBUG=* npm run dev

# Inspection de la DB
sqlite3 server/database/farmalert.db
.tables
SELECT * FROM users;
```

### Frontend
```bash
# DevTools React
npm install -g react-devtools

# Inspection réseau
# Ouvrir DevTools > Network
```

## Contribution

1. Fork le repository
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## Standards de code

### TypeScript
- Types stricts activés
- Interfaces pour tous les objets
- Pas de `any` autorisé

### React
- Composants fonctionnels avec hooks
- Props typées avec interfaces
- Gestion d'état avec hooks personnalisés

### CSS
- Tailwind CSS pour le styling
- Composants réutilisables
- Design responsive mobile-first

## Performance

### Backend
- Compression gzip activée
- Rate limiting configuré
- Cache SQLite optimisé
- Logs rotatifs

### Frontend
- Build Vite optimisé
- Code splitting automatique
- Images optimisées
- Lazy loading des composants

## Sécurité

- JWT avec expiration
- Hashage bcrypt des mots de passe
- Validation Zod sur toutes les entrées
- Headers sécurisés (Helmet)
- CORS configuré

## Monitoring

- Logs structurés avec Winston
- Health check endpoint
- Métriques de performance
- Gestion d'erreurs centralisée

---

**🌾 Happy coding avec FarmAlert IA !**