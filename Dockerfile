# Website Doctor — production image.
# Playwright's official image ships Chromium + every OS dependency the
# crawler, Lighthouse, axe-core, and the PDF exporter need.
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --config.dangerouslyAllowAllBuilds=true

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- run ----
FROM base AS run
ENV NODE_ENV=production
ENV PORT=10000
# SQLite + crawl artifacts live here; mount a disk for persistence.
ENV DATA_DIR=/app/data
ENV DB_FILE=/app/data/website-doctor.db
ENV ARTIFACTS_DIR=/app/data/artifacts

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/lib ./lib
COPY --from=build /app/config ./config
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/app ./app
COPY --from=build /app/components ./components
COPY --from=build /app/scripts ./scripts

RUN mkdir -p /app/data/artifacts

EXPOSE 10000
CMD ["pnpm", "start"]
