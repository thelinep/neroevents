FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY apps/api/package.json apps/api/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/auth packages/auth
COPY packages/contracts packages/contracts
COPY packages/database packages/database

RUN pnpm --filter @nevo/auth build

RUN pnpm --filter nevo-builder-backend build


FROM build AS production-deps

RUN pnpm deploy \
    --filter nevo-builder-backend \
    --prod \
    /prod/api


FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/apps/api/dist ./dist

COPY --from=production-deps /prod/api/node_modules ./node_modules

COPY --from=production-deps /prod/api/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/index.js"]