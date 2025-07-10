const nodemailer = require('nodemailer');
const logger = require('./logger');

const transportConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(transportConfig);

// La vérification automatique au démarrage est retirée pour éviter les "open handles" dans les tests
// et pour ne pas bloquer le démarrage si le service SMTP est temporairement indisponible.
// La vérification se fait maintenant à la demande via le endpoint /health.
logger.info('✅ Transporteur Nodemailer configuré.');

module.exports = transporter; 