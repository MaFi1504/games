# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build Nuxt (output goes to .output/)
RUN pnpm build

# ---- runtime stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy only the built output – no node_modules needed at runtime
COPY --from=builder /app/.output ./

EXPOSE 3000

CMD ["node", "server/index.mjs"]
