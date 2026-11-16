#include "sonar_sensor.h"

#include <math.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

#include "api_client.h"
#include "driver/gpio.h"
#include "driver/uart.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"

static const char* TAG = "sonar_sensor";

#define SONAR_UART_NUM UART_NUM_2
#define SONAR_RX_PIN GPIO_NUM_16
#define SONAR_BAUD_RATE 9600
#define UART_BUF_SIZE 256

#define SONAR_WARMUP_SAMPLES 20         // ~1s inicial para calibrar a distância estável da caixa vazia
#define SONAR_DROP_DELTA_CM 10.0f       // queda mínima (cm) abaixo do baseline para detectar entrada
#define SONAR_EXIT_HYSTERESIS_CM 6.0f   // margem (cm) abaixo do baseline para confirmar saída
#define SONAR_ENTER_CONFIRM_SAMPLES 10  // ~0.5s sustentado abaixo do limiar para filtrar ruído e confirmar entrada
#define SONAR_EXIT_CONFIRM_SAMPLES 30   // ~1.5s de volta ao baseline para confirmar que o gato saiu
#define SONAR_LOG_DIFF_CM 3.0f          // só imprime no console se variar >= 3cm (ou no resumo periódico)
#define SONAR_LOG_SUMMARY_MS 3000       // intervalo (ms) para logar status resumido no console

typedef struct {
    float baseline_cm;
    float last_logged_cm;
    int warmup_count;
    int enter_streak;
    int exit_streak;
    bool cat_inside;
    int64_t last_summary_ms;
} sonar_detector_t;

static sonar_detector_t s_detector = {0};
static char s_packet[8] = {0};
static int s_packet_idx = 0;

void sonar_sensor_init(void) {
    const uart_config_t uart_config = {
        .baud_rate = SONAR_BAUD_RATE,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };

    ESP_ERROR_CHECK(uart_driver_install(SONAR_UART_NUM, UART_BUF_SIZE * 2, 0, 0, NULL, 0));
    ESP_ERROR_CHECK(uart_param_config(SONAR_UART_NUM, &uart_config));
    ESP_ERROR_CHECK(
        uart_set_pin(SONAR_UART_NUM, UART_PIN_NO_CHANGE, SONAR_RX_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));

    // O LV-MaxSonar-EZ1 envia serial invertida (RS-232 0-Vcc).
    ESP_ERROR_CHECK(uart_set_line_inverse(SONAR_UART_NUM, UART_SIGNAL_RXD_INV));

    // Limiar do FIFO em 5 bytes ("RXXX\r") para leitura sem delay:
    ESP_ERROR_CHECK(uart_set_rx_full_threshold(SONAR_UART_NUM, 5));
    ESP_ERROR_CHECK(uart_set_rx_timeout(SONAR_UART_NUM, 2));

    ESP_LOGI(TAG, "LV-MaxSonar-EZ1 inicializado na UART2 (GPIO %d)", SONAR_RX_PIN);
}

static void sonar_process_sample(sonar_detector_t* det, float cm, int64_t now_ms) {
    if (det->warmup_count < SONAR_WARMUP_SAMPLES) {
        det->warmup_count++;
        if (det->warmup_count == 1) {
            det->baseline_cm = cm;
        } else {
            det->baseline_cm = det->baseline_cm + (cm - det->baseline_cm) / (float)det->warmup_count;
        }

        if (det->warmup_count == SONAR_WARMUP_SAMPLES) {
            det->last_logged_cm = cm;
            det->last_summary_ms = now_ms;
            ESP_LOGI(TAG, "Baseline inicial calibrado: %.1f cm (queda >= %.0f cm dispara entrada)", det->baseline_cm,
                     SONAR_DROP_DELTA_CM);
        }
        return;
    }

    float drop_cm = det->baseline_cm - cm;

    if (!det->cat_inside) {
        if (drop_cm >= SONAR_DROP_DELTA_CM) {
            det->enter_streak++;
            if (det->enter_streak >= SONAR_ENTER_CONFIRM_SAMPLES) {
                det->cat_inside = true;
                det->enter_streak = 0;
                det->exit_streak = 0;
                det->last_logged_cm = cm;
                ESP_LOGI(TAG, "Gato ENTROU na caixa! Distancia caiu de %.1f cm para %.1f cm", det->baseline_cm, cm);
                api_client_send_reading("proximity", 1.0f);
            }
        } else {
            det->enter_streak = 0;
            if (fabsf(drop_cm) < SONAR_EXIT_HYSTERESIS_CM) {
                det->baseline_cm = (det->baseline_cm * 0.98f) + (cm * 0.02f);
            }
        }
    } else {
        if (drop_cm <= SONAR_EXIT_HYSTERESIS_CM) {
            det->exit_streak++;
            if (det->exit_streak >= SONAR_EXIT_CONFIRM_SAMPLES) {
                det->cat_inside = false;
                det->exit_streak = 0;
                det->enter_streak = 0;
                det->last_logged_cm = cm;
                ESP_LOGI(TAG, "Gato SAIU da caixa! Distancia voltou para %.1f cm (base: %.1f cm)", cm,
                         det->baseline_cm);
                api_client_send_reading("proximity", 0.0f);
            }
        } else {
            det->exit_streak = 0;
        }
    }

    if (fabsf(cm - det->last_logged_cm) >= SONAR_LOG_DIFF_CM ||
        (now_ms - det->last_summary_ms >= SONAR_LOG_SUMMARY_MS)) {
        det->last_logged_cm = cm;
        det->last_summary_ms = now_ms;
        printf("[SONAR] Atual: %.1f cm | Base: %.1f cm | Estado: %s\n", cm, det->baseline_cm,
               det->cat_inside ? "OCUPADA (1)" : "LIVRE (0)");
    }
}

void sonar_sensor_poll(int64_t now_ms) {
    uint8_t c;
    int len = uart_read_bytes(SONAR_UART_NUM, &c, 1, pdMS_TO_TICKS(10));

    while (len > 0) {
        if (c == 'R') {
            s_packet_idx = 0;
        } else if (c == '\r') {
            s_packet[s_packet_idx] = '\0';
            if (s_packet_idx == 3) {
                int inches = atoi(s_packet);
                float cm = inches * 2.54f;
                if (cm > 0.0f) {
                    sonar_process_sample(&s_detector, cm, now_ms);
                }
            }
            s_packet_idx = 0;
        } else if (c >= '0' && c <= '9' && s_packet_idx < 3) {
            s_packet[s_packet_idx++] = (char)c;
        }

        len = uart_read_bytes(SONAR_UART_NUM, &c, 1, 0);
    }
}
