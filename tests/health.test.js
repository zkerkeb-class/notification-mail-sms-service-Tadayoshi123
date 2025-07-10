const request = require('supertest');
const { app, server, webSocketService } = require('../src/server');

// On mock les modules de configuration qui sont des dépendances du health controller.
jest.mock('../src/config/mailer', () => ({
  verify: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/config/firebase', () => ({
  apps: [{ name: '[DEFAULT]' }], // Simule un SDK initialisé
}));

describe('Health Check Endpoint (/api/v1/health)', () => {
  // Fermer le serveur après tous les tests pour éviter les handles ouverts
  afterAll((done) => {
    // On s'assure aussi de fermer la connexion websocket si elle existe
    if (webSocketService && webSocketService.io) {
      webSocketService.io.close();
    }
    server.close(done);
  });

  it('devrait retourner un statut 200 et un rapport de santé détaillé et positif', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .expect('Content-Type', /json/)
      .expect(200);

    // Assertions alignées sur la structure de réponse réelle du HealthController
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('checks');
    
    // Vérification de la structure détaillée des checks
    expect(response.body.checks.server).toEqual({
      status: 'ok',
      message: 'Le serveur Express est en cours d\'exécution.',
    });
    expect(response.body.checks.smtp).toEqual({
      status: 'ok',
      message: 'La connexion au serveur SMTP est réussie.',
    });
    expect(response.body.checks.firebase).toEqual({
      status: 'ok',
      message: 'Le SDK Firebase Admin est initialisé.',
    });
  });
}); 