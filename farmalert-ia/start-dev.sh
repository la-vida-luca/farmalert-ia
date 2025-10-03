#!/bin/bash

# Script de démarrage pour le développement local FarmAlert IA
echo "🌾 Démarrage de FarmAlert IA en mode développement"
echo "=================================================="

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js 18+"
    exit 1
fi

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez installer npm"
    exit 1
fi

echo "✅ Node.js et npm détectés"

# Installer les dépendances du backend
echo "📦 Installation des dépendances backend..."
cd server
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de l'installation des dépendances backend"
        exit 1
    fi
fi
echo "✅ Dépendances backend installées"

# Initialiser la base de données
echo "🗄️ Initialisation de la base de données..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'initialisation de la base de données"
    exit 1
fi
echo "✅ Base de données initialisée"

# Démarrer le serveur backend en arrière-plan
echo "🚀 Démarrage du serveur backend..."
npm run dev &
BACKEND_PID=$!
echo "✅ Serveur backend démarré (PID: $BACKEND_PID)"

# Attendre que le serveur backend soit prêt
echo "⏳ Attente du démarrage du serveur backend..."
sleep 5

# Vérifier que le serveur backend fonctionne
if curl -s http://localhost:8080/health > /dev/null; then
    echo "✅ Serveur backend opérationnel"
else
    echo "❌ Serveur backend non accessible"
    kill $BACKEND_PID
    exit 1
fi

# Installer les dépendances du frontend
echo "📦 Installation des dépendances frontend..."
cd ../client
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de l'installation des dépendances frontend"
        kill $BACKEND_PID
        exit 1
    fi
fi
echo "✅ Dépendances frontend installées"

# Démarrer le serveur frontend
echo "🚀 Démarrage du serveur frontend..."
npm run dev &
FRONTEND_PID=$!
echo "✅ Serveur frontend démarré (PID: $FRONTEND_PID)"

echo ""
echo "🎉 FarmAlert IA est maintenant en cours d'exécution !"
echo "=================================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:8080"
echo "📊 Health:   http://localhost:8080/health"
echo ""
echo "👤 Comptes de démonstration:"
echo "   Admin:     admin@farmalert.fr / admin123"
echo "   Agriculteur: fermier@normandie.fr / farmer123"
echo ""
echo "🛑 Pour arrêter les serveurs, appuyez sur Ctrl+C"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🛑 Arrêt des serveurs..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Serveurs arrêtés"
    exit 0
}

# Capturer Ctrl+C
trap cleanup SIGINT

# Attendre indéfiniment
wait