const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Vérifie la santé du service et de ses dépendances.
 *     tags: [Health]
 *     description: "Retourne un statut détaillé incluant la connectivité SMTP et l'initialisation de Firebase. Renvoie un statut HTTP 200 si tout est OK, et 503 si une dépendance critique est en panne."
 *     responses:
 *       200:
 *         description: Le service est sain et toutes les dépendances sont opérationnelles.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 checks:
 *                   type: object
 *                   properties:
 *                     server:
 *                       $ref: '#/components/schemas/HealthCheckItem'
 *                     smtp:
 *                       $ref: '#/components/schemas/HealthCheckItem'
 *                     firebase:
 *                       $ref: '#/components/schemas/HealthCheckItem'
 *       503:
 *         description: Le service est dégradé car au moins une dépendance est en panne.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 checks:
 *                   type: object
 *
 * components:
 *   schemas:
 *     HealthCheckItem:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [ok, error, down]
 *           example: ok
 *         message:
 *           type: string
 */
router.get('/', healthController.check);

module.exports = router; 