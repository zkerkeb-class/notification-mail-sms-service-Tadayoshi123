const admin = require('../config/firebase');
const logger = require('../config/logger');
const { incrementNotificationsSent } = require('../middlewares/metrics');

class PushNotificationService {
  /**
   * Envoie une notification push à un ou plusieurs appareils.
   * @param {string|string[]} tokens - Le(s) token(s) d'enregistrement FCM des appareils.
   * @param {object} payload - Le contenu de la notification.
   * @param {string} payload.title - Le titre de la notification.
   * @param {string} payload.body - Le corps du message.
   * @param {string} [payload.data] - Données supplémentaires à envoyer avec le message.
   * @param {string} requestId - L'ID de la requête associée à cette notification.
   * @returns {Promise<object>} La réponse de FCM.
   */
  async sendToDevice(tokens, payload, requestId) {
    const logMeta = {
      tokenCount: Array.isArray(tokens) ? tokens.length : 1,
      requestId,
    };

    if (!admin.apps.length) {
      logger.warn(logMeta, 'Firebase non initialisé, impossible d\'envoyer une notification push.');
      incrementNotificationsSent('push', 'failure', { count: logMeta.tokenCount });
      return null;
    }

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      token: Array.isArray(tokens) ? undefined : tokens, // `token` pour un seul, `tokens` pour plusieurs
      tokens: Array.isArray(tokens) ? tokens : undefined,
    };

    logger.info(logMeta, `Envoi d'une notification push.`);

    try {
      if (Array.isArray(tokens) && tokens.length > 0) {
        const response = await admin.messaging().sendEachForMulticast(message);
        logger.info({ ...logMeta, successCount: response.successCount, failureCount: response.failureCount }, `Rapport d'envoi multicast.`);
        if (response.successCount > 0) {
          incrementNotificationsSent('push', 'success', { count: response.successCount });
        }
        if (response.failureCount > 0) {
          logger.warn({ ...logMeta, failureCount: response.failureCount }, `Rapport d'envoi multicast. ${response.failureCount} notifications push ont échoué.`);
          incrementNotificationsSent('push', 'failure', { count: response.failureCount });
          // Loguer les erreurs détaillées si nécessaire
        }
        return response;
      } else if (typeof tokens === 'string') {
        const response = await admin.messaging().send(message);
        logger.info({ ...logMeta, messageId: response }, `Notification push unique envoyée avec succès.`);
        incrementNotificationsSent('push', 'success');
        return response;
      }
    } catch (error) {
      logger.error({ ...logMeta, error: error.message, stack: error.stack }, 'Erreur lors de l\'envoi de la notification push:');
      incrementNotificationsSent('push', 'failure', { count: logMeta.tokenCount });
      return null;
    }
  }

  /**
   * Envoie une notification à un sujet (topic).
   * @param {string} topic - Le nom du sujet.
   * @param {object} payload - Le contenu de la notification.
   * @param {string} requestId - L'ID de la requête associée à cette notification.
   * @returns {Promise<string>} L'ID du message de la réponse FCM.
   */
  async sendToTopic(topic, payload, requestId) {
    const logMeta = { topic, requestId };
    if (!admin.apps.length) {
      logger.warn(logMeta, 'Firebase non initialisé, impossible d\'envoyer à un topic.');
      incrementNotificationsSent('push', 'failure', { template: topic });
      return null;
    }

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      topic: topic,
    };

    logger.info(logMeta, `Envoi d'une notification push au topic.`);

    try {
      const response = await admin.messaging().send(message);
      logger.info({ ...logMeta, messageId: response }, `Notification au topic envoyée avec succès.`);
      incrementNotificationsSent('push', 'success', { template: topic });
      return response;
    } catch (error) {
      logger.error({ ...logMeta, error: error.message, stack: error.stack }, `Erreur lors de l'envoi au topic.`);
      incrementNotificationsSent('push', 'failure', { template: topic });
      return null;
    }
  }

  /**
   * Abonne des appareils à un sujet.
   * @param {string|string[]} tokens - Le(s) token(s) d'enregistrement FCM.
   * @param {string} topic - Le nom du sujet.
   * @returns {Promise<object>} La réponse de FCM.
   */
  async subscribeToTopic(tokens, topic) {
     if (!admin.apps.length) {
      logger.warn('Firebase non initialisé, impossible de s\'abonner à un topic.');
      return null;
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info(`${Array.isArray(tokens) ? tokens.length : 1} appareil(s) abonnés au topic ${topic}.`);
      return response;
    } catch (error) {
      logger.error(`Erreur lors de l'abonnement au topic ${topic}:`, error);
      return null;
    }
  }

  /**
   * Désabonne des appareils d'un sujet.
   * @param {string|string[]} tokens - Le(s) token(s) d'enregistrement FCM.
   * @param {string} topic - Le nom du sujet.
   * @returns {Promise<object>} La réponse de FCM.
   */
  async unsubscribeFromTopic(tokens, topic) {
     if (!admin.apps.length) {
      logger.warn('Firebase non initialisé, impossible de se désabonner d\'un topic.');
      return null;
    }

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info(`${Array.isArray(tokens) ? tokens.length : 1} appareil(s) désabonnés du topic ${topic}.`);
      return response;
    } catch (error) {
      logger.error(`Erreur lors du désabonnement du topic ${topic}:`, error);
      return null;
    }
  }
}

module.exports = new PushNotificationService(); 