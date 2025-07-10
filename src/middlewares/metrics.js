const promClient = require('prom-client');
const logger = require('../config/logger');

const register = new promClient.Registry();

// Préfixe pour toutes les métriques de ce service
const prefix = 'notification_service_';

// Métriques par défaut (CPU, mémoire, etc.)
promClient.collectDefaultMetrics({ register, prefix });

// Métrique pour le nombre total de requêtes HTTP
const httpRequestCounter = new promClient.Counter({
  name: prefix + 'http_requests_total',
  help: 'Nombre total de requêtes HTTP reçues',
  labelNames: ['method', 'route', 'code'],
});
register.registerMetric(httpRequestCounter);

// Métrique pour la durée des requêtes HTTP
const httpRequestDurationHistogram = new promClient.Histogram({
  name: prefix + 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'code'],
  buckets: promClient.exponentialBuckets(0.001, 2, 15), // Buckets de 1ms à ~16s
});
register.registerMetric(httpRequestDurationHistogram);

// Métrique personnalisée pour le nombre total de notifications envoyées
const notificationsSentCounter = new promClient.Counter({
  name: prefix + 'sent_total',
  help: 'Nombre total de notifications envoyées',
  labelNames: ['type', 'status', 'template'], // type: email|push|ws, status: success|failure, template: accountConfirmation|...|N/A
});
register.registerMetric(notificationsSentCounter);

/**
 * Middleware pour mesurer les requêtes HTTP.
 */
const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDurationHistogram.startTimer();

  res.on('finish', () => {
    // Utilise req.route.path si disponible pour normaliser les URLs (ex: /users/:id)
    const route = req.route ? req.route.path : req.path;
    const code = res.statusCode;
    
    httpRequestCounter.inc({ route, method: req.method, code });
    end({ route, method: req.method, code });
  });

  next();
};

/**
 * Endpoint pour exposer les métriques au format Prometheus.
 */
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    logger.error('Erreur lors de la récupération des métriques Prometheus', ex);
    res.status(500).end(ex);
  }
};

/**
 * Incrémente le compteur de notifications envoyées.
 * @param {'email' | 'push' | 'ws'} type - Le type de notification.
 * @param {'success' | 'failure'} status - Le statut de l'envoi.
 * @param {object} [options={}] - Options supplémentaires.
 * @param {string} [options.template='N/A'] - Le template utilisé (pour les e-mails) ou le topic (pour le push).
 * @param {number} [options.count=1] - Le nombre de notifications à incrémenter.
 */
const incrementNotificationsSent = (type, status, options = {}) => {
  const { template = 'N/A', count = 1 } = options;
  notificationsSentCounter.inc({ type, status, template }, count);
};

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  incrementNotificationsSent,
}; 