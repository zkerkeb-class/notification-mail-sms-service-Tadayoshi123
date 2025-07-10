const transporter = require('../config/mailer');
const firebaseAdmin = require('../config/firebase');

class HealthController {
  /**
   * Vérifie l'état de santé global du service et de ses dépendances.
   */
  check = async (req, res) => {
    const checks = {
      server: {
        status: 'ok',
        message: 'Le serveur Express est en cours d\'exécution.',
      },
      smtp: {
        status: 'down',
        message: 'Non vérifié',
      },
      firebase: {
        status: 'down',
        message: 'Non vérifié',
      },
    };
    
    let isHealthy = true;
    let httpStatus = 200;

    // 1. Vérification SMTP
    try {
      await transporter.verify();
      checks.smtp.status = 'ok';
      checks.smtp.message = 'La connexion au serveur SMTP est réussie.';
    } catch (error) {
      isHealthy = false;
      checks.smtp.status = 'error';
      checks.smtp.message = 'Impossible de se connecter au serveur SMTP.';
      checks.smtp.details = error.message;
    }

    // 2. Vérification Firebase
    if (firebaseAdmin.apps.length > 0) {
      checks.firebase.status = 'ok';
      checks.firebase.message = 'Le SDK Firebase Admin est initialisé.';
    } else {
      isHealthy = false;
      checks.firebase.status = 'error';
      checks.firebase.message = 'Le SDK Firebase Admin n\'a pas pu s\'initialiser. Vérifiez la configuration.';
    }

    // Détermine le code de statut HTTP global
    if (!isHealthy) {
      httpStatus = 503; // Service Unavailable
    }
    
    res.status(httpStatus).json({
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    });
  };
}

module.exports = new HealthController(); 