/*
 * PetCare — esqueleto do firmware do ESP32 (Arduino IDE / PlatformIO).
 *
 * Envia leituras para POST http://<API>/api/readings no formato:
 *   { "sensorKey": "esp32-01:water", "value": 73 }
 *
 * O "sensorKey" precisa bater com o cadastrado no plano (painel do dispositivo).
 * Pinos e calibração são PLACEHOLDERS — ajustar conforme o hardware montado.
 */
#include <WiFi.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "SUA_REDE";
const char* WIFI_PASSWORD = "SUA_SENHA";
const char* API_URL = "http://192.168.0.10:3333/api/readings";
const char* DEVICE_TOKEN = "";  // igual ao DEVICE_TOKEN da API (se usado)

// Pinos (exemplo)
const int PIN_WATER_TOUCH = T0;   // GPIO4 — sensor capacitivo do pote de água
const int PIN_FOOD_TOUCH = T3;    // GPIO15 — sensor capacitivo do pote de ração
const int PIN_PROXIMITY = 27;     // sensor de proximidade/IR da caixa de areia
const int PIN_MIC = 34;           // saída analógica do microfone (ADC1)

// Calibração do capacitivo: leitura com pote vazio e cheio (medir no protótipo)
const int TOUCH_EMPTY = 60;
const int TOUCH_FULL = 20;

const unsigned long LEVEL_INTERVAL_MS = 30000;
const int MEOW_THRESHOLD = 2800;  // amplitude ADC acima disso conta como miado

unsigned long lastLevelSent = 0;
bool catInside = false;

void sendReading(const char* sensorKey, float value) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  if (strlen(DEVICE_TOKEN) > 0) http.addHeader("x-device-token", DEVICE_TOKEN);

  String body = String("{\"sensorKey\":\"") + sensorKey + "\",\"value\":" + String(value, 1) + "}";
  int status = http.POST(body);
  Serial.printf("[%s] %.1f -> HTTP %d\n", sensorKey, value, status);
  http.end();
}

int touchToPercent(int raw) {
  int pct = map(raw, TOUCH_EMPTY, TOUCH_FULL, 0, 100);
  return constrain(pct, 0, 100);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PROXIMITY, INPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\nWiFi ok: %s\n", WiFi.localIP().toString().c_str());
}

void loop() {
  // 1) Níveis de água/ração — envio periódico
  if (millis() - lastLevelSent > LEVEL_INTERVAL_MS) {
    lastLevelSent = millis();
    sendReading("esp32-01:water", touchToPercent(touchRead(PIN_WATER_TOUCH)));
    sendReading("esp32-01:food", touchToPercent(touchRead(PIN_FOOD_TOUCH)));
  }

  // 2) Caixa de areia — evento na borda de subida (gato entrou)
  bool detected = digitalRead(PIN_PROXIMITY) == LOW;  // muitos sensores IR são ativos em LOW
  if (detected && !catInside) sendReading("esp32-01:proximity", 1);
  catInside = detected;

  // 3) Microfone — detecção simples por amplitude (melhorar com FFT/janela depois)
  int peak = 0;
  for (int i = 0; i < 200; i++) peak = max(peak, analogRead(PIN_MIC));
  if (peak > MEOW_THRESHOLD) {
    float db = 20.0 * log10((float)peak);  // aproximação, sem calibração
    sendReading("esp32-01:mic", db);
    delay(1500);  // evita contar o mesmo miado várias vezes
  }

  delay(50);
}
