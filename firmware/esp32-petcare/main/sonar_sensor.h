#pragma once

#include <stdint.h>

/**
 * Inicializa a UART2 no GPIO 16 para leitura serial invertida (9600 8N1) do sonar LV-MaxSonar-EZ1.
 */
void sonar_sensor_init(void);

/**
 * Lê os pacotes disponíveis da UART2 e processa a máquina de estados de variação de baseline.
 */
void sonar_sensor_poll(int64_t now_ms);
