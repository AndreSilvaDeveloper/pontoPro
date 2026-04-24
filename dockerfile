FROM node:20-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Cache-bust do build: muda a cada commit, força o BuildKit a reexecutar
# `npm run build` em vez de reaproveitar o .next/ de builds anteriores.
ARG BUILD_SHA=dev
ENV BUILD_SHA=${BUILD_SHA}

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=BEcU9LWV3PkjR0C5JQFXSU1ZHQP2IbixATtrf2O3CYo42VLqwbliJe-SYIfL_BBhZqs5tIKOUaKCygZ_LBHd810
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Copia somente o necessário para rodar
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]
