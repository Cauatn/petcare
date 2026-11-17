#pragma once

#include <stdint.h>

/** Pontos máximos do envelope (volume ao longo do som) enviados à API. */
#define VOCAL_ENVELOPE_POINTS 64

/**
 * Medidas acústicas de um som do gato (extraídas em mic_sensor.c).
 * Use NAN para medidas indisponíveis (ex.: modo só-DO) — viram `null` no JSON.
 */
typedef struct {
    float f0_hz;        /* tom médio nos trechos tonais */
    float f0_start_hz;  /* tom no início do som */
    float f0_end_hz;    /* tom no fim do som */
    float voiced_ratio; /* fração de quadros tonais (0–1) */
    float zcr;          /* cruzamentos por zero por amostra (0–1) */
    int32_t bursts;     /* rajadas separadas por pausas curtas */
    /* Volume (dB, mesma escala de `value`) em pontos igualmente espaçados ao longo
     * da duração. envelope_len = 0 quando não há sinal analógico (não vai no JSON). */
    uint8_t envelope[VOCAL_ENVELOPE_POINTS];
    uint8_t envelope_len;
} vocal_features_t;

/**
 * Inicializa a fila e a task em segundo plano para envio não-bloqueante de heartbeats e leituras HTTP/UDP.
 */
void api_client_init(void);

/**
 * Enfileira uma leitura de sensor para envio assíncrono em POST <API_BASE>/readings.
 */
void api_client_send_reading(const char* sensor_suffix, float value);

/**
 * Enfileira um som do gato: volume relativo, duração e medidas acústicas.
 * A API classifica o tipo (miado curto, longo, trinado, uivo, sibilo, tagarelar).
 */
void api_client_send_vocalization(const char* sensor_suffix, float value, uint32_t duration_ms,
                                  const vocal_features_t* features);
