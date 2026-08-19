FROM node:22-alpine AS build
WORKDIR /app
COPY apps/web/package*.json ./apps/web/
RUN cd apps/web && npm install --legacy-peer-deps
COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:alpine
COPY infrastructure/nginx/nevo.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]
