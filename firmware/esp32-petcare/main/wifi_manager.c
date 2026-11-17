#include "wifi_manager.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "config_store.h"
#include "esp_event.h"
#include "esp_http_server.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "esp_wifi.h"
#include "json_util.h"
#include "lwip/ip4_addr.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char* TAG = "wifi_manager";

#define SOFTAP_SSID "PetCare-Setup"
#define SOFTAP_MAX_CONN 4
/* Sub-rede própria do Hotspot. Evita 192.168.4.0/24, que é a LAN padrão de roteadores como o eero
 * (192.168.4.0/22) e conflitaria com o IP da placa/PC na rede de casa. Mantenha em sincronia com
 * `softApBaseUrl` em apps/api/src/modules/pairing/pairing.service.ts. */
#define SOFTAP_IP_A 10
#define SOFTAP_IP_B 73
#define SOFTAP_IP_C 73
#define SOFTAP_IP_D 1
#define WIFI_CONNECT_TIMEOUT_MS 10000
/* Com o Hotspot aberto, tenta de novo a rede salva nesse intervalo (roteador que demorou a subir,
 * queda de energia, etc.). Não tenta enquanto houver alguém conectado no Hotspot, porque a busca
 * do STA troca de canal e derruba o cliente do portal. */
#define STA_RETRY_WHILE_SOFTAP_MS 30000

static bool s_wifi_connected = false;
static bool s_softap_active = false;
static bool s_disable_softap_pending = false;
static bool s_heartbeat_pending = false;
/* Desde quando o STA está sem conexão (0 = conectado ou sem rede salva). */
static int64_t s_sta_down_since_ms = 0;
static int64_t s_last_sta_retry_ms = 0;
static int64_t s_provision_switch_at_ms = 0;
static char s_sta_ip[20] = "0.0.0.0";
static httpd_handle_t s_http_server = NULL;

static void json_extract_string(const char* json, const char* key, char* out, size_t out_len) {
    char pattern[64];
    snprintf(pattern, sizeof(pattern), "\"%s\"", key);
    const char* pos = strstr(json, pattern);
    if (!pos) return;

    pos = strchr(pos + strlen(pattern), ':');
    if (!pos) return;

    pos = strchr(pos, '"');
    if (!pos) return;
    pos++;

    size_t i = 0;
    while (*pos && *pos != '"' && i + 1 < out_len) {
        if (*pos == '\\' && *(pos + 1) != '\0') {
            pos++;
        }
        out[i++] = *pos++;
    }
    out[i] = '\0';
}

static void set_cors_headers(httpd_req_t* req) {
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Headers", "Content-Type");
}

static esp_err_t handle_options(httpd_req_t* req) {
    set_cors_headers(req);
    httpd_resp_send(req, NULL, 0);
    return ESP_OK;
}

static esp_err_t handle_status_get(httpd_req_t* req) {
    set_cors_headers(req);
    httpd_resp_set_type(req, "application/json");

    const petcare_config_t* cfg = config_store_get();
    char prefix_esc[72];
    char ssid_esc[72];
    json_escape(cfg->device_prefix, prefix_esc, sizeof(prefix_esc));
    json_escape(cfg->ssid, ssid_esc, sizeof(ssid_esc));

    char resp[256];
    snprintf(resp, sizeof(resp), "{\"devicePrefix\":\"%s\",\"ssid\":\"%s\",\"connected\":%s,\"ip\":\"%s\"}",
             prefix_esc, ssid_esc, s_wifi_connected ? "true" : "false", s_sta_ip);

    httpd_resp_sendstr(req, resp);
    return ESP_OK;
}

static esp_err_t handle_scan_get(httpd_req_t* req) {
    set_cors_headers(req);
    httpd_resp_set_type(req, "application/json");

    wifi_scan_config_t scan_cfg = {
        .ssid = NULL,
        .bssid = NULL,
        .channel = 0,
        .show_hidden = false,
    };

    esp_wifi_disconnect();
    vTaskDelay(pdMS_TO_TICKS(50));
    esp_wifi_scan_start(&scan_cfg, true);

    uint16_t ap_count = 12;
    wifi_ap_record_t ap_records[12];
    if (esp_wifi_scan_get_ap_records(&ap_count, ap_records) != ESP_OK) {
        ap_count = 0;
    }

    char* buf = malloc(1536);
    if (!buf) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    size_t offset = snprintf(buf, 1536, "{\"networks\":[");
    int added = 0;

    for (uint16_t i = 0; i < ap_count && offset < 1400; i++) {
        const char* ssid = (const char*)ap_records[i].ssid;
        if (strlen(ssid) == 0 || strcmp(ssid, SOFTAP_SSID) == 0) {
            continue;
        }
        char ssid_esc[72];
        json_escape(ssid, ssid_esc, sizeof(ssid_esc));
        offset +=
            snprintf(buf + offset, 1536 - offset, "%s{\"ssid\":\"%s\",\"rssi\":%d,\"auth\":%s}", added > 0 ? "," : "",
                     ssid_esc, ap_records[i].rssi, ap_records[i].authmode != WIFI_AUTH_OPEN ? "true" : "false");
        added++;
    }

    snprintf(buf + offset, 1536 - offset, "]}");
    httpd_resp_sendstr(req, buf);
    free(buf);
    return ESP_OK;
}

