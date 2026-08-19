FROM node:22-alpine
WORKDIR /app
COPY apps/api/package*.json ./apps/api/
RUN cd apps/api && npm install --legacy-peer-deps
COPY apps/api ./apps/api
COPY packages/database ./packages/database
WORKDIR /app/apps/api
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
