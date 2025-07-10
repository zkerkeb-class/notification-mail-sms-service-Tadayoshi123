# Dockerfile pour le service de notification SupervIA

# ==============================================================================
# ÉTAPE 1: BUILDER
# Installe les dépendances de production dans un environnement propre et isolé.
# ==============================================================================
FROM node:20-alpine AS builder

ENV NODE_ENV=production
WORKDIR /app

# Copie des fichiers de dépendances et installation propre
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copie du code source (qui inclut déjà les templates)
COPY src ./src


# ==============================================================================
# ÉTAPE 2: PRODUCTION
# Construit l'image finale légère avec le code et les dépendances.
# ==============================================================================
FROM node:20-alpine

ENV NODE_ENV=production
ENV TZ=Europe/Paris

# Mise à jour et installation des paquets de base
RUN apk add --no-cache tzdata wget curl

# Création d'un groupe et d'un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs notifieruser

WORKDIR /app

# Copie des dépendances et du code source depuis l'étape de build
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/src ./src
COPY --chown=nodeuser:nodejs package*.json ./

# Création des répertoires pour les volumes avec les bonnes permissions
RUN mkdir -p logs && \
    chown -R notifieruser:nodejs logs

# Exposition du port
EXPOSE 3005

# Health check pour l'orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3005/api/v1/health || exit 1

# Passage à l'utilisateur non-root pour l'exécution
USER notifieruser

# Commande de démarrage
CMD ["node", "src/server.js"] 