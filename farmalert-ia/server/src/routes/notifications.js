const express = require('express');
const webpush = require('web-push');
const { run, get, all } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Configuration Web Push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@farmalert-ia.com',
  process.env.VAPID_PUBLIC_KEY || 'demo_public_key',
  process.env.VAPID_PRIVATE_KEY || 'demo_private_key'
);

// S'abonner aux notifications push
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        error: 'Données d\'abonnement invalides',
        code: 'INVALID_SUBSCRIPTION'
      });
    }

    // Vérifier si l'abonnement existe déjà
    const existingSubscription = await get(
      'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [req.user.id, subscription.endpoint]
    );

    if (existingSubscription) {
      // Mettre à jour l'abonnement existant
      await run(
        'UPDATE push_subscriptions SET p256dh = ?, auth = ?, is_active = 1 WHERE id = ?',
        [subscription.keys.p256dh, subscription.keys.auth, existingSubscription.id]
      );
    } else {
      // Créer un nouvel abonnement
      await run(
        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
        [req.user.id, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
      );
    }

    logger.info(`Abonnement push créé/mis à jour pour ${req.user.email}`);

    res.json({
      message: 'Abonnement aux notifications créé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de l\'abonnement aux notifications:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'abonnement aux notifications',
      code: 'SUBSCRIPTION_ERROR'
    });
  }
});

// Se désabonner des notifications push
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        error: 'Endpoint requis',
        code: 'ENDPOINT_REQUIRED'
      });
    }

    await run(
      'UPDATE push_subscriptions SET is_active = 0 WHERE user_id = ? AND endpoint = ?',
      [req.user.id, endpoint]
    );

    logger.info(`Désabonnement push pour ${req.user.email}`);

    res.json({
      message: 'Désabonnement des notifications réussi'
    });

  } catch (error) {
    logger.error('Erreur lors du désabonnement:', error);
    res.status(500).json({
      error: 'Erreur lors du désabonnement',
      code: 'UNSUBSCRIPTION_ERROR'
    });
  }
});

// Récupérer les clés VAPID publiques
router.get('/vapid-public-key', (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || 'demo_public_key'
  });
});

// Envoyer une notification de test
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { message = 'Test de notification FarmAlert IA' } = req.body;

    // Récupérer les abonnements actifs de l'utilisateur
    const subscriptions = await all(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND is_active = 1',
      [req.user.id]
    );

    if (subscriptions.length === 0) {
      return res.status(400).json({
        error: 'Aucun abonnement actif trouvé',
        code: 'NO_SUBSCRIPTIONS'
      });
    }

    const payload = JSON.stringify({
      title: 'FarmAlert IA - Test',
      body: message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/dashboard',
        timestamp: new Date().toISOString()
      }
    });

    const promises = subscriptions.map(subscription => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      return webpush.sendNotification(pushSubscription, payload).catch(error => {
        logger.error('Erreur envoi notification:', error);
        // Si l'abonnement est invalide, le désactiver
        if (error.statusCode === 410) {
          return run(
            'UPDATE push_subscriptions SET is_active = 0 WHERE endpoint = ?',
            [subscription.endpoint]
          );
        }
        throw error;
      });
    });

    await Promise.all(promises);

    logger.info(`Notification de test envoyée à ${subscriptions.length} appareil(s) pour ${req.user.email}`);

    res.json({
      message: `Notification de test envoyée à ${subscriptions.length} appareil(s)`,
      count: subscriptions.length
    });

  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la notification de test:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi de la notification de test',
      code: 'TEST_NOTIFICATION_ERROR'
    });
  }
});

// Récupérer l'historique des notifications
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // Pour l'instant, on retourne les alertes récentes comme historique de notifications
    const notifications = await all(
      `SELECT a.id, a.type, a.severity, a.title, a.message, a.created_at,
              f.name as farm_name
       FROM alerts a
       JOIN farms f ON a.farm_id = f.id
       WHERE f.user_id = ? AND a.is_active = 1
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: 'alert',
      severity: notification.severity,
      title: notification.title,
      message: notification.message,
      farmName: notification.farm_name,
      timestamp: notification.created_at,
      read: false // Pour l'instant, on considère que les alertes sont les notifications
    }));

    res.json({
      notifications: formattedNotifications,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: formattedNotifications.length
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique des notifications:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de l\'historique des notifications',
      code: 'NOTIFICATION_HISTORY_ERROR'
    });
  }
});

// Fonction utilitaire pour envoyer des notifications push
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const subscriptions = await all(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    if (subscriptions.length === 0) {
      logger.info(`Aucun abonnement actif pour l'utilisateur ${userId}`);
      return;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        url: '/dashboard',
        timestamp: new Date().toISOString(),
        ...data
      }
    });

    const promises = subscriptions.map(subscription => {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      };

      return webpush.sendNotification(pushSubscription, payload).catch(error => {
        logger.error('Erreur envoi notification push:', error);
        // Si l'abonnement est invalide, le désactiver
        if (error.statusCode === 410) {
          return run(
            'UPDATE push_subscriptions SET is_active = 0 WHERE endpoint = ?',
            [subscription.endpoint]
          );
        }
        return null; // Ignorer les autres erreurs
      });
    });

    await Promise.all(promises);
    logger.info(`Notification push envoyée à ${subscriptions.length} appareil(s) pour l'utilisateur ${userId}`);

  } catch (error) {
    logger.error('Erreur lors de l\'envoi de notification push:', error);
  }
}

// Fonction pour envoyer une notification d'alerte météo
async function sendWeatherAlertNotification(userId, alert) {
  const severityEmojis = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  };

  const typeEmojis = {
    frost: '❄️',
    drought: '🌵',
    heavy_rain: '🌧️',
    disease_risk: '🦠',
    pest_risk: '🐛',
    wind: '💨',
    hail: '🧊',
    custom: '⚠️'
  };

  const emoji = typeEmojis[alert.type] || '⚠️';
  const severityEmoji = severityEmojis[alert.severity] || '⚠️';

  await sendPushNotification(
    userId,
    `${emoji} ${alert.title}`,
    `${severityEmoji} ${alert.message}`,
    {
      alertId: alert.id,
      type: 'weather_alert',
      severity: alert.severity
    }
  );
}

// Fonction pour envoyer une notification de signalement communautaire
async function sendCommunityReportNotification(userId, report) {
  await sendPushNotification(
    userId,
    '📢 Nouveau signalement communautaire',
    `${report.title} - ${report.farm_name}`,
    {
      reportId: report.id,
      type: 'community_report',
      reportType: report.report_type
    }
  );
}

module.exports = {
  router,
  sendPushNotification,
  sendWeatherAlertNotification,
  sendCommunityReportNotification
};