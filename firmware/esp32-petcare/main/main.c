/*
 * PetCare — Orquestrador principal do firmware ESP32 (ESP-IDF).
 */
#include <stdio.h>

#include "api_client.h"
#include "config_store.h"
#include "esp_timer.h"
#include "mic_sensor.h"
#include "sonar_sensor.h"
#include "wifi_manager.h"

void app_main(void) {
    config_store_init();
    sonar_sensor_init();
    wifi_manager_init();
    api_client_init();
    mic_sensor_init(); /* task própria: não precisa de poll */

    const petcare_config_t* cfg = config_store_get();
    printf("PetCare iniciado! Prefixo='%s' | API='%s'\n", cfg->device_prefix, cfg->api_base_url);

    while (1) {
        int64_t now_ms = esp_timer_get_time() / 1000;

        config_store_poll_boot_button(now_ms);
        wifi_manager_poll(now_ms);
        sonar_sensor_poll(now_ms);
    }
}
