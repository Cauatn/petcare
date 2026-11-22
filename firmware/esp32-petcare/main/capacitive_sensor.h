#pragma once

#include <stdint.h>

/**
 * Sensor capacitivo de proximidade CR18-8DP (saída digital PNP) no GPIO 25.
 * Só diz se há algo (ração/água) na altura do sensor: manda 100 % quando detecta e 0 % quando não.
 * A saída PNP "flutua" quando não detecta, então o firmware liga o pull-down interno.
 *
 * ATENÇÃO: o CR18-8DP costuma ser alimentado com 10–30 V; a saída precisa ser adaptada
 * para no máximo 3,3 V antes de chegar ao ESP32 (divisor resistivo ou optoacoplador).
 */
void capacitive_sensor_init(void);

/** Envia a leitura quando o estado muda e, no mínimo, a cada 30 s. */
void capacitive_sensor_poll(int64_t now_ms);
