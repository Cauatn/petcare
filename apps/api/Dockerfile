# Build a partir da raiz do monorepo: docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS pruner
COPY . .
RUN yarn dlx turbo@2 prune @petcare/api --docker

FROM base AS builder
COPY .yarnrc.yml ./
COPY --from=pruner /app/out/json/ .
RUN yarn install
COPY --from=pruner /app/out/full/ .
RUN yarn turbo run build --filter=@petcare/api

FROM base AS production
ENV NODE_ENV=production
COPY .yarnrc.yml ./
COPY --from=pruner /app/out/json/ .
RUN yarn workspaces focus @petcare/api --production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "dist/main.js"]
