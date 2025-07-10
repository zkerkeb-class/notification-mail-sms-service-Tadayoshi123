# 📨 SupervIA Notification Service - Service de Notifications Multicanal

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/zkerkeb-class/notification-mail-sms-service-Tadayoshi123)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

> **Microservice centralisé pour l'envoi de toutes les communications sortantes (Email, Push, WebSocket) de l'écosystème SupervIA.**

Ce service agit comme le hub de communication de la plateforme. Il abstrait la complexité de l'envoi de notifications à travers différents canaux et fournit une API REST sécurisée et unifiée pour que les autres microservices puissent notifier les utilisateurs de manière fiable et cohérente.

---

## 📋 Table des matières

1.  [**Fonctionnalités Clés**](#-fonctionnalités-clés)
2.  [**Architecture & Flux**](#-architecture--flux)
3.  [**Installation et Lancement**](#-installation-et-lancement)
    -   [Prérequis](#prérequis)
    -   [Configuration (.env)](#configuration-env)
    -   [Déploiement avec Docker](#déploiement-avec-docker)
4.  [**Documentation de l'API**](#-documentation-de-lapi)
    -   [Emails Transactionnels](#-emails-transactionnels)
    -   [Notifications Push](#-notifications-push)
    -   [WebSockets](#-websockets)
5.  [**Monitoring & Santé**](#-monitoring--santé)
6.  [**Sécurité**](#-sécurité)
7.  [**Tests**](#-tests)

---

## ✨ Fonctionnalités Clés

-   **📨 Gestion des Emails Transactionnels**
    -   Envoi via **Nodemailer** avec n'importe quel fournisseur SMTP.
    -   Utilisation de templates **Handlebars** (`.hbs`) pour des emails dynamiques et personnalisés (ex: bienvenue, réinitialisation de mot de passe, facture).
    -   Validation des données d'entrée pour assurer la qualité des envois.

-   **🔥 Notifications Push Mobiles & Web**
    -   Intégration avec **Firebase Cloud Messaging (FCM)**.
    -   Envoi de notifications à des appareils spécifiques (via token) ou à des groupes d'utilisateurs (via topics).
    -   Gestion des charges utiles personnalisées (titre, corps, données).

-   **🔌 Notifications en Temps Réel via WebSockets**
    -   Serveur **Socket.IO** pour une communication bidirectionnelle instantanée.
    -   Diffusion de messages à tous les clients (`broadcast`) ou à des salles spécifiques (`rooms`), idéal pour cibler un utilisateur connecté.
    -   Utilisé pour les alertes en direct, les mises à jour de dashboards, et les notifications "toast".

-   **🔐 Sécurité Intégrée**
    -   Toutes les routes API sont protégées par un **token JWT inter-services**.
    -   Liste blanche des services autorisés à communiquer avec l'API.
    -   Middlewares de sécurité standards (Helmet, CORS, rate-limiting).

-   **📊 Monitoring & Observabilité**
    -   Exposition des métriques au format **Prometheus** via le endpoint `/metrics`.
    -   Compteurs personnalisés pour le nombre de notifications envoyées par type et par statut (succès/échec).
    -   Endpoint de santé (`/health`) pour vérifier l'état du service et de ses dépendances (SMTP, Firebase).

## 🏗️ Architecture & Flux

Le service de notification est un point d'entrée unique pour les autres services qui ont besoin de communiquer avec l'extérieur.

```mermaid
graph TD
    subgraph "Services SupervIA"
        Auth[Auth Service]
        Metrics[Metrics Service]
        Payment[Payment Service]
    end

    subgraph "Service de Notification"
        Notifier(📨 Notification Service)
    end

    subgraph "Canaux de Sortie"
        SMTP[✉️ Serveur SMTP]
        FCM[🔥 Firebase (FCM)]
        WS[🔌 Clients WebSocket]
    end

    Auth -- "POST /send-email (bienvenue)" --> Notifier
    Metrics -- "POST /ws/emit (alerte)" --> Notifier
    Payment -- "POST /send-email (facture)" --> Notifier

    Notifier -->|Nodemailer| SMTP
    Notifier -->|Firebase Admin| FCM
    Notifier -->|Socket.IO| WS
```

### Flux d'un email de bienvenue :
1.  L'`Auth Service` reçoit une nouvelle inscription.
2.  Il génère un token JWT inter-service et appelle `POST /api/v1/send-email` sur le `Notification Service` avec les détails de l'utilisateur.
3.  Le `Notification Service` valide le token et les données de la requête.
4.  Il compile le template `accountConfirmation.hbs` avec les données fournies.
5.  Il envoie l'email via le transporteur Nodemailer configuré.
6.  Il incrémente le compteur Prometheus `notification_service_sent_total{type="email", status="success"}`.

---

## 🚀 Installation et Lancement

### Prérequis
-   **Node.js** >= 18.x
-   **Docker** & **Docker Compose**
-   Un compte **Firebase** avec un fichier de clé de service (JSON).
-   Les identifiants d'un **serveur SMTP** (ex: Mailtrap, SendGrid, Gmail).

### Configuration (.env)
1.  Copiez le fichier d'exemple : `cp .env.example .env`
2.  Ouvrez `.env` et remplissez toutes les variables. **C'est une étape cruciale.**
    -   `JWT_SECRET`: Doit être **strictement identique** à celui des autres microservices.
    -   `SMTP_*`: Vos identifiants de serveur d'email.
    -   `FIREBASE_SERVICE_ACCOUNT_JSON`: Le contenu complet (en une seule ligne) de votre fichier de clé de service Firebase.

### Déploiement avec Docker
C'est la méthode recommandée pour la production et un développement cohérent.

```bash
# Depuis la racine du projet, si vous utilisez le docker-compose global
docker-compose up -d supervia-notification-service

# Pour lancer le service seul
docker-compose up -d --build

# Pour voir les logs
docker-compose logs -f
```

---

## 📖 Documentation de l'API

L'API est accessible via le préfixe `/api/v1`. Une documentation Swagger est disponible sur le endpoint `/api-docs` lorsque le service est en cours d'exécution.

### Authentification
Toutes les routes décrites ci-dessous nécessitent un token `Bearer` dans l'en-tête `Authorization`. Ce token doit être un JWT signé avec le `JWT_SECRET` partagé et contenir une `serviceId` présente dans `ALLOWED_SERVICES`.

---

### 📧 Emails Transactionnels

#### `POST /send-email`
Envoie un email en utilisant un template Handlebars.

-   **Body (`application/json`)**:
    ```json
    {
      "to": "utilisateur@exemple.com",
      "subject": "Votre Facture SupervIA",
      "template": "invoice",
      "context": {
        "name": "John Doe",
        "amount": "25.00",
        "currency": "EUR",
        "invoice_url": "https://example.com/invoice.pdf",
        "lines": [
          { "description": "Abonnement Pro", "quantity": 1, "amount": 2500, "currency": "eur" }
        ]
      }
    }
    ```
-   **Réponses**:
    -   `200 OK`: Email envoyé avec succès.
    -   `400 Bad Request`: Données de validation invalides.
    -   `401 Unauthorized`: Token JWT manquant ou invalide.
    -   `500 Internal Server Error`: Erreur du serveur SMTP ou de compilation du template.

---

### 🔥 Notifications Push

#### `POST /send-push`
Envoie une notification push à un appareil spécifique.

-   **Body (`application/json`)**:
    ```json
    {
      "token": "fcm_device_token_string",
      "title": "Alerte Critique",
      "body": "Le CPU de votre serveur a dépassé 90%.",
      "data": {
        "dashboardId": "dash-123",
        "severity": "critical"
      }
    }
    ```
-   **Réponses**:
    -   `200 OK`: Notification envoyée.
    -   `401 Unauthorized`: Token JWT invalide.
    -   `500 Internal Server Error`: Erreur de l'API Firebase.

---

### 🔌 WebSockets

Les actions WebSocket sont déclenchées via des endpoints API pour des raisons de sécurité et de simplicité (l'authentification se fait via le token JWT de la requête HTTP).

#### `POST /ws/broadcast`
Diffuse un message à **tous** les clients WebSocket connectés.

-   **Body (`application/json`)**:
    ```json
    {
      "event": "system_maintenance",
      "data": { "message": "Maintenance planifiée dans 15 minutes." }
    }
    ```
-   **Réponses**:
    -   `202 Accepted`: La demande de diffusion a été acceptée et traitée.

#### `POST /ws/emit`
Envoie un message à une "room" (salle) spécifique. Typiquement, une room correspond à un `userId` pour cibler un utilisateur précis.

-   **Body (`application/json`)**:
    ```json
    {
      "room": "user-abcdef-123456",
      "event": "new_toast",
      "data": {
        "type": "success",
        "message": "Votre dashboard a été sauvegardé !"
      }
    }
    ```
-   **Réponses**:
    -   `202 Accepted`: La demande d'émission a été acceptée.

---

## 🔬 Monitoring & Santé

-   **Health Check (`GET /api/v1/health`)**: Endpoint vital qui vérifie l'état du service et de ses connexions critiques (SMTP, Firebase). Retourne un statut `200` si tout est OK, et `503` si une dépendance est en panne.
-   **Metrics (`GET /metrics`)**: Endpoint qui expose les métriques au format texte pour que Prometheus puisse les scraper.

---

## 🔐 Sécurité

-   **Validation des Entrées**: Utilisation de `Joi` pour valider rigoureusement le corps des requêtes API.
-   **Isolation des Services**: La variable d'environnement `ALLOWED_SERVICES` agit comme une liste blanche, empêchant des services inconnus d'utiliser l'API de notification, même avec un token valide.
-   **Utilisateur Non-Root**: L'image Docker est configurée pour s'exécuter avec un utilisateur non-privilégié (`notifieruser`), réduisant la surface d'attaque en cas de compromission du conteneur.

---

## ✅ Tests

Le service est livré avec une suite de tests utilisant **Jest** et **Supertest**.

```bash
# Lancer tous les tests
npm test

# Lancer les tests en mode "watch"
npm run test:watch
```

Les tests couvrent les endpoints de l'API et simulent (`mock`) les services externes comme Nodemailer et Firebase pour garantir des tests rapides et fiables en isolation.

## 📄 Licence

MIT

---

**SupervIA** - Infrastructure Monitoring Platform with AI
<br>*Projet de certification RNCP - Expert en Développement Full Stack* 