# =========================
# Base (Debian slim para compatibilidade com Prisma/OpenSSL)
# =========================
FROM node:20-bookworm-slim AS base
WORKDIR /app

# =========================
# Dependencies
# =========================
FROM base AS deps
COPY package*.json ./
RUN npm ci

# =========================
# Build
# =========================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# =========================
# Runner
# =========================
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# (Opcional, mas recomendado p/ TLS/Prisma)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Copia somente o necessário para rodar
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Se você tiver next.config.js/ts, copie explicitamente (sem wildcard)
# Se NÃO tiver, pode apagar essa linha abaixo
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["npm", "run", "start"]
