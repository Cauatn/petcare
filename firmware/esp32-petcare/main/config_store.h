#pragma once

#include <stdbool.h>
#include <stdint.h>

typedef struct {
    char ssid[33];
    char password[65];
    char api_base_url[128];
    char device_token[65];
    char device_prefix[33];
} petcare_config_t;

/**
 * Inicializa a partição NVS, carrega a configuração persistida e configura o botão BOOT (GPIO 0).
 */
void config_store_init(void);

/**
 * Retorna ponteiro mutável para a configuração atual em memória.
 */
petcare_config_t* config_store_get(void);

/**
 * Persiste a configuração atual na memória NVS.
 */
void config_store_save(void);

/**
 * Apaga todas as configurações salvas na NVS.
 */
void config_store_clear(void);

/**
 * Remove barras finais duplicadas de uma URL.
 */
void config_store_trim_slashes(char* url);

/**
 * Monitora o botão físico BOOT (GPIO 0). Se segurado por 3 segundos, limpa a NVS e reinicia o ESP32.
 */
void config_store_poll_boot_button(int64_t now_ms);
