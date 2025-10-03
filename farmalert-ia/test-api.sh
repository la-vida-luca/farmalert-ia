#!/bin/bash

# Script de test pour l'API FarmAlert IA
# Usage: ./test-api.sh [URL_BASE]

BASE_URL=${1:-"http://localhost:8080"}
echo "🧪 Test de l'API FarmAlert IA sur $BASE_URL"
echo "================================================"

# Test 1: Health check
echo "1. Test du health check..."
curl -s "$BASE_URL/health" | jq '.' || echo "❌ Health check échoué"
echo ""

# Test 2: Données de démonstration
echo "2. Test des données de démonstration..."
curl -s "$BASE_URL/api/demo/data" | jq '.message' || echo "❌ Données de démonstration échouées"
echo ""

# Test 3: Inscription
echo "3. Test d'inscription..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "User"
  }')

if echo "$REGISTER_RESPONSE" | jq -e '.token' > /dev/null; then
  echo "✅ Inscription réussie"
  TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
else
  echo "❌ Inscription échouée"
  echo "$REGISTER_RESPONSE"
fi
echo ""

# Test 4: Connexion
echo "4. Test de connexion..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@farmalert.fr",
    "password": "admin123"
  }')

if echo "$LOGIN_RESPONSE" | jq -e '.token' > /dev/null; then
  echo "✅ Connexion réussie"
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
else
  echo "❌ Connexion échouée"
  echo "$LOGIN_RESPONSE"
fi
echo ""

# Test 5: Profil utilisateur
echo "5. Test du profil utilisateur..."
PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/auth/profile")
if echo "$PROFILE_RESPONSE" | jq -e '.user' > /dev/null; then
  echo "✅ Profil récupéré"
  echo "$PROFILE_RESPONSE" | jq '.user.email'
else
  echo "❌ Profil échoué"
fi
echo ""

# Test 6: Liste des fermes
echo "6. Test de la liste des fermes..."
FARMS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/farms")
if echo "$FARMS_RESPONSE" | jq -e '.farms' > /dev/null; then
  echo "✅ Fermes récupérées"
  echo "$FARMS_RESPONSE" | jq '.farms | length'
else
  echo "❌ Fermes échouées"
fi
echo ""

# Test 7: Liste des alertes
echo "7. Test de la liste des alertes..."
ALERTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/alerts")
if echo "$ALERTS_RESPONSE" | jq -e '.alerts' > /dev/null; then
  echo "✅ Alertes récupérées"
  echo "$ALERTS_RESPONSE" | jq '.alerts | length'
else
  echo "❌ Alertes échouées"
fi
echo ""

# Test 8: Météo actuelle
echo "8. Test de la météo actuelle..."
WEATHER_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/weather/current?lat=49.1829&lon=-0.3707")
if echo "$WEATHER_RESPONSE" | jq -e '.weather' > /dev/null; then
  echo "✅ Météo récupérée"
  echo "$WEATHER_RESPONSE" | jq '.weather.temperature'
else
  echo "❌ Météo échouée"
fi
echo ""

echo "🏁 Tests terminés !"
echo "==================="