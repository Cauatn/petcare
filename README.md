# PetCare

Home care para gatos — projeto de Instrumentação Eletrônica. Um ESP32 lê três tipos de sensor e manda as leituras para a API; o front mostra a planta da casa com os itens posicionados e um dashboard com os dados.

| Sensor | Item no plano | O que o ESP32 envia |
| --- | --- | --- |
| Capacitivo | Pote de água / Pote de ração | nível em % (periódico) |
| Proximidade / IR | Caixa de areia | `1` a cada entrada do gato (evento) |
| Microfone | Microfone | pico em dB quando detecta um miado (evento) |

## Estrutura

```
apps/
  web/        React + Vite (mesma estrutura/componentes do Vinea e Gestare)
  api/        Node + Express 5 + Mongoose (MongoDB)
packages/     reservado para código compartilhado (ex.: tipos)
firmware/
  esp32-petcare/   sketch Arduino de exemplo
docker-compose.yml  web (nginx) + api + mongo
turbo.json
```

## Rodando

Pré-requisitos: Node 22+, Yarn 4 (`corepack enable`) e Docker.

```bash
yarn install
```

**Só o front, com dados simulados** (sem API nem ESP32):

```bash
yarn dev:web          # http://localhost:5173 — VITE_USE_MOCK=true em apps/web/.env
```

**Stack completa via Docker:**

```bash
docker compose up -d --build   # front em http://localhost:8080, API em :3333
```

Se a porta 27017 já estiver em uso: `MONGO_PORT=27018 docker compose up -d --build`.

**Dev local com API real:** suba só o Mongo (`docker compose up -d mongo`), coloque `VITE_USE_MOCK=false` em `apps/web/.env` e rode `yarn dev` (Turbo sobe web + api). O Vite faz proxy de `/api` para `localhost:3333`.

## API

Base: `/api`

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | status da API e do banco |
| GET | `/devices` | dispositivos + status calculado (nível, eventos hoje, online) |
| POST | `/devices` | cria (`name`, `type`, `sensorKey`, `position {x,y}` em %) |
| PATCH | `/devices/:id` | atualiza nome, `sensorKey` ou posição |
| DELETE | `/devices/:id` | remove |
| GET | `/devices/:id/readings?limit=60` | histórico (mais antiga primeiro) |
| POST | `/readings` | **chamado pelo ESP32** |

Envio do ESP32 (uma leitura ou um lote):

```json
{ "sensorKey": "esp32-01:water", "value": 73 }
{ "readings": [{ "sensorKey": "esp32-01:proximity", "value": 1 }] }
```

O `sensorKey` liga a leitura ao item do plano (editável no painel do item). Se `DEVICE_TOKEN` estiver definido na API, o ESP32 manda o header `x-device-token`. Um dispositivo fica "online" se mandou leitura nos últimos 5 minutos.

## Próximos passos

- Trocar o polling (3 s) por SSE/WebSocket
- Detecção de miado melhor no firmware (FFT / janela de energia)
- Calibração dos sensores capacitivos pela interface
- Mover os tipos compartilhados para `packages/`
