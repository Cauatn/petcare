#include "api_client.h"

#include <math.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "config_store.h"
#include "esp_http_client.h"
#include "esp_log.h"
#include "esp_mac.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "json_util.h"
#include "lwip/inet.h"
#include "lwip/sockets.h"
#include "wifi_manager.h"

static const char* TAG = "api_client";

#define HEARTBEAT_INTERVAL_MS 15000
#define HEARTBEAT_RETRY_MS 3000
/* Porta UDP fixa da descoberta. Precisa bater com DISCOVERY_PORT da API (padrão 3333), que é
 * independente da porta HTTP: a API responde "PETCARE_API:<porta HTTP>". */
#define DISCOVERY_UDP_PORT 3333
#define DEFAULT_API_HTTP_PORT 3333
#define READING_QUEUE_LEN 16

typedef struct {
    char sensor_suffix[24];
    float value;
    bool is_vocal;
    uint32_t duration_ms;
    vocal_features_t features;
} reading_msg_t;

static QueueHandle_t s_reading_queue = NULL;

static bool discover_api_via_udp(void) {
    if (!wifi_manager_is_connected()) {
        return false;
    }

    int sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_IP);
    if (sock < 0) {
        return false;
    }

    int broadcast = 1;
    setsockopt(sock, SOL_SOCKET, SO_BROADCAST, &broadcast, sizeof(broadcast));

    struct timeval tv = {
        .tv_sec = 1,
        .tv_usec = 0,
    };
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    struct sockaddr_in dest_addr = {
        .sin_family = AF_INET,
        .sin_port = htons(DISCOVERY_UDP_PORT),
        .sin_addr.s_addr = htonl(INADDR_BROADCAST),
    };

    const char* payload = "PETCARE_DISCOVER";
    sendto(sock, payload, strlen(payload), 0, (struct sockaddr*)&dest_addr, sizeof(dest_addr));

    char rx_buf[64] = {0};
    struct sockaddr_in from_addr;
    socklen_t from_len = sizeof(from_addr);
    int len = recvfrom(sock, rx_buf, sizeof(rx_buf) - 1, 0, (struct sockaddr*)&from_addr, &from_len);
    close(sock);

    if (len > 0 && strncmp(rx_buf, "PETCARE_API:", 12) == 0) {
        int port = atoi(rx_buf + 12);
        if (port <= 0 || port > 65535) port = DEFAULT_API_HTTP_PORT;

        char sender_ip[20];
        inet_ntoa_r(from_addr.sin_addr, sender_ip, sizeof(sender_ip));

        petcare_config_t* cfg = config_store_get();
        snprintf(cfg->api_base_url, sizeof(cfg->api_base_url), "http://%s:%d/api", sender_ip, port);
        config_store_save();
        ESP_LOGI(TAG, "Servidor PetCare descoberto via UDP na rede: %s", cfg->api_base_url);
        return true;
    }

    return false;
}

/**
 * Helper compartilhado para requisições POST JSON autenticadas com fallback automático via UDP.
 */
static bool post_json(const char* endpoint_path, const char* body, int* out_status) {
    if (!wifi_manager_is_connected()) {
        return false;
    }

    petcare_config_t* cfg = config_store_get();
    if (strlen(cfg->api_base_url) == 0 && !discover_api_via_udp()) {
        return false;
    }

    char url[192];
    snprintf(url, sizeof(url), "%s%s", cfg->api_base_url, endpoint_path);

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .timeout_ms = 4000,
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);
    if (client == NULL) {
        return false;
    }

    esp_http_client_set_header(client, "Content-Type", "application/json");
    if (strlen(cfg->device_token) > 0) {
        esp_http_client_set_header(client, "x-device-token", cfg->device_token);
    }
    esp_http_client_set_post_field(client, body, strlen(body));

    bool ok = false;
    esp_err_t err = esp_http_client_perform(client);
    if (err == ESP_OK) {
        int status = esp_http_client_get_status_code(client);
        if (out_status) *out_status = status;
        ok = (status >= 200 && status < 300);
    } else {
        ESP_LOGW(TAG, "Falha em %s (%s). Buscando servidor na rede via UDP...", url, esp_err_to_name(err));
        discover_api_via_udp();
    }

    esp_http_client_cleanup(client);
    return ok;
}

