const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const logger = require('../src/config/logger');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SupervIA - Notification Service API',
      version: '1.0.0',
      description:
        'Ce service gère l\'envoi de notifications via e-mail (Nodemailer), ' +
        'push (Firebase Cloud Messaging), et WebSockets (Socket.IO). ' +
        'Il est sécurisé par JWT et fournit une API pour déclencher ces notifications.',
      contact: {
        name: 'Support Technique SupervIA',
        email: 'support@supervia.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3005}`,
        description: 'Serveur de développement local',
      },
      {
        url: 'https://api.supervia.com/notifications',
        description: 'Serveur de production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: "Token d'accès JWT inter-services. Le token doit contenir une propriété `serviceId` (ou `iss`) identifiant le service appelant (ex: 'auth-service').",
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                details: { type: 'object', nullable: true }
              }
            }
          }
        },
        SendEmail: {
          type: 'object',
          properties: {
            to: { type: 'string', format: 'email', description: 'Adresse e-mail du destinataire.' },
            subject: { type: 'string', description: 'Sujet de l\'e-mail.' },
            template: { type: 'string', enum: ['accountConfirmation', 'passwordReset', 'invoice', 'alert'], description: 'Nom du template Handlebars à utiliser (sans l\'extension .hbs).' },
            context: { type: 'object', description: 'Données à injecter dans le template.', example: { name: 'John Doe', link: 'http://example.com/confirm' } }
          },
          required: ['to', 'subject', 'template', 'context']
        },
        SendPush: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Jeton d\'enregistrement FCM de l\'appareil.' },
            title: { type: 'string', description: 'Titre de la notification.' },
            body: { type: 'string', description: 'Corps du message de la notification.' },
            data: { type: 'object', description: 'Données supplémentaires (facultatif).', example: { screen: 'details', id: '123' } }
          },
          required: ['token', 'title', 'body']
        },
        Broadcast: {
          type: 'object',
          properties: {
            event: { type: 'string', description: 'Le nom de l\'événement à diffuser.', example: 'system_maintenance' },
            data: { type: 'object', description: 'La charge utile de données à envoyer.', example: { message: 'Maintenance planifiée dans 15 minutes.' } }
          },
          required: ['event', 'data']
        },
        EmitToRoom: {
          type: 'object',
          properties: {
            room: { type: 'string', description: 'Le nom de la room (ex: un ID utilisateur).', example: 'user-abcdef-123456' },
            event: { type: 'string', description: 'Le nom de l\'événement à émettre.', example: 'new_toast' },
            data: { type: 'object', description: 'La charge utile de données à envoyer.', example: { type: 'success', message: 'Votre dashboard a été sauvegardé !' } }
          },
          required: ['room', 'event', 'data']
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Les fichiers contenant les annotations JSDoc pour Swagger
  apis: ['./src/routes/*.js'],
};

try {
  const swaggerSpec = swaggerJsdoc(options);
  const swaggerJsonPath = path.join(__dirname, '../src/swagger.json');

  fs.writeFileSync(swaggerJsonPath, JSON.stringify(swaggerSpec, null, 2));

  logger.info(`Documentation Swagger générée avec succès : ${swaggerJsonPath}`);
} catch (error) {
  logger.error('Erreur lors de la génération de la documentation Swagger:', error);
  process.exit(1);
} 