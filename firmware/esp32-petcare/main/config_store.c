#include "config_store.h"

#include <string.h>

#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "nvs.h"
#include "nvs_flash.h"

static const char* TAG = "config_store";

#define BOOT_BUTTON_GPIO GPIO_NUM_0
#define BOOT_RESET_HOLD_MS 3000
#define NVS_NAMESPACE "petcare_cfg"

static petcare_config_t s_cfg = {
    .ssid = "",
    .password = "",
    .api_base_url = "",
    .device_token = "",
    .device_prefix = "esp32-01",
};

static int64_t s_boot_pressed_since_ms = 0;

void config_store_trim_slashes(char* url) {
    size_t len = strlen(url);
    while (len > 0 && url[len - 1] == '/') {
        url[len - 1] = '\0';
        len--;
    }
}

static void nvs_load(void) {
    nvs_handle_t handle;
    if (nvs_open(NVS_NAMESPACE, NVS_READONLY, &handle) != ESP_OK) {
        return;
    }

    size_t len = sizeof(s_cfg.ssid);
    nvs_get_str(handle, "ssid", s_cfg.ssid, &len);

    len = sizeof(s_cfg.password);
    nvs_get_str(handle, "password", s_cfg.password, &len);

    len = sizeof(s_cfg.api_base_url);
    nvs_get_str(handle, "api_base", s_cfg.api_base_url, &len);

    len = sizeof(s_cfg.device_token);
    nvs_get_str(handle, "token", s_cfg.device_token, &len);

    len = sizeof(s_cfg.device_prefix);
    nvs_get_str(handle, "prefix", s_cfg.device_prefix, &len);

    nvs_close(handle);
    config_store_trim_slashes(s_cfg.api_base_url);
}

void config_store_init(void) {
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    nvs_load();

    gpio_reset_pin(BOOT_BUTTON_GPIO);
    gpio_set_direction(BOOT_BUTTON_GPIO, GPIO_MODE_INPUT);
    gpio_set_pull_mode(BOOT_BUTTON_GPIO, GPIO_PULLUP_ONLY);
}

petcare_config_t* config_store_get(void) {
    return &s_cfg;
}

void config_store_save(void) {
    nvs_handle_t handle;
    if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) != ESP_OK) {
        return;
    }
    nvs_set_str(handle, "ssid", s_cfg.ssid);
    nvs_set_str(handle, "password", s_cfg.password);
    nvs_set_str(handle, "api_base", s_cfg.api_base_url);
    nvs_set_str(handle, "token", s_cfg.device_token);
    nvs_set_str(handle, "prefix", s_cfg.device_prefix);
    nvs_commit(handle);
    nvs_close(handle);
}

void config_store_clear(void) {
    nvs_handle_t handle;
    if (nvs_open(NVS_NAMESPACE, NVS_READWRITE, &handle) == ESP_OK) {
        nvs_erase_all(handle);
        nvs_commit(handle);
        nvs_close(handle);
    }
}

void config_store_poll_boot_button(int64_t now_ms) {
    if (gpio_get_level(BOOT_BUTTON_GPIO) == 0) {
        if (s_boot_pressed_since_ms == 0) {
            s_boot_pressed_since_ms = now_ms;
        } else if (now_ms - s_boot_pressed_since_ms >= BOOT_RESET_HOLD_MS) {
            ESP_LOGW(TAG, "Botao BOOT segurado por 3s! Apagando Wi-Fi da NVS e reiniciando em modo pareamento...");
            config_store_clear();
            vTaskDelay(pdMS_TO_TICKS(200));
            esp_restart();
        }
    } else {
        s_boot_pressed_since_ms = 0;
    }
}
