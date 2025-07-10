const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticateService } = require('../middlewares/auth');
const { validate, sendEmailSchema, sendPushSchema } = require('../middlewares/validation');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API pour l'envoi de notifications (e-mail, push, et WebSocket).
 */
module.exports = function(notificationController) {
  const router = express.Router();

  /**
   * @swagger
   * /api/v1/send-email:
   *   post:
   *     summary: Envoyer un e-mail transactionnel via un template.
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SendEmail'
   *     responses:
   *       200:
   *         description: E-mail envoyé avec succès.
   *       400:
   *         description: Données de validation invalides.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Non autorisé (token JWT manquant ou invalide).
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         description: "Erreur interne du serveur (ex: erreur SMTP)."
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post(
    '/send-email',
    authenticateService,
    validate(sendEmailSchema),
    notificationController.sendEmail
  );

  /**
   * @swagger
   * /api/v1/send-push:
   *   post:
   *     summary: Envoyer une notification push à un appareil.
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SendPush'
   *     responses:
   *       200:
   *         description: Notification push envoyée avec succès.
   *       400:
   *         description: Requête invalide.
   *       401:
   *         description: Non autorisé.
   *       500:
   *         description: "Erreur interne du serveur (ex: erreur FCM)."
   */
  router.post(
    '/send-push',
    authenticateService,
    validate(sendPushSchema),
    notificationController.sendPushNotification
  );

  /**
   * @swagger
   * /api/v1/ws/broadcast:
   *   post:
   *     summary: Diffuser un message WebSocket à tous les clients connectés.
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Broadcast'
   *     responses:
   *       202:
   *         description: Requête de diffusion acceptée.
   *       401:
   *         description: Non autorisé.
   */
  router.post(
    '/ws/broadcast',
    authenticateService,
    notificationController.broadcastWebSocket
  );

  /**
   * @swagger
   * /api/v1/ws/emit:
   *   post:
   *     summary: Envoyer un message WebSocket à une room spécifique.
   *     tags: [Notifications]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/EmitToRoom'
   *     responses:
   *       202:
   *         description: Requête d'émission acceptée.
   *       401:
   *         description: Non autorisé.
   */
  router.post(
    '/ws/emit',
    authenticateService,
    notificationController.emitToRoom
  );

  return router;
}; 