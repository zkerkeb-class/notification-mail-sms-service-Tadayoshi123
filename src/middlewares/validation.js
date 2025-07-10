const Joi = require('joi');

/**
 * @description Schéma de validation pour l'envoi d'un e-mail.
 * - to: Adresse e-mail du destinataire (doit être une adresse e-mail valide).
 * - subject: Sujet de l'e-mail (chaîne de caractères, obligatoire).
 * - template: Nom du template Handlebars à utiliser (doit être 'accountConfirmation' ou 'passwordReset').
 * - context: Objet contenant les variables à injecter dans le template (objet, obligatoire).
 */
const sendEmailSchema = Joi.object({
  to: Joi.string().email().required(),
  subject: Joi.string().required(),
  template: Joi.string().valid('accountConfirmation', 'passwordReset', 'invoice').required(),
  context: Joi.object().required(),
});

/**
 * @description Schéma de validation pour l'envoi d'une notification push unique.
 * - token: Jeton d'enregistrement FCM du périphérique (chaîne de caractères, obligatoire).
 * - title: Titre de la notification (chaîne de caractères, obligatoire).
 * - body: Corps du message de la notification (chaîne de caractères, obligatoire).
 * - data: Données supplémentaires à envoyer avec la notification (objet, facultatif).
 */
const sendPushSchema = Joi.object({
  token: Joi.string().required(),
  title: Joi.string().required(),
  body: Joi.string().required(),
  data: Joi.object(),
});

/**
 * @description Middleware de validation générique.
 * @param {Joi.Schema} schema - Le schéma Joi à valider.
 * @returns {Function} - Middleware Express.
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, {
    abortEarly: false, // Rapporte toutes les erreurs, pas seulement la première
    stripUnknown: true, // Supprime les propriétés inconnues
  });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(', ');
    // Renvoie une erreur 400 Bad Request avec les détails de la validation
    return res.status(400).json({
      status: 'error',
      message: `Validation failed: ${errorMessages}`,
    });
  }

  next();
};

module.exports = {
  validate,
  sendEmailSchema,
  sendPushSchema,
}; 