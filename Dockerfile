FROM node:18-alpine
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
WORKDIR /app/artifacts/api-server
RUN pnpm install --frozen-lockfile --prod

COPY artifacts/api-server ./
RUN pnpm run build

ENV PORT=3000
EXPOSE 3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
