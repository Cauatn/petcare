#include "mic_sensor.h"

#include <math.h>
#include <stdbool.h>
#include <string.h>

#include "api_client.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

/* ─── Hardware ─────────────────────────────────────────────────────────── */

/* 1 = placa vermelha (AO + DO). 0 = FC-04 / placa preta (só DO). */
#ifndef MIC_HAS_ANALOG
#define MIC_HAS_ANALOG 1
#endif

#define MIC_SENSOR_SUFFIX "mic"
#define MIC_DO_GPIO GPIO_NUM_35

#if MIC_HAS_ANALOG
#include "esp_adc/adc_continuous.h"
#define MIC_ADC_UNIT ADC_UNIT_1
#define MIC_ADC_CHANNEL ADC_CHANNEL_6 /* GPIO34 */
#endif

/* ─── Análise ──────────────────────────────────────────────────────────── */

#define ADC_SAMPLE_RATE_HZ 20000 /* mínimo do modo contínuo no ESP32 */
#define DECIMATION 2
#define SAMPLE_RATE_HZ (ADC_SAMPLE_RATE_HZ / DECIMATION) /* 10 kHz */
#define FRAME_SAMPLES 256                                /* ~25,6 ms */
#define FRAME_MS ((FRAME_SAMPLES * 1000) / SAMPLE_RATE_HZ)

/* Tom procurado entre 80 Hz (rosnado) e 1500 Hz (miados agudos). */
#define F0_MIN_HZ 80
#define F0_MAX_HZ 1500
#define LAG_MIN (SAMPLE_RATE_HZ / F0_MAX_HZ)
#define LAG_MAX (SAMPLE_RATE_HZ / F0_MIN_HZ)
/* Autocorrelação normalizada acima disso = quadro tonal (miado); abaixo = chiado. */
#define VOICED_CLARITY 0.5f
/* Primeiro pico com pelo menos 90% da correlação máxima = período do som. */
#define PEAK_PICK_RATIO 0.9f

/* ─── Detecção de eventos (calibrar na bancada) ────────────────────────── */

#define ONSET_MARGIN_DB 12.0f      /* acima do ruído de fundo = som */
#define NOISE_FLOOR_ALPHA 0.02f    /* adaptação do ruído de fundo */
#define NOISE_WARMUP_FRAMES 40     /* ~1 s para medir o ambiente */
#define END_SILENCE_MS 200         /* silêncio que encerra o som */
#define BURST_GAP_MIN_MS 40        /* pausa que separa rajadas (tagarelar) */
#define MIN_EVENT_MS 150           /* ignora estalos */
#define MAX_EVENT_MS 10000         /* corta sons longos demais (TV, aspirador) */
#define F0_EDGE_FRAMES 3           /* quadros tonais usados para o tom de início/fim */

static const char* TAG = "mic_sensor";

/* Bordas do DO desde o último quadro (incrementado na interrupção). */
static volatile uint32_t s_do_edges = 0;

static void IRAM_ATTR do_isr(void* arg) {
    (void)arg;
    s_do_edges++;
}

static uint32_t take_do_edges(void) {
    uint32_t edges = s_do_edges;
    s_do_edges = 0;
    return edges;
}

static void init_do_gpio(void) {
    gpio_config_t io = {
        .pin_bit_mask = 1ULL << MIC_DO_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE, /* GPIO35 não tem pull-up; o módulo já tem */
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_ANYEDGE,
    };
    gpio_config(&io);
    gpio_install_isr_service(0);
    gpio_isr_handler_add(MIC_DO_GPIO, do_isr, NULL);
}

/* ─── Acumulador de um som ─────────────────────────────────────────────── */

typedef struct {
    bool active;
    int64_t start_ms;
    int64_t last_loud_ms;
    int loud_frames;
    int voiced_frames;
    float peak_db;
    double zcr_sum;
    double f0_sum;
    int f0_count;
    float f0_head[F0_EDGE_FRAMES];
    int f0_head_count;
    float f0_tail[F0_EDGE_FRAMES];
    int f0_tail_count;
    int f0_tail_pos;
    int bursts;
} vocal_event_t;

static float mean_of(const float* values, int count) {
    if (count <= 0) return NAN;
    float sum = 0;
    for (int i = 0; i < count; i++) sum += values[i];
    return sum / (float)count;
}

static void event_start(vocal_event_t* ev, int64_t now_ms) {
    memset(ev, 0, sizeof(*ev));
    ev->active = true;
    ev->start_ms = now_ms - FRAME_MS;
    ev->last_loud_ms = now_ms;
    ev->bursts = 1;
    ev->peak_db = -INFINITY;
}

