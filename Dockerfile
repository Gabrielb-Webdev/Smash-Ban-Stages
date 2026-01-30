FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código
COPY server/ ./server/

# Exponer puerto
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para ejecutar
CMD ["node", "server/server.js"]
