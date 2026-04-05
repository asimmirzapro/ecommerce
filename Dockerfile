FROM node:20-alpine
RUN npm install -g pnpm@9.0.0
WORKDIR /app

# Copy monorepo config and workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc .pnpmfile.cjs pnpm-approved-builds.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/validations/package.json ./packages/validations/

# Install all dependencies (single install keeps pnpm virtual store intact)
RUN pnpm install --frozen-lockfile --filter api...

# Copy source
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build
WORKDIR /app/apps/api
RUN npx nest build

# Cleanup source to reduce image size
RUN rm -rf src test

RUN mkdir -p /app/apps/api/uploads

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main"]
