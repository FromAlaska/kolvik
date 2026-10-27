FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY server.js db.js workshop.js game.html debug.js item-tests.js build.js ./
COPY src ./src
COPY workshop ./workshop
# the server rebuilds game.html from src/ (and the workshop saves into src/ and workshop/), so the node user owns them
RUN node build.js && mkdir -p /app/data && chown -R node:node /app/data /app/src /app/workshop /app/game.html
VOLUME /app/data
ENV DATA_DIR=/app/data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
USER node
CMD ["node", "--no-warnings=ExperimentalWarning", "server.js"]
