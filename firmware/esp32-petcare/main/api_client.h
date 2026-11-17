#pragma once

#include <stdint.h>

/**
 * Inicializa a fila e a task em segundo plano para envio não-bloqueante de heartbeats e leituras HTTP/UDP.
 */
void api_client_init(void);

/**
 * Enfileira uma leitura de sensor para envio assíncrono em POST <API_BASE>/readings.
 */
void api_client_send_reading(const char* sensor_suffix, float value);
