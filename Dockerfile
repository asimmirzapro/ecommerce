FROM node:20-alpine AS base
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# Install all dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc .pnpmfile.cjs pnpm-approved-builds.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/validations/package.json ./packages/validations/
RUN pnpm install --frozen-lockfile --filter api...

# Build
FROM deps AS builder
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
WORKDIR /app/apps/api
RUN npx nest build

# Production image — reuse node_modules from deps (avoids missing transitive deps)
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY packages/ ./packages/

RUN mkdir -p /app/apps/api/uploads

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
