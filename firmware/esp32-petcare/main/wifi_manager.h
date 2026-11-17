#pragma once

#include <stdbool.h>
#include <stdint.h>

/**
 * Inicializa a pilha Wi-Fi (STA + SoftAP "PetCare-Setup" em 10.73.73.1 quando sem rede).
 */
void wifi_manager_init(void);

/**
 * Gerencia timeouts de conexão STA (Hotspot após 10s sem rede, novas tentativas da rede salva a cada 30s
 * com o Hotspot ocioso, fechamento do Hotspot quando a rede volta) e troca pós-pareamento.
 */
void wifi_manager_poll(int64_t now_ms);

/**
 * Indica se o ESP32 está conectado ao Wi-Fi configurado e possui IP válido.
 */
bool wifi_manager_is_connected(void);

/**
 * Retorna a string do IP atual na rede Wi-Fi STA (ex.: "192.168.1.45").
 */
const char* wifi_manager_get_ip(void);

/**
 * Verifica e consome a flag que indica que o Wi-Fi acabou de conectar e precisa enviar heartbeat imediato.
 */
bool wifi_manager_take_heartbeat_pending(void);