static void event_add_frame(vocal_event_t* ev, int64_t now_ms, float rms_db, float zcr, bool voiced, float f0) {
    /* Pausa curta antes deste quadro = nova rajada */
    if (now_ms - ev->last_loud_ms > FRAME_MS + BURST_GAP_MIN_MS) ev->bursts++;
    ev->last_loud_ms = now_ms;
    ev->loud_frames++;
    ev->zcr_sum += zcr;
    if (rms_db > ev->peak_db) ev->peak_db = rms_db;
    if (!voiced) return;

    ev->voiced_frames++;
    ev->f0_sum += f0;
    ev->f0_count++;
    if (ev->f0_head_count < F0_EDGE_FRAMES) ev->f0_head[ev->f0_head_count++] = f0;
    ev->f0_tail[ev->f0_tail_pos] = f0;
    ev->f0_tail_pos = (ev->f0_tail_pos + 1) % F0_EDGE_FRAMES;
    if (ev->f0_tail_count < F0_EDGE_FRAMES) ev->f0_tail_count++;
}

static void event_finish(vocal_event_t* ev, bool has_analog) {
    uint32_t duration_ms = (uint32_t)(ev->last_loud_ms - ev->start_ms);
    ev->active = false;
    if (duration_ms < MIN_EVENT_MS) return;

    vocal_features_t f = {
        .f0_hz = NAN,
        .f0_start_hz = NAN,
        .f0_end_hz = NAN,
        .voiced_ratio = NAN,
        .zcr = NAN,
        .bursts = ev->bursts,
    };
    float value = 1.0f; /* só DO: não há volume */

    if (has_analog) {
        value = ev->peak_db;
        f.voiced_ratio = ev->loud_frames ? (float)ev->voiced_frames / (float)ev->loud_frames : 0.0f;
        f.zcr = ev->loud_frames ? (float)(ev->zcr_sum / ev->loud_frames) : 0.0f;
        if (ev->f0_count > 0) {
            f.f0_hz = (float)(ev->f0_sum / ev->f0_count);
            f.f0_start_hz = mean_of(ev->f0_head, ev->f0_head_count);
            f.f0_end_hz = mean_of(ev->f0_tail, ev->f0_tail_count);
        }
    }

    ESP_LOGI(TAG, "Som: %lums vol %.1f f0 %.0f (%.0f->%.0f) tonal %.2f zcr %.3f rajadas %ld",
             (unsigned long)duration_ms, value, f.f0_hz, f.f0_start_hz, f.f0_end_hz, f.voiced_ratio, f.zcr,
             (long)f.bursts);
    api_client_send_vocalization(MIC_SENSOR_SUFFIX, value, duration_ms, &f);
}

#if MIC_HAS_ANALOG

/* ─── Análise de um quadro ─────────────────────────────────────────────── */

static float s_frame[FRAME_SAMPLES];
static float s_corr[LAG_MAX + 1];

/**
 * Volume (RMS em dB, escala relativa: 20·log10 das contagens do ADC),
 * cruzamentos por zero e tom por autocorrelação normalizada.
 */
static void analyze_frame(const float* x, int n, float* out_db, float* out_zcr, bool* out_voiced, float* out_f0) {
    float energy = 0;
    int crossings = 0;
    for (int i = 0; i < n; i++) {
        energy += x[i] * x[i];
        if (i > 0 && ((x[i - 1] < 0) != (x[i] < 0))) crossings++;
    }
    *out_db = 20.0f * log10f(sqrtf(energy / (float)n) + 1e-3f);
    *out_zcr = (float)crossings / (float)n;

    float best = 0;
    for (int lag = LAG_MIN; lag <= LAG_MAX; lag++) {
        float num = 0, e1 = 0, e2 = 0;
        for (int i = 0; i < n - lag; i++) {
            num += x[i] * x[i + lag];
            e1 += x[i] * x[i];
            e2 += x[i + lag] * x[i + lag];
        }
        s_corr[lag] = num / sqrtf(e1 * e2 + 1e-6f);
        if (s_corr[lag] > best) best = s_corr[lag];
    }

    /* Um som periódico correlaciona igualmente bem em 2, 3... períodos: o primeiro
     * pico perto do máximo é o período real (evita erro de oitava para baixo). */
    int best_lag = 0;
    for (int lag = LAG_MIN; lag <= LAG_MAX; lag++) {
        bool is_peak = (lag == LAG_MIN || s_corr[lag] >= s_corr[lag - 1]) &&
                       (lag == LAG_MAX || s_corr[lag] >= s_corr[lag + 1]);
        if (is_peak && s_corr[lag] >= PEAK_PICK_RATIO * best) {
            best_lag = lag;
            break;
        }
    }
    *out_voiced = best >= VOICED_CLARITY && best_lag > 0;
    if (!*out_voiced) {
        *out_f0 = 0.0f;
        return;
    }

    /* Interpolação parabólica em torno do pico: precisão abaixo de 1 amostra */
    float lag = (float)best_lag;
    if (best_lag > LAG_MIN && best_lag < LAG_MAX) {
        float a = s_corr[best_lag - 1], b = s_corr[best_lag], c = s_corr[best_lag + 1];
        float denom = a - 2.0f * b + c;
        if (fabsf(denom) > 1e-6f) lag += 0.5f * (a - c) / denom;
    }
    *out_f0 = (float)SAMPLE_RATE_HZ / lag;
}

