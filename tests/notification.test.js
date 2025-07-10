const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, server } = require('../src/server');
const emailService = require('../src/services/email.service');
const pushService = require('../src/services/push.service');
const WebSocketService = require('../src/services/websocket.service');

// Mock des services externes
jest.mock('../src/services/email.service');
jest.mock('../src/services/push.service');
// Mock complet du WebSocketService pour contrôler son instanciation
jest.mock('../src/services/websocket.service');


describe('Notification API Endpoints', () => {
  let token;
  let mockWebSocketInstance;

  beforeAll(() => {
    process.env.ALLOWED_SERVICES = 'test-service';
    process.env.JWT_SECRET = 'a-very-secure-and-long-secret-for-tests';
    token = jwt.sign({ serviceId: 'test-service' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  beforeEach(() => {
    // Avant chaque test, on s'assure que le mock est propre
    // et on récupère la dernière instance créée par le serveur.
    WebSocketService.mockClear();
    // On configure le comportement du mock pour les méthodes
    const mockImplementation = {
      broadcast: jest.fn(),
      emitToRoom: jest.fn(),
    };
    WebSocketService.mockImplementation(() => mockImplementation);
    // On a besoin de l'instance qui sera utilisée dans le controller
    mockWebSocketInstance = new WebSocketService();
  });

  afterAll((done) => {
    server.close(done);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/send-email', () => {
    it('should return 200 OK and call email service', async () => {
      const emailData = { to: 'recipient@example.com', subject: 'Valid Subject', template: 'passwordReset', context: { link: 'http://reset.link' } };
      emailService.sendEmail.mockResolvedValue({ messageId: 'mock-message-id' });

      const response = await request(app)
        .post('/api/v1/send-email')
        .set('Authorization', `Bearer ${token}`)
        .send(emailData)
        .expect(200);
      
      expect(response.body.message).toBe('Email sent successfully to recipient@example.com');
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: emailData.to, subject: emailData.subject, templateName: emailData.template, data: emailData.context
      });
    });

    it('should return 500 if email service fails', async () => {
        emailService.sendEmail.mockRejectedValue(new Error('SMTP connection error'));
        await request(app)
          .post('/api/v1/send-email')
          .set('Authorization', `Bearer ${token}`)
          .send({ to: 'test@example.com', subject: 'Failure test', template: 'accountConfirmation', context: { user: 'Test' } })
          .expect(500);
    });
  });

  describe('POST /api/v1/send-push', () => {
    it('should return 200 OK and call push service', async () => {
      const pushData = { token: 'device-fcm-token', title: 'Valid Push', body: 'This is a valid push notification.', data: { screen: 'home' } };
      pushService.sendToDevice.mockResolvedValue({ messageId: 'mock-push-id' });
      
      const response = await request(app)
        .post('/api/v1/send-push')
        .set('Authorization', `Bearer ${token}`)
        .send(pushData)
        .expect(200);

      expect(response.body.message).toBe('Push notification sent successfully');
      expect(pushService.sendToDevice).toHaveBeenCalledWith(pushData.token, { title: pushData.title, body: pushData.body, data: pushData.data });
    });

     it('should return 500 if push service fails', async () => {
        pushService.sendToDevice.mockRejectedValue(new Error('FCM API Error'));
        await request(app)
          .post('/api/v1/send-push')
          .set('Authorization', `Bearer ${token}`)
          .send({ token: 'failing-fcm-token', title: 'Failure Push', body: 'This push will fail.' })
          .expect(500);
    });
  });

  describe('POST /api/v1/ws/broadcast', () => {
    it('should return 202 Accepted and call websocket service to broadcast', async () => {
      const broadcastData = { event: 'global-alert', data: { message: 'Server is going down for maintenance.' } };
      
      const response = await request(app)
        .post('/api/v1/ws/broadcast')
        .set('Authorization', `Bearer ${token}`)
        .send(broadcastData)
        .expect(202);
      
      // On vérifie que la méthode sur l'instance mockée a été appelée
      const controllerInstance = app.get('notificationController');
      expect(controllerInstance.webSocketService.broadcast).toHaveBeenCalledTimes(1);
      expect(controllerInstance.webSocketService.broadcast).toHaveBeenCalledWith(broadcastData.event, broadcastData.data);
    });
  });

  describe('POST /api/v1/ws/emit', () => {
    it('should return 202 Accepted and call websocket service to emit to a room', async () => {
      const emitData = { room: 'user-123', event: 'private-message', data: { from: 'admin', text: 'Your report is ready.' } };
      
      const response = await request(app)
        .post('/api/v1/ws/emit')
        .set('Authorization', `Bearer ${token}`)
        .send(emitData)
        .expect(202);
      
      const controllerInstance = app.get('notificationController');
      expect(controllerInstance.webSocketService.emitToRoom).toHaveBeenCalledTimes(1);
      expect(controllerInstance.webSocketService.emitToRoom).toHaveBeenCalledWith(emitData.room, emitData.event, emitData.data);
    });
  });
}); 