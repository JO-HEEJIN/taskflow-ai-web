FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/server.js"]
