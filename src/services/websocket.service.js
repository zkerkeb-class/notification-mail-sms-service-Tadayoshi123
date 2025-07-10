const logger = require('../config/logger');
const { incrementNotificationsSent } = require('../middlewares/metrics');

class WebSocketService {
  constructor(io) {
    if (!io) {
      throw new Error('Socket.IO instance is required for WebSocketService.');
    }
    this.io = io;
    logger.info('✅ WebSocketService initialisé.');
  }

  /**
   * Diffuse un message à tous les clients connectés.
   * @param {string} eventName - Le nom de l'événement.
   * @param {object} data - Les données à envoyer.
   */
  broadcast(eventName, data, requestId) {
    const logMeta = { eventName, target: 'all', requestId };
    logger.info(logMeta, `Diffusion de l'événement WebSocket.`);
    this.io.emit(eventName, data);
    incrementNotificationsSent('ws', 'success', { template: `broadcast:${eventName}` });
  }

  /**
   * Envoie un message à une room spécifique.
   * @param {string} room - Le nom de la room (ex: un userId).
   * @param {string} eventName - Le nom de l'événement.
   * @param {object} data - Les données à envoyer.
   */
  emitToRoom(room, eventName, data, requestId) {
    const logMeta = { room, eventName, requestId };
    logger.info(logMeta, `Émission de l'événement WebSocket à la room.`);
    this.io.to(room).emit(eventName, data);
    incrementNotificationsSent('ws', 'success', { template: `emit:${eventName}` });
  }

  /**
   * Envoie une notification de type "toast" à un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur (utilisé comme nom de room).
   * @param {object} toastData - Les données pour le toast.
   * @param {'info'|'success'|'warning'|'error'} toastData.type - Le type de toast.
   * @param {string} toastData.message - Le message à afficher.
   */
  sendToastToUser(userId, toastData, requestId) {
    this.emitToRoom(userId, 'new_toast', toastData, requestId);
  }

   /**
   * Notifie une mise à jour des métriques.
   * @param {string} userId - L'ID de l'utilisateur (ou 'global' pour tous).
   * @param {object} metricsData - Les nouvelles données de métriques.
   */
  sendMetricsUpdate(userId, metricsData, requestId) {
    const room = userId || 'metrics_dashboard'; // Room globale ou par utilisateur
    this.emitToRoom(room, 'metrics_update', metricsData, requestId);
  }
}

module.exports = WebSocketService; 