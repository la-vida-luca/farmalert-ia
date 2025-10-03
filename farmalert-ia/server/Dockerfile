# Dockerfile pour le backend FarmAlert IA
FROM node:18-alpine

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p database logs

# Compiler TypeScript
RUN npm run build

# Exposer le port
EXPOSE 8080

# Commande de démarrage
CMD ["npm", "start"]