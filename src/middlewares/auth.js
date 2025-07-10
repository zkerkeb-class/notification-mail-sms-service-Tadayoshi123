// notification-mail-sms-service-Tadayoshi123/src/middlewares/auth.js
// Middleware d'authentification pour le service de notification

const jwt = require('jsonwebtoken');
const { AppError, NotificationErrorCodes } = require('./errorHandler');

/**
 * Middleware d'authentification JWT pour les services.
 * Vérifie que la requête provient d'un service autorisé via un token JWT.
 */
const authenticateService = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token d\'authentification manquant ou mal formé', 401, NotificationErrorCodes.MISSING_TOKEN);
    }
    
    const token = authHeader.substring(7); // Retire "Bearer "
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const allowedServices = process.env.ALLOWED_SERVICES?.split(',') || [];
    const serviceId = decoded.serviceId || decoded.iss;
    
    if (!allowedServices.includes(serviceId)) {
      throw new AppError(`Service '${serviceId}' non autorisé`, 403, NotificationErrorCodes.UNAUTHORIZED_SERVICE);
    }
    
    // Ajoute les informations du service authentifié à la requête
    req.service = {
      id: serviceId,
      name: decoded.serviceName || serviceId,
      permissions: decoded.permissions || [],
      userId: decoded.userId, // ID de l'utilisateur à l'origine de l'action dans le service appelant
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Token JWT invalide', 401, NotificationErrorCodes.INVALID_TOKEN));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token JWT expiré', 401, NotificationErrorCodes.EXPIRED_TOKEN));
    }
    next(error);
  }
};

/**
 * Middleware pour exiger des permissions spécifiques du service appelant.
 * @param {string|string[]} requiredPermissions - La ou les permission(s) requise(s).
 */
const requirePermissions = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.service?.permissions) {
      return next(new AppError('Permissions non trouvées dans le token', 401, NotificationErrorCodes.AUTHENTICATION_REQUIRED));
    }
    
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    const hasPermission = permissions.some(p => 
      req.service.permissions.includes(p) || req.service.permissions.includes('*')
    );
    
    if (!hasPermission) {
      return next(new AppError(
        `Permissions insuffisantes. Requis: ${permissions.join(' ou ')}`, 
        403, 
        NotificationErrorCodes.INSUFFICIENT_PERMISSIONS
      ));
    }
    
    next();
  };
};

module.exports = {
  authenticateService,
  requirePermissions,
}; 