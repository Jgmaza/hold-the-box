# Backend de Hold the Box. Construir DESDE LA RAÍZ del repo (importa la sim de frontend/src):
#   docker build -f backend/Dockerfile -t htb-backend .
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY backend/package.json backend/package-lock.json backend/
RUN npm --prefix backend ci --omit=dev && npm cache clean --force

COPY backend/ backend/
COPY frontend/package.json frontend/
COPY frontend/src frontend/src

WORKDIR /app/backend
USER node
EXPOSE 3000
# Aplica migraciones si hay DATABASE_URL y arranca el server
CMD ["sh", "-c", "[ -z \"$DATABASE_URL\" ] || node src/db/migrate.js; exec node src/index.js"]
