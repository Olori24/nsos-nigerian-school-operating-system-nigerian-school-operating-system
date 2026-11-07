# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
RUN test -n "$VITE_APP_ID" && test -n "$VITE_OAUTH_PORTAL_URL"
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
