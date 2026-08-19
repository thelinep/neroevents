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


FROM node:22-alpine AS runtime

WORKDIR /app

RUN corepack enable

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist

COPY --from=build /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=build /app/packages/auth/dist ./packages/auth/dist

COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /app/packages/database ./packages/database

RUN pnpm install --frozen-lockfile --prod

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]