static void apply_sta_credentials(void) {
    const petcare_config_t* cfg = config_store_get();
    if (strlen(cfg->ssid) == 0) {
        return;
    }

    ESP_LOGI(TAG, "Desautenticando clientes do Hotspot '%s' e reiniciando em modo STA para conectar em '%s'...",
             SOFTAP_SSID, cfg->ssid);

    esp_wifi_deauth_sta(0);
    vTaskDelay(pdMS_TO_TICKS(150));
    esp_wifi_stop();
    vTaskDelay(pdMS_TO_TICKS(100));
    esp_restart();
}

static esp_err_t handle_provision_post(httpd_req_t* req) {
    set_cors_headers(req);
    httpd_resp_set_type(req, "application/json");

    char body[512] = {0};
    int received = httpd_req_recv(req, body, sizeof(body) - 1);
    if (received <= 0) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Body vazio");
        return ESP_FAIL;
    }
    body[received] = '\0';

    petcare_config_t* cfg = config_store_get();
    json_extract_string(body, "ssid", cfg->ssid, sizeof(cfg->ssid));
    json_extract_string(body, "password", cfg->password, sizeof(cfg->password));
    json_extract_string(body, "apiBaseUrl", cfg->api_base_url, sizeof(cfg->api_base_url));
    json_extract_string(body, "deviceToken", cfg->device_token, sizeof(cfg->device_token));
    json_extract_string(body, "devicePrefix", cfg->device_prefix, sizeof(cfg->device_prefix));

    if (strlen(cfg->device_prefix) == 0) {
        strcpy(cfg->device_prefix, "esp32-01");
    }
    config_store_trim_slashes(cfg->api_base_url);

    config_store_save();
    ESP_LOGI(TAG, "Credenciais salvas na NVS! SSID='%s', API='%s', Prefixo='%s'", cfg->ssid, cfg->api_base_url,
             cfg->device_prefix);

    httpd_resp_sendstr(req, "{\"ok\":true,\"message\":\"Credenciais salvas! Conectando ao Wi-Fi...\"}");

    s_provision_switch_at_ms = (esp_timer_get_time() / 1000) + 800;
    return ESP_OK;
}

static esp_err_t handle_portal_root_get(httpd_req_t* req) {
    httpd_resp_set_type(req, "text/html; charset=utf-8");
    const char* html =
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>PetCare ESP32 Setup</title>"
        "<style>body{font-family:sans-serif;background:#f4f8fb;color:#1d262f;padding:24px;max-width:420px;margin:0 "
        "auto}"
        ".card{background:#fff;border-radius:12px;padding:20px;border:1px solid #dfe5ec}"
        "label{display:block;font-size:13px;font-weight:600;margin-top:12px}"
        "input{width:100%;box-sizing:border-box;padding:10px;margin-top:4px;border:1px solid #c3ccd5;border-radius:8px}"
        "button{width:100%;margin-top:18px;padding:12px;background:#239f6d;color:#fff;border:0;border-radius:8px;font-"
        "weight:700;cursor:pointer}"
        "</style></head><body><div class='card'><h2>PetCare ESP32</h2>"
        "<p style='font-size:13px;color:#52616f'>Configure o Wi-Fi 2.4 GHz (a API é descoberta sozinha na rede).</p>"
        "<form onsubmit='send(event)'>"
        "<label>Wi-Fi (SSID 2.4 GHz)</label><input id='ssid' required>"
        "<label>Senha do Wi-Fi</label><input id='password' type='password'>"
        "<label>Prefixo da Placa</label><input id='devicePrefix' value='esp32-01' required>"
        "<label>URL Base da API (opcional)</label><input id='apiBaseUrl' placeholder='Descoberta automática via UDP'>"
        "<button type='submit'>Salvar e Conectar</button></form>"
        "<p id='msg' style='font-size:13px;margin-top:12px'></p></div>"
        "<script>async function send(e){e.preventDefault();const r=await "
        "fetch('/provision',{method:'POST',headers:{'Content-Type':'application/"
        "json'},body:JSON.stringify({ssid:ssid.value,password:password.value,devicePrefix:devicePrefix.value,"
        "apiBaseUrl:apiBaseUrl.value})});const d=await r.json();msg.textContent=d.message||'Salvo!';}</script>"
        "</body></html>";
    httpd_resp_sendstr(req, html);
    return ESP_OK;
}

