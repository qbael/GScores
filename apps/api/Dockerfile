FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/g_scores
RUN npm run build

FROM build AS production-dependencies
RUN npm prune --omit=dev --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/src/prisma/database-url.ts ./src/prisma/database-url.ts
USER node
EXPOSE 3000
# Nest starts listening after the initial CSV import completes.
HEALTHCHECK --interval=5s --timeout=3s --start-period=5m --retries=12 \
    CMD ["node", "--input-type=module", "-e", "const response = await fetch('http://127.0.0.1:3000/api/subjects'); process.exit(response.ok ? 0 : 1);"]
CMD ["sh", "-c", "npm run db:migrate && exec node dist/main.js"]
