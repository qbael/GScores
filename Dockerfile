FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN npm ci --prefix apps/api --no-audit --no-fund \
    && npm ci --prefix apps/web --no-audit --no-fund

FROM dependencies AS build
COPY apps ./apps
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/g_scores
RUN npm run build

FROM build AS test
COPY tests ./tests
RUN npm run test:unit

FROM build AS production-dependencies
RUN npm prune --prefix apps/api --omit=dev --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=production-dependencies /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json /app/apps/api/package-lock.json ./apps/api/
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/web/dist ./public
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && exec node apps/api/dist/main.js"]
