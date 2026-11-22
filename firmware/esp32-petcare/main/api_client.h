#pragma once

#include <stdbool.h>
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

/** Pontos de cada onda enviados ao monitor ao vivo (um quadro de ~25 ms). */
#define MIC_LIVE_POINTS 64

/**
 * "Foto" do sinal do microfone para o monitor ao vivo do painel (osciloscópio).
 * Não vai para o banco: a API só guarda em memória.
 */
typedef struct {
    float rms_db;       /* volume do quadro (dB relativo) */
    float noise_db;     /* ruído de fundo estimado */
    float threshold_db; /* acima disso o quadro conta como som */
    float f0_hz;        /* tom do quadro (0 = sem tom) */
    float zcr;          /* cruzamentos por zero por amostra */
    uint16_t raw_min;   /* menor/maior contagem do ADC no quadro (detecta saturação) */
    uint16_t raw_max;
    bool do_active;     /* DO do módulo pulsou (trimpot) */
    bool loud;          /* o firmware considerou o quadro como som */
    bool voiced;
    int16_t raw[MIC_LIVE_POINTS];      /* ADC (0–4095), antes do filtro de DC */
    int16_t filtered[MIC_LIVE_POINTS]; /* depois do filtro de DC (centrado em 0) */
} mic_live_t;

/**
 * Publica o quadro mais recente do microfone (só guarda o último; nunca bloqueia).
 * A task da API decide quando enviar: devagar em repouso, rápido quando o painel está aberto.
 */
void api_client_publish_mic_live(const mic_live_t* live);
