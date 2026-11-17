# PetCare

Monorepo Turborepo + Yarn 4 (`nodeLinker: node-modules`).

- `apps/web`: React + Vite + TanStack Query + nuqs + Tailwind v4 + shadcn. **Mesma estrutura e componentes do Vinea/Gestare** — `src/components/ui` foi copiado de lá; prefira reaproveitar a criar componente novo.
- `apps/api`: Express 5 + Mongoose + Zod, um módulo por domínio em `src/modules/<dominio>/` (`*.model.ts`, `*.schemas.ts`, `*.routes.ts`, `*.service.ts`). Erros: lance `HttpError`; o `errorHandler` responde `{ statusCode, message }`.
- `firmware/`: sketch do ESP32. O contrato com a API é `POST /api/readings { sensorKey, value, durationMs?, kind?, features? }`. O microfone manda `durationMs` + `features` (tom, tonalidade, zcr, rajadas) e a API classifica o tipo de som em `apps/api/src/modules/readings/vocalization.classifier.ts`.

## Front — estrutura de feature

```
src/features/<feature>/
  types/  services/  composables/  constants/  components/  pages/
```

- `services/`: só `api.get/post/patch/delete`, com o tipo no verbo (`api.get<Device[]>`).
- `composables/`: React Query; unwrap no `select`; invalidação no `onSuccess`.
- Estado de URL (seleção, filtros) com `nuqs`.
- Arquivos em camelCase.
- `VITE_USE_MOCK=true` troca o adapter do axios por `features/core/service/mock/mockAdapter.ts`, que imita a API. Ao mudar o contrato da API, atualize o mock junto.

## Tailwind v4 — armadilhas

- Nunca use `border-b-*`, `border-y-*`, `border-t-*`, `border-r-*`, `border-l-*` como **cor**: viram largura de borda. Use `border-(--color-b-400)`.
- Só existem os stops de cor declarados em `src/app.css`.

## Comandos

`yarn dev`, `yarn build`, `yarn typecheck`, `yarn lint`, `docker compose up -d --build`.

## Commits

Conventional commits em inglês: `feat(home): drag devices on floor plan`.
