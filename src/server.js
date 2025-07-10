// notification-mail-sms-service-Tadayoshi123/src/server.js
// Serveur principal du microservice de notification SupervIA

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = 'morgan';
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');

const logger = require('./config/logger');
const loggerMiddleware = require('./middlewares/logger');
const { metricsMiddleware, metricsEndpoint } = require('./middlewares/metrics');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const notificationRoutesFactory = require('./routes/notification.routes');
const healthRoutes = require('./routes/health.routes');
const WebSocketService = require('./services/websocket.service');
const NotificationController = require('./controllers/notification.controller');
const healthController = require('./controllers/health.controller');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3005;

// ==============================================
// 🔌 CONFIGURATION DE SOCKET.IO
// ==============================================
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/ws' // Chemin personnalisé pour le serveur WebSocket
});

// Initialiser le service WebSocket avec l'instance io
const webSocketService = new WebSocketService(io);
const notificationController = new NotificationController(webSocketService);

// Middleware d'authentification pour Socket.IO (sera implémenté plus tard)
io.use((socket, next) => {
  // const token = socket.handshake.auth.token;
  // Ici, nous validerions le token JWT
  console.log('Un client tente de se connecter via WebSocket...');
  next();
});

io.on('connection', (socket) => {
  console.log(`✅ Client connecté via WebSocket: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Client déconnecté: ${socket.id}`);
  });

  // Gérer les abonnements à des "rooms" (par ex. par userId)
  socket.on('subscribe', (room) => {
    console.log(`Client ${socket.id} s'abonne à la room: ${room}`);
    socket.join(room);
  });
});

// Exporter `io` et le service pour l'utiliser dans d'autres parties de l'application
app.set('io', io);
app.set('webSocketService', webSocketService);
app.set('notificationController', notificationController);


// ==============================================
// 🛡️ MIDDLEWARES DE SÉCURITÉ ET UTILITAIRES
// ==============================================
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  // app.use(morgan('dev')); // 'morgan' sera importé plus tard
}

// Middleware de logging des requêtes
app.use(loggerMiddleware);

// Middleware pour les métriques Prometheus
app.use(metricsMiddleware);


// ==============================================
// 📖 SWAGGER DOCUMENTATION
// ==============================================
try {
  const swaggerDocument = require('./swagger.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  logger.warn('Could not load swagger.json. API documentation will be unavailable.');
  logger.warn("Run 'npm run swagger:gen' to generate it.");
}

// ==============================================
// 🎯 ROUTES API
// ==============================================

// Endpoint pour les métriques Prometheus
app.get('/metrics', metricsEndpoint);

app.get('/', (req, res) => {
  res.json({
    name: 'SupervIA Notification Service',
    description: 'Microservice pour l\'envoi de notifications (Email, Push, WebSocket)',
    version: process.env.npm_package_version || '1.0.0',
    features: ['Email (Nodemailer)', 'Push (Firebase)', 'WebSocket (Socket.IO)']
  });
});

// Les routes de l'application seront ajoutées ici
const notificationRouter = notificationRoutesFactory(notificationController);

// Montage des routeurs avec le préfixe global /api/v1
// Le routeur de notifications gérera les sous-routes comme /send-email, /send-push, etc.
app.use('/api/v1', notificationRouter);
app.use('/api/v1/health', healthRoutes);

// Middlewares de gestion des erreurs (doivent être les derniers)
app.use(notFoundHandler);

// Middleware de gestion des erreurs global
// Doit être le dernier middleware ajouté
app.use(errorHandler);


// ==============================================
// 🚀 DÉMARRAGE DU SERVEUR
// ==============================================
server.listen(PORT, () => {
    console.log(`
  📨  SupervIA Notification Service démarré avec succès!
  🌐 Serveur API écoutant sur: http://localhost:${PORT}
  🔌 Serveur WebSocket sur: ws://localhost:${PORT}/ws
  📖 Documentation API: http://localhost:${PORT}/api-docs
  🏥 Health Check: http://localhost:${PORT}/api/v1/health
  🔒 Environnement: ${process.env.NODE_ENV || 'development'}
    `);
});

// Gestion de l'arrêt propre
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt en douceur...');
  server.close(() => {
    io.close();
    console.log('Processus terminé.');
    process.exit(0);
  });
});

module.exports = { app, server, io }; 