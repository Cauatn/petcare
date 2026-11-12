# Build a partir da raiz do monorepo: docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# 1) Recorta do monorepo só o que o @petcare/web precisa
FROM base AS pruner
COPY . .
RUN yarn dlx turbo@2 prune @petcare/web --docker

# 2) Instala dependências (camada cacheada enquanto os package.json não mudarem)
FROM base AS builder
ARG VITE_API_BASE_URL=/api
ARG VITE_USE_MOCK=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK
COPY .yarnrc.yml ./
COPY --from=pruner /app/out/json/ .
RUN yarn install
COPY --from=pruner /app/out/full/ .
RUN yarn turbo run build --filter=@petcare/web

# 3) Serve os estáticos com nginx (proxy de /api para o serviço "api")
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
