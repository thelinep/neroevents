FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web apps/web

RUN pnpm --filter nevo-builder-frontend build


FROM nginx:alpine

COPY infrastructure/nginx/nevo.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]