static void start_provisioning_server(void) {
    if (s_http_server != NULL) {
        return;
    }

    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.max_uri_handlers = 8;

    if (httpd_start(&s_http_server, &config) == ESP_OK) {
        const httpd_uri_t root_uri = {.uri = "/", .method = HTTP_GET, .handler = handle_portal_root_get};
        const httpd_uri_t status_uri = {.uri = "/status", .method = HTTP_GET, .handler = handle_status_get};
        const httpd_uri_t scan_uri = {.uri = "/scan", .method = HTTP_GET, .handler = handle_scan_get};
        const httpd_uri_t prov_post = {.uri = "/provision", .method = HTTP_POST, .handler = handle_provision_post};
        const httpd_uri_t prov_opt = {.uri = "/provision", .method = HTTP_OPTIONS, .handler = handle_options};
        const httpd_uri_t scan_opt = {.uri = "/scan", .method = HTTP_OPTIONS, .handler = handle_options};
        const httpd_uri_t status_opt = {.uri = "/status", .method = HTTP_OPTIONS, .handler = handle_options};

        httpd_register_uri_handler(s_http_server, &root_uri);
        httpd_register_uri_handler(s_http_server, &status_uri);
        httpd_register_uri_handler(s_http_server, &scan_uri);
        httpd_register_uri_handler(s_http_server, &prov_post);
        httpd_register_uri_handler(s_http_server, &prov_opt);
        httpd_register_uri_handler(s_http_server, &scan_opt);
        httpd_register_uri_handler(s_http_server, &status_opt);

        ESP_LOGI(TAG, "Portal de pareamento ativo em http://%d.%d.%d.%d (Rede Wi-Fi: %s)", SOFTAP_IP_A, SOFTAP_IP_B,
                 SOFTAP_IP_C, SOFTAP_IP_D, SOFTAP_SSID);
    }
}

static void enable_softap_provisioning(void) {
    if (s_softap_active) {
        return;
    }

    s_softap_active = true;
    esp_wifi_disconnect();

    wifi_config_t ap_config = {
        .ap =
            {
                .ssid = SOFTAP_SSID,
                .ssid_len = strlen(SOFTAP_SSID),
                .channel = 1,
                .max_connection = SOFTAP_MAX_CONN,
                .authmode = WIFI_AUTH_OPEN,
            },
    };

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_APSTA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap_config));
    start_provisioning_server();
}

/** Fecha o Hotspot quando a rede salva voltou sozinha (sem novo pareamento em andamento). */
static void disable_softap_provisioning(void) {
    if (!s_softap_active) {
        return;
    }

    ESP_LOGI(TAG, "Wi-Fi salvo voltou. Fechando Hotspot '%s'.", SOFTAP_SSID);
    if (s_http_server != NULL) {
        httpd_stop(s_http_server);
        s_http_server = NULL;
    }
    esp_wifi_set_mode(WIFI_MODE_STA);
    s_softap_active = false;
}

static int softap_client_count(void) {
    wifi_sta_list_t list = {0};
    if (esp_wifi_ap_get_sta_list(&list) != ESP_OK) {
        return 0;
    }
    return list.num;
}