static bool send_heartbeat(void) {
    const petcare_config_t* cfg = config_store_get();

    uint8_t mac[6] = {0};
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char mac_str[18];
    snprintf(mac_str, sizeof(mac_str), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

    char prefix_esc[72];
    char ssid_esc[72];
    json_escape(cfg->device_prefix, prefix_esc, sizeof(prefix_esc));
    json_escape(cfg->ssid, ssid_esc, sizeof(ssid_esc));

    char body[256];
    snprintf(body, sizeof(body), "{\"devicePrefix\":\"%s\",\"ssid\":\"%s\",\"ip\":\"%s\",\"mac\":\"%s\"}",
             prefix_esc, ssid_esc, wifi_manager_get_ip(), mac_str);

    int status = 0;
    bool ok = post_json("/pairing/heartbeat", body, &status);
    if (ok) {
        ESP_LOGI(TAG, "Heartbeat enviado -> HTTP %d", status);
    }
    return ok;
}

/** Número JSON, ou `null` quando a medida não existe (NAN/infinito). */
static void format_json_number(char* out, size_t size, float value, const char* fmt) {
    if (isnan(value) || isinf(value)) {
        snprintf(out, size, "null");
    } else {
        snprintf(out, size, fmt, value);
    }
}

static void send_reading_sync(const reading_msg_t* msg) {
    const petcare_config_t* cfg = config_store_get();

    char sensor_key[64];
    snprintf(sensor_key, sizeof(sensor_key), "%s:%s", cfg->device_prefix, msg->sensor_suffix);
    char sensor_key_esc[128];
    json_escape(sensor_key, sensor_key_esc, sizeof(sensor_key_esc));

    char body[384];
    if (msg->is_vocal) {
        const vocal_features_t* f = &msg->features;
        char f0[16], f0_start[16], f0_end[16], voiced[16], zcr[16];
        format_json_number(f0, sizeof(f0), f->f0_hz, "%.0f");
        format_json_number(f0_start, sizeof(f0_start), f->f0_start_hz, "%.0f");
        format_json_number(f0_end, sizeof(f0_end), f->f0_end_hz, "%.0f");
        format_json_number(voiced, sizeof(voiced), f->voiced_ratio, "%.2f");
        format_json_number(zcr, sizeof(zcr), f->zcr, "%.3f");
        snprintf(body, sizeof(body),
                 "{\"sensorKey\":\"%s\",\"value\":%.1f,\"durationMs\":%lu,\"features\":{"
                 "\"f0Hz\":%s,\"f0StartHz\":%s,\"f0EndHz\":%s,\"voicedRatio\":%s,\"zcr\":%s,\"bursts\":%ld}}",
                 sensor_key_esc, msg->value, (unsigned long)msg->duration_ms, f0, f0_start, f0_end, voiced, zcr,
                 (long)f->bursts);
    } else {
        snprintf(body, sizeof(body), "{\"sensorKey\":\"%s\",\"value\":%.1f}", sensor_key_esc, msg->value);
    }

    int status = 0;
    if (post_json("/readings", body, &status)) {
        if (msg->is_vocal) {
            ESP_LOGI(TAG, "[%s] som %lums vol %.1f -> HTTP %d", sensor_key, (unsigned long)msg->duration_ms,
                     msg->value, status);
        } else {
            ESP_LOGI(TAG, "[%s] %.1f -> HTTP %d", sensor_key, msg->value, status);
        }
    }
}

static void api_worker_task(void* arg) {
    bool needs_fast_retry = true;
    int64_t last_heartbeat_ms = 0;
    reading_msg_t msg;

    while (1) {
        // Processa leituras pendentes na fila (aguarda até 200ms)
        if (xQueueReceive(s_reading_queue, &msg, pdMS_TO_TICKS(200)) == pdTRUE) {
            send_reading_sync(&msg);
        }

        if (!wifi_manager_is_connected()) {
            continue;
        }

        if (wifi_manager_take_heartbeat_pending()) {
            needs_fast_retry = true;
        }

        int64_t now_ms = esp_timer_get_time() / 1000;
        int64_t wait_ms = needs_fast_retry ? HEARTBEAT_RETRY_MS : HEARTBEAT_INTERVAL_MS;
        if (last_heartbeat_ms == 0 || (now_ms - last_heartbeat_ms >= wait_ms)) {
            last_heartbeat_ms = now_ms;
            if (send_heartbeat()) {
                needs_fast_retry = false;
            }
        }
    }
}

void api_client_init(void) {
    s_reading_queue = xQueueCreate(READING_QUEUE_LEN, sizeof(reading_msg_t));
    xTaskCreate(api_worker_task, "api_worker", 6144, NULL, 4, NULL);
}

void api_client_send_reading(const char* sensor_suffix, float value) {
    if (s_reading_queue == NULL) {
        return;
    }

    reading_msg_t msg = {.value = value};
    strncpy(msg.sensor_suffix, sensor_suffix, sizeof(msg.sensor_suffix) - 1);
    xQueueSend(s_reading_queue, &msg, 0);
}

void api_client_send_vocalization(const char* sensor_suffix, float value, uint32_t duration_ms,
                                  const vocal_features_t* features) {
    if (s_reading_queue == NULL || features == NULL) {
        return;
    }

    reading_msg_t msg = {
        .value = value,
        .is_vocal = true,
        .duration_ms = duration_ms,
        .features = *features,
    };
    strncpy(msg.sensor_suffix, sensor_suffix, sizeof(msg.sensor_suffix) - 1);
    xQueueSend(s_reading_queue, &msg, 0);
}
