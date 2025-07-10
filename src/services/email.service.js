const fs = require('fs/promises');
const path = require('path');
const handlebars = require('handlebars');
const transporter = require('../config/mailer');
const logger = require('../config/logger');
const { incrementNotificationsSent } = require('../middlewares/metrics');

handlebars.registerHelper('divide', (l, r) => l / r);
handlebars.registerHelper('toFixed', (num, digits) => Number(num).toFixed(digits || 2));
handlebars.registerHelper('toUpperCase', (str) => typeof str === 'string' ? str.toUpperCase() : '');

class EmailService {
  /**
   * Charge et compile un template d'e-mail.
   * @param {string} templateName - Le nom du fichier de template (sans extension).
   * @param {object} data - Les données à injecter dans le template.
   * @returns {Promise<string>} Le contenu HTML de l'e-mail.
   */
  async _compileTemplate(templateName, data) {
    try {
      const templatePath = path.join(__dirname, `../templates/emails/${templateName}.hbs`);
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateSource);
      return template(data);
    } catch (error) {
      logger.error({ err: error, templateName }, `Erreur lors de la compilation du template.`);
      throw new Error('Impossible de générer le contenu de l\'e-mail.');
    }
  }

  /**
   * Envoie un e-mail.
   * @param {string} to - L'adresse e-mail du destinataire.
   * @param {string} subject - Le sujet de l'e-mail.
   * @param {string} templateName - Le nom du template à utiliser.
   * @param {object} data - Les données pour le template.
   * @param {string} requestId - L'identifiant de la requête.
   * @returns {Promise<object>} L'information de livraison de Nodemailer.
   */
  async sendEmail({ to, subject, templateName, data, requestId }) {
    const logMeta = { to, templateName, context: data, requestId };
    logger.info(logMeta, `Tentative d'envoi d'un e-mail.`);

    try {
      const htmlContent = await this._compileTemplate(templateName, data);

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        html: htmlContent,
      };
      
      logger.debug({ ...logMeta, mailOptions }, 'Options de l\'e-mail préparées pour l\'envoi.');

      const info = await transporter.sendMail(mailOptions);
      logger.info({ ...logMeta, messageId: info.messageId, response: info.response }, `E-mail envoyé avec succès.`);
      incrementNotificationsSent('email', 'success', { template: templateName });
      return info;

    } catch (error) {
      logger.error({ ...logMeta, err: error }, `Échec de l'envoi de l'e-mail.`);
      incrementNotificationsSent('email', 'failure', { template: templateName });
      // On ne rejette pas forcément pour ne pas bloquer un flux utilisateur,
      // mais on pourrait vouloir une logique de re-tentative ici.
      return null;
    }
  }

  /**
   * Envoie un e-mail de confirmation de compte.
   * @param {string} userEmail - L'e-mail de l'utilisateur.
   * @param {string} confirmationLink - Le lien de confirmation.
   * @param {string} requestId - L'identifiant de la requête.
   */
  async sendConfirmationEmail(userEmail, confirmationLink, requestId) {
    return this.sendEmail({
      to: userEmail,
      subject: 'Bienvenue chez SupervIA ! Confirmez votre compte',
      templateName: 'accountConfirmation',
      data: {
        title: 'Confirmation de votre compte',
        preheader: 'Un dernier pas pour activer votre compte SupervIA.',
        confirmation_link: confirmationLink,
      },
      requestId,
    });
  }

  /**
   * Envoie un e-mail de réinitialisation de mot de passe.
   * @param {string} userEmail - L'e-mail de l'utilisateur.
   * @param {string} resetLink - Le lien de réinitialisation.
   * @param {string} requestId - L'identifiant de la requête.
   */
  async sendPasswordResetEmail(userEmail, resetLink, requestId) {
    return this.sendEmail({
      to: userEmail,
      subject: 'Réinitialisation de votre mot de passe SupervIA',
      templateName: 'passwordReset',
      data: {
        title: 'Réinitialisation de mot de passe',
        preheader: 'Vous avez demandé à réinitialiser votre mot de passe.',
        reset_link: resetLink,
      },
      requestId,
    });
  }
}

module.exports = new EmailService(); 