const pinoHttp = require('pino-http');
const logger = require('../config/logger');
const crypto = require('crypto');
const pino = require('pino');

const loggerMiddleware = pinoHttp({
  logger,

  // Génère un ID unique pour chaque requête
  genReqId: function (req, res) {
    const existingId = req.id ?? req.headers["x-request-id"];
    if (existingId) return existingId;
    const id = crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },

  // Personnalisation des logs pour inclure le corps de la requête.
  // Cela remplace l'ancienne implémentation qui était moins fiable.
  serializers: {
    req: (req) => {
      // Utilise le serializer standard de Pino pour la requête de base
      const standardReq = pino.stdSerializers.req(req.raw);
      // Ajoute le corps de la requête au log, s'il existe
      if (req.raw.body) {
        standardReq.body = req.raw.body;
      }
      return standardReq;
    },
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return 'warn'
    } else if (res.statusCode >= 500 || err) {
      return 'error'
    }
    return 'info'
  },
  customSuccessMessage: function (req, res) {
    if (res.statusCode === 404) {
      return `Resource not found`
    }
    return `${req.method} ${req.url} completed`
  },
});

module.exports = loggerMiddleware; 