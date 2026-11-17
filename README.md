# PetCare

Home care para gatos — projeto de Instrumentação Eletrônica. Um ESP32 lê três tipos de sensor e manda as leituras para a API; o front mostra a planta da casa com os itens posicionados e um dashboard com os dados.

| Sensor | Item no plano | O que o ESP32 envia |
| --- | --- | --- |
| Capacitivo | Pote de água / Pote de ração | nível em % (periódico) |
| Sonar LV-MaxSonar-EZ1 (UART) | Caixa de areia | `1` quando o gato entra (queda brusca em relação ao *baseline* estável) e `0` quando sai |
| Microfone | Microfone | pico em dB quando detecta um miado (evento) |

## Estrutura

```
apps/
  web/        React + Vite (mesma estrutura/componentes do Vinea e Gestare)
  api/        Node + Express 5 + Mongoose (MongoDB)
packages/     reservado para código compartilhado (ex.: tipos)
firmware/
  esp32-petcare/   firmware ESP-IDF modular (NVS, pareamento SoftAP, descoberta UDP e Sonar UART)
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
| POST | `/readings` | **chamado pelo ESP32** (`1` na entrada e `0` na saída para caixa de areia) |
| GET | `/pairing/config` | configurações sugeridas para o pareamento SoftAP do ESP32 |
| GET | `/pairing/boards` | lista placas ESP32 pareadas e status online/offline |
| POST | `/pairing/heartbeat` | **chamado pelo ESP32** ao conectar no Wi-Fi (e periodicamente) |
| DELETE | `/pairing/boards/:devicePrefix` | desvincula uma placa pareada |

Envio do ESP32 (uma leitura ou um lote):

```json
{ "sensorKey": "esp32-01:water", "value": 73 }
{ "readings": [{ "sensorKey": "esp32-01:proximity", "value": 1 }] }
```

O `sensorKey` liga a leitura ao item do plano (editável no painel do item). Se `DEVICE_TOKEN` estiver definido na API, o ESP32 manda o header `x-device-token`. Um dispositivo fica "online" se mandou leitura nos últimos 5 minutos.

## Firmware ESP32 (VS Code + ESP-IDF)

O firmware fica em `firmware/esp32-petcare/` e utiliza o framework oficial **ESP-IDF (v6.0+)** em C.

### 1. Instalar pré-requisitos e extensão no VS Code (Ubuntu / Debian)

1. Instale a extensão oficial **`ESP-IDF`** (`espressif.esp-idf-extension`) no VS Code.
2. No Linux, instale as dependências de sistema (incluindo `libwebkit2gtk-4.1-0` exigida pelo instalador gráfico EIM):
   ```bash
   sudo apt update && sudo apt install -y libwebkit2gtk-4.1-0 git wget flex bison gperf python3 python3-pip python3-venv cmake ninja-build ccache libffi-dev libssl-dev dfu-util libusb-1.0-0
   ```
3. No VS Code (`Ctrl+Shift+P`), execute:
   - **`ESP-IDF: Open ESP-IDF Installation Manager`** → instale a versão mais recente do ESP-IDF.
   - **`ESP-IDF: Select Current ESP-IDF Version`** → selecione a versão instalada.

### 2. Ligação física do Sonar (LV-MaxSonar-EZ1)

| Pino no LV-MaxSonar-EZ1 | Pino no ESP32 | Descrição |
| --- | --- | --- |
| **GND** (Pino 7) | **GND** | Terra comum |
| **+5 / VCC** (Pino 6) | **3V3** | Alimentação em 3.3V (mantém o sinal lógico seguro em 3.3V) |
| **TX** (Pino 5) | **GPIO 16 (`RX2`)** | Saída serial invertida (9600 8N1) lida pela `UART2` do ESP32 |

*(Deixe os demais pinos do sonar desconectados para leitura contínua automática).*

### 3. Liberar porta USB e gravar (Build, Flash & Monitor)

1. Abra a pasta **`firmware/esp32-petcare`** diretamente no VS Code (`File -> Open Folder...`).
2. Conecte o ESP32 via cabo USB de dados e libere a permissão da porta serial no Linux:
   ```bash
   # Permissão imediata na sessão atual:
   sudo chmod 666 /dev/ttyUSB0

   # Permissão permanente (exige relogar na sessão do Linux):
   sudo usermod -a -G dialout $USER
   ```
3. Configure o alvo e a porta no VS Code (`Ctrl+Shift+P` ou ícones da barra inferior):
   - **`ESP-IDF: Set Espressif Device Target`** → escolha `esp32`.
   - **`ESP-IDF: Select Port to Use`** → escolha `/dev/ttyUSB0` (ou `/dev/ttyACM0`).
   - **`ESP-IDF: Select Flash Method`** → escolha `UART`.
4. Para compilar, gravar na placa e abrir o terminal serial de uma vez, pressione `Ctrl+Shift+P` e rode:
   - **`ESP-IDF: Build, Flash and Start a Monitor on Your Device`** (ou clique no ícone de **chama 🔥** na barra inferior).
   - *(Dica: se a gravação parar em `Connecting........`, segure o botão físico **BOOT** na placa por 2 segundos).*

### 4. Pareamento Wi-Fi (Sem senha fixa no código)

1. Quando o ESP32 liga sem Wi-Fi salvo na memória NVS (ou fica 10 segundos sem conseguir conectar, ou ao segurar o botão **BOOT** por **3 segundos**), ele cria a rede Wi-Fi aberta **`PetCare-Setup`** (`http://10.73.73.1`). Se já houver uma rede salva, ele continua tentando ela a cada 30 s enquanto ninguém estiver conectado no Hotspot, e fecha o Hotspot sozinho quando a rede volta.
2. No painel web do PetCare, acesse a aba **Configurações (`/config`)**, conecte na rede `PetCare-Setup`, selecione sua rede Wi-Fi **2.4 GHz** e envie. Se `DEVICE_TOKEN` estiver definido na API, digite o mesmo valor no campo **Token do Dispositivo** (a API não o expõe para o navegador).
3. O ESP32 salva as credenciais na memória Flash (NVS), conecta no seu Wi-Fi e descobre automaticamente o IP da API na rede local via **UDP Broadcast** na porta `3333` (`DISCOVERY_PORT`, independente da porta HTTP).

**Com Docker:** o broadcast UDP não atravessa a rede bridge do Docker e, de dentro do container, a API não enxerga o IP do PC. Defina `HOST_LAN_IP` no `.env` (ex.: `HOST_LAN_IP=192.168.0.10`) para o painel sugerir a URL certa ao ESP32.

## Próximos passos

- Trocar o polling (3 s) por SSE/WebSocket
- Detecção de miado melhor no firmware (FFT / janela de energia)
- Calibração dos sensores capacitivos pela interface
- Mover os tipos compartilhados para `packages/`
