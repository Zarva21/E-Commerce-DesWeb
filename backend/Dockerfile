FROM node:22-alpine

WORKDIR /usr/src/app

# Copiar manifiestos
COPY package*.json ./

# Instalar dependencias limpias para producción
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]