static void wifi_event_handler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data) {
    const petcare_config_t* cfg = config_store_get();

    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        if (!s_softap_active && strlen(cfg->ssid) > 0) {
            s_sta_down_since_ms = esp_timer_get_time() / 1000;
            esp_wifi_connect();
        }
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        s_wifi_connected = false;
        if (strlen(cfg->ssid) == 0) {
            return;
        }
        /* O timeout do Hotspot conta a partir do início da queda, não do boot. */
        if (s_sta_down_since_ms == 0) {
            s_sta_down_since_ms = esp_timer_get_time() / 1000;
        }
        /* Com o Hotspot aberto, as novas tentativas ficam a cargo de wifi_manager_poll. */
        if (!s_softap_active) {
            esp_wifi_connect();
        }
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*)event_data;
        snprintf(s_sta_ip, sizeof(s_sta_ip), IPSTR, IP2STR(&event->ip_info.ip));
        ESP_LOGI(TAG, "Conectado no Wi-Fi '%s'! IP: %s", cfg->ssid, s_sta_ip);
        s_wifi_connected = true;
        s_heartbeat_pending = true;
        s_sta_down_since_ms = 0;
        if (s_softap_active) {
            s_disable_softap_pending = true;
        }
    }
}

void wifi_manager_init(void) {
    const petcare_config_t* cfg = config_store_get();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();
    esp_netif_t* ap_netif = esp_netif_create_default_wifi_ap();

    esp_netif_ip_info_t ap_ip = {0};
    IP4_ADDR(&ap_ip.ip, SOFTAP_IP_A, SOFTAP_IP_B, SOFTAP_IP_C, SOFTAP_IP_D);
    IP4_ADDR(&ap_ip.gw, SOFTAP_IP_A, SOFTAP_IP_B, SOFTAP_IP_C, SOFTAP_IP_D);
    IP4_ADDR(&ap_ip.netmask, 255, 255, 255, 0);
    esp_netif_dhcps_stop(ap_netif);
    ESP_ERROR_CHECK(esp_netif_set_ip_info(ap_netif, &ap_ip));
    esp_netif_dhcps_start(ap_netif);

    wifi_init_config_t init_cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&init_cfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL));
    ESP_ERROR_CHECK(
        esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL));

    if (strlen(cfg->ssid) == 0) {
        ESP_LOGW(TAG, "Nenhum Wi-Fi salvo na NVS. Iniciando Hotspot '%s'...", SOFTAP_SSID);
        enable_softap_provisioning();
        ESP_ERROR_CHECK(esp_wifi_start());
    } else {
        ESP_LOGI(TAG, "Tentando conectar ao Wi-Fi salvo na NVS: '%s'...", cfg->ssid);
        wifi_config_t sta_cfg = {0};
        strncpy((char*)sta_cfg.sta.ssid, cfg->ssid, sizeof(sta_cfg.sta.ssid) - 1);
        strncpy((char*)sta_cfg.sta.password, cfg->password, sizeof(sta_cfg.sta.password) - 1);

        ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
        ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &sta_cfg));
        ESP_ERROR_CHECK(esp_wifi_start());
    }
}

void wifi_manager_poll(int64_t now_ms) {
    const petcare_config_t* cfg = config_store_get();

    if (s_provision_switch_at_ms > 0 && now_ms >= s_provision_switch_at_ms) {
        s_provision_switch_at_ms = 0;
        apply_sta_credentials();
    }

    if (strlen(cfg->ssid) == 0 || s_provision_switch_at_ms > 0) {
        return;
    }

    if (s_disable_softap_pending) {
        s_disable_softap_pending = false;
        if (s_wifi_connected) {
            disable_softap_provisioning();
        }
    }

    if (!s_wifi_connected && !s_softap_active && s_sta_down_since_ms > 0 &&
        (now_ms - s_sta_down_since_ms >= WIFI_CONNECT_TIMEOUT_MS)) {
        ESP_LOGW(TAG, "Sem conexao em '%s' ha 10s. Ativando Hotspot '%s' em %d.%d.%d.%d...", cfg->ssid, SOFTAP_SSID,
                 SOFTAP_IP_A, SOFTAP_IP_B, SOFTAP_IP_C, SOFTAP_IP_D);
        enable_softap_provisioning();
        s_last_sta_retry_ms = now_ms;
    }

    if (!s_wifi_connected && s_softap_active && now_ms - s_last_sta_retry_ms >= STA_RETRY_WHILE_SOFTAP_MS) {
        s_last_sta_retry_ms = now_ms;
        if (softap_client_count() == 0) {
            ESP_LOGI(TAG, "Hotspot ocioso. Tentando de novo o Wi-Fi salvo '%s'...", cfg->ssid);
            esp_wifi_connect();
        }
    }
}

bool wifi_manager_is_connected(void) {
    return s_wifi_connected;
}

const char* wifi_manager_get_ip(void) {
    return s_sta_ip;
}

bool wifi_manager_take_heartbeat_pending(void) {
    if (s_heartbeat_pending) {
        s_heartbeat_pending = false;
        return true;
    }
    return false;
}
