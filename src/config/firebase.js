const admin = require('firebase-admin');
const logger = require('./logger');

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  logger.info('✅ Firebase Admin SDK initialisé avec succès.');

} catch (error) {
  logger.error('Erreur lors de l\'initialisation de Firebase Admin SDK:', error.message);
  logger.warn('Le service de notification Push sera désactivé.');
}

module.exports = admin; 