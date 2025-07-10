// notification-mail-sms-service-Tadayoshi123/src/middlewares/errorHandler.js
// Gestion centralisée des erreurs pour le service de notification

const logger = require('../config/logger');

/**
 * Classe d'erreur personnalisée pour l'application
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true; // Indique que c'est une erreur attendue
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Codes d'erreur standardisés pour le service de notification
 */
const NotificationErrorCodes = {
  // Erreurs génériques
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  
  // Erreurs d'authentification
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  UNAUTHORIZED_SERVICE: 'UNAUTHORIZED_SERVICE',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Erreurs de fournisseur de service
  SMTP_ERROR: 'SMTP_ERROR',
  FIREBASE_ERROR: 'FIREBASE_ERROR',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR',

  // Erreurs liées aux templates
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_COMPILE_ERROR: 'TEMPLATE_COMPILE_ERROR',
};

/**
 * Middleware de gestion des erreurs
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Si ce n'est pas une de nos erreurs attendues (AppError), on la loggue comme une erreur serveur.
  if (!error.isOperational) {
    logger.error('Erreur non gérée interceptée:', error);
    error = new AppError(
      process.env.NODE_ENV === 'production' ? 'Une erreur interne est survenue' : err.message,
      500,
      NotificationErrorCodes.INTERNAL_ERROR
    );
  } else {
    // Pour les erreurs opérationnelles, on loggue avec un niveau 'warn'
    logger.warn(`Erreur opérationnelle: ${error.message}`, {
      code: error.errorCode,
      details: error.details,
      url: req.originalUrl,
    });
  }

  const response = {
    success: false,
    error: {
      message: error.message,
      code: error.errorCode,
      details: error.details,
    },
  };

  res.status(error.statusCode).json(response);
};

/**
 * Middleware pour gérer les routes non trouvées (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route non trouvée: ${req.method} ${req.originalUrl}`,
    404,
    NotificationErrorCodes.NOT_FOUND
  );
  next(error);
};

/**
 * Wrapper pour les gestionnaires de routes asynchrones afin de capter les erreurs.
 * @param {Function} fn - La fonction de contrôleur asynchrone.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  NotificationErrorCodes,
  errorHandler,
  notFoundHandler,
  asyncHandler,
}; 