static void mic_task(void* arg) {
    (void)arg;
    adc_continuous_handle_t handle = NULL;
    const uint32_t frame_bytes = FRAME_SAMPLES * DECIMATION * SOC_ADC_DIGI_RESULT_BYTES;

    adc_continuous_handle_cfg_t handle_cfg = {
        .max_store_buf_size = frame_bytes * 4,
        .conv_frame_size = frame_bytes,
    };
    ESP_ERROR_CHECK(adc_continuous_new_handle(&handle_cfg, &handle));

    adc_digi_pattern_config_t pattern = {
        .atten = ADC_ATTEN_DB_12,
        .channel = MIC_ADC_CHANNEL,
        .unit = MIC_ADC_UNIT,
        .bit_width = SOC_ADC_DIGI_MAX_BITWIDTH,
    };
    adc_continuous_config_t adc_cfg = {
        .sample_freq_hz = ADC_SAMPLE_RATE_HZ,
        .conv_mode = ADC_CONV_SINGLE_UNIT_1,
        .format = ADC_DIGI_OUTPUT_FORMAT_TYPE1,
        .pattern_num = 1,
        .adc_pattern = &pattern,
    };
    ESP_ERROR_CHECK(adc_continuous_config(handle, &adc_cfg));
    ESP_ERROR_CHECK(adc_continuous_start(handle));

    static uint8_t raw[FRAME_SAMPLES * DECIMATION * SOC_ADC_DIGI_RESULT_BYTES];
    float dc = 2048.0f;
    float noise_floor = 0;
    int warmup = 0;
    vocal_event_t ev = {0};

    while (1) {
        uint32_t got = 0;
        if (adc_continuous_read(handle, raw, frame_bytes, &got, 1000) != ESP_OK || got < frame_bytes) {
            continue;
        }

        /* Decimação 2:1 (média de pares — também desfaz a troca de pares do I2S-ADC do ESP32)
         * e remoção do nível DC com média móvel. */
        int n = 0;
        float pair_sum = 0;
        int pair_count = 0;
        for (uint32_t i = 0; i + SOC_ADC_DIGI_RESULT_BYTES <= got && n < FRAME_SAMPLES;
             i += SOC_ADC_DIGI_RESULT_BYTES) {
            adc_digi_output_data_t* p = (adc_digi_output_data_t*)&raw[i];
            if (p->type1.channel != MIC_ADC_CHANNEL) continue;
            pair_sum += (float)p->type1.data;
            if (++pair_count == DECIMATION) {
                float sample = pair_sum / DECIMATION;
                dc += 0.001f * (sample - dc);
                s_frame[n++] = sample - dc;
                pair_sum = 0;
                pair_count = 0;
            }
        }
        if (n < FRAME_SAMPLES / 2) continue;

        float rms_db, zcr, f0;
        bool voiced;
        analyze_frame(s_frame, n, &rms_db, &zcr, &voiced, &f0);
        int64_t now_ms = esp_timer_get_time() / 1000;
        bool do_active = take_do_edges() > 0;

        /* Primeiro ~1 s: mede o ruído do ambiente */
        if (warmup < NOISE_WARMUP_FRAMES) {
            noise_floor = warmup == 0 ? rms_db : noise_floor + (rms_db - noise_floor) / (float)(warmup + 1);
            warmup++;
            continue;
        }

        bool loud = rms_db > noise_floor + ONSET_MARGIN_DB || do_active;

        if (loud) {
            if (!ev.active) event_start(&ev, now_ms);
            event_add_frame(&ev, now_ms, rms_db, zcr, voiced, f0);
            if (now_ms - ev.start_ms > MAX_EVENT_MS) event_finish(&ev, true);
        } else {
            noise_floor += NOISE_FLOOR_ALPHA * (rms_db - noise_floor);
            if (ev.active && now_ms - ev.last_loud_ms >= END_SILENCE_MS) event_finish(&ev, true);
        }
    }
}

#else /* só DO */

/* Sem sinal analógico: o DO pulsa enquanto o som passa do limite do trimpot. */
static void mic_task(void* arg) {
    (void)arg;
    vocal_event_t ev = {0};

    while (1) {
        vTaskDelay(pdMS_TO_TICKS(FRAME_MS));
        int64_t now_ms = esp_timer_get_time() / 1000;

        if (take_do_edges() > 0) {
            if (!ev.active) event_start(&ev, now_ms);
            event_add_frame(&ev, now_ms, 0, 0, false, 0);
            if (now_ms - ev.start_ms > MAX_EVENT_MS) event_finish(&ev, false);
        } else if (ev.active && now_ms - ev.last_loud_ms >= END_SILENCE_MS) {
            event_finish(&ev, false);
        }
    }
}

#endif

void mic_sensor_init(void) {
    init_do_gpio();
    /* Núcleo 1: o Wi-Fi roda no núcleo 0 */
    xTaskCreatePinnedToCore(mic_task, "mic_sensor", 4096, NULL, 5, NULL, 1);
    ESP_LOGI(TAG, "Microfone iniciado (%s)", MIC_HAS_ANALOG ? "AO+DO" : "só DO");
}
