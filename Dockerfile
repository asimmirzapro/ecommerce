FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/validations/package.json ./packages/validations/
RUN pnpm install --frozen-lockfile --filter api...

# Build
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm build --filter api

# Production image
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.0.0
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/validations/package.json ./packages/validations/
RUN pnpm install --frozen-lockfile --filter api... --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY packages/ ./packages/

RUN mkdir -p /app/apps/api/uploads

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
