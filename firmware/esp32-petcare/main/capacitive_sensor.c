#include "capacitive_sensor.h"

#include <stdbool.h>

#include "api_client.h"
#include "driver/gpio.h"
#include "esp_log.h"

static const char* TAG = "capacitive_sensor";

#define CAP_GPIO GPIO_NUM_25
#define CAP_SENSOR_SUFFIX "water" /* chave esp32-XX:water — igual à usada pela placa antes desta versão */
#define CAP_PERIOD_MS 30000
#define CAP_DEBOUNCE_MS 200

static bool s_state = false;
static bool s_has_state = false;
static int64_t s_last_sent_ms = 0;
static int64_t s_changed_at_ms = 0;
static bool s_candidate = false;

void capacitive_sensor_init(void) {
    gpio_config_t io = {
        .pin_bit_mask = 1ULL << CAP_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io);
    ESP_LOGI(TAG, "Sensor capacitivo CR18-8DP inicializado na GPIO %d (sufixo '%s')", (int)CAP_GPIO,
             CAP_SENSOR_SUFFIX);
}

void capacitive_sensor_poll(int64_t now_ms) {
    bool level = gpio_get_level(CAP_GPIO) == 1;

    if (!s_has_state) {
        s_has_state = true;
        s_state = level;
        s_candidate = level;
        s_last_sent_ms = now_ms;
        ESP_LOGI(TAG, "Estado inicial do CR18-8DP: %s (gpio%d=%d)", level ? "DETECTADO (100%)" : "livre (0%)",
                 (int)CAP_GPIO, level);
        api_client_send_reading(CAP_SENSOR_SUFFIX, level ? 100.0f : 0.0f);
        return;
    }

    /* Antirruído: a mudança só vale depois de CAP_DEBOUNCE_MS estável */
    if (level != s_candidate) {
        s_candidate = level;
        s_changed_at_ms = now_ms;
    }
    bool changed = (s_candidate != s_state) && (now_ms - s_changed_at_ms >= CAP_DEBOUNCE_MS);
    if (changed) s_state = s_candidate;

    if (changed || now_ms - s_last_sent_ms >= CAP_PERIOD_MS) {
        s_last_sent_ms = now_ms;
        ESP_LOGI(TAG, "Enviando CR18-8DP: gpio%d=%d -> %.1f%%", (int)CAP_GPIO, s_state, s_state ? 100.0f : 0.0f);
        api_client_send_reading(CAP_SENSOR_SUFFIX, s_state ? 100.0f : 0.0f);
    }
}
