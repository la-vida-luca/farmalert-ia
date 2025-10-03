// Configuration des tests Jest
import dotenv from 'dotenv';

// Charger les variables d'environnement pour les tests
dotenv.config({ path: '.env.test' });

// Configuration globale des tests
beforeAll(async () => {
  // Configuration initiale si nécessaire
});

afterAll(async () => {
  // Nettoyage après tous les tests
});

beforeEach(() => {
  // Configuration avant chaque test
});

afterEach(() => {
  // Nettoyage après chaque test
});