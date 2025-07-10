const emailService = require('../services/email.service');
const pushService = require('../services/push.service');
const { AppError, NotificationErrorCodes } = require('../middlewares/errorHandler');

class NotificationController {

  constructor(webSocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Gère l'envoi d'un e-mail transactionnel.
   */
  sendEmail = async (req, res, next) => {
    try {
      const { to, subject, template, context } = req.body;
      const result = await emailService.sendEmail({ 
        to, 
        subject, 
        templateName: template, 
        data: context,
        requestId: req.id
      });

      if (!result) {
        throw new AppError('Échec de l\'envoi de l\'e-mail', 500, NotificationErrorCodes.SMTP_ERROR);
      }

      res.status(200).json({ 
        message: `Email sent successfully to ${to}`,
        details: { messageId: result.messageId }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Gère l'envoi d'une notification push.
   */
  sendPushNotification = async (req, res, next) => {
    try {
      const { token, title, body, data } = req.body;
      const payload = { title, body, data };
      const result = await pushService.sendToDevice(token, payload, req.id);
      
      if (!result) {
        throw new AppError('Échec de l\'envoi de la notification push', 500, NotificationErrorCodes.FIREBASE_ERROR);
      }
      
      res.status(200).json({ 
        message: 'Push notification sent successfully',
        details: { messageId: result.messageId || result.message_id || 'N/A' } // FCM response varies
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Gère la diffusion d'un message WebSocket.
   */
  broadcastWebSocket = (req, res, next) => {
    try {
      const { event, data } = req.body;

      if (!event || !data) {
        throw new AppError('Champs manquants: event, data', 400, NotificationErrorCodes.VALIDATION_ERROR);
      }
      
      this.webSocketService.broadcast(event, data, req.id);
      
      res.status(202).json({ message: 'Message WebSocket diffusé.' });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Envoie un message WebSocket à une room spécifique.
   */
  emitToRoom = (req, res, next) => {
    try {
      const { room, event, data } = req.body;

      if (!room || !event || !data) {
        throw new AppError('Champs manquants: room, event, data', 400, NotificationErrorCodes.VALIDATION_ERROR);
      }
      
      this.webSocketService.emitToRoom(room, event, data, req.id);
      
      res.status(202).json({ message: `Message envoyé à la room ${room}.` });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = NotificationController; 