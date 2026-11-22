#include "captive_dns.h"

#include <stdbool.h>
#include <string.h>

#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "lwip/sockets.h"

static const char* TAG = "captive_dns";

#define DNS_PORT 53
#define DNS_BUF_SIZE 256
#define DNS_HEADER_LEN 12

/* s_run: o servidor deve estar no ar. s_alive: a task existe. Os dois mudam juntos sob
 * s_lock, para que um start logo depois de um stop nunca fique sem servidor. */
static portMUX_TYPE s_lock = portMUX_INITIALIZER_UNLOCKED;
static volatile bool s_run = false;
static bool s_alive = false;
static uint8_t s_ip[4];
/**
 * Monta a resposta a partir da consulta em `buf`. Devolve o tamanho da resposta, ou 0 para ignorar.
 * Só a primeira pergunta é respondida; A recebe o IP da placa, os outros tipos recebem resposta vazia.
 */
static int build_reply(uint8_t* buf, int len, int cap) {
    if (len < DNS_HEADER_LEN + 5) return 0;
    if (buf[2] & 0x80) return 0;           /* QR=1: já é uma resposta */
    if (((buf[2] >> 3) & 0x0F) != 0) return 0; /* só consulta padrão */
    if (((buf[4] << 8) | buf[5]) < 1) return 0;

    int pos = DNS_HEADER_LEN;
    while (pos < len && buf[pos] != 0) {
        if ((buf[pos] & 0xC0) != 0) return 0; /* compressão não aparece em perguntas */
        pos += buf[pos] + 1;
    }
    pos++; /* zero final do nome */
    if (pos + 4 > len) return 0;
    uint16_t qtype = (uint16_t)((buf[pos] << 8) | buf[pos + 1]);
    int question_end = pos + 4;

    bool answer = (qtype == 1); /* A */
    int total = question_end + (answer ? 16 : 0);
    if (total > cap) return 0;

    buf[2] = 0x81; /* QR=1, opcode 0, RD=1 */
    buf[3] = 0x80; /* RA=1, sem erro */
    buf[4] = 0x00;
    buf[5] = 0x01; /* uma pergunta (as demais são descartadas) */
    buf[6] = 0x00;
    buf[7] = answer ? 0x01 : 0x00;
    memset(&buf[8], 0, 4);

    if (answer) {
        uint8_t* a = &buf[question_end];
        a[0] = 0xC0; a[1] = 0x0C;             /* nome: ponteiro para a pergunta */
        a[2] = 0x00; a[3] = 0x01;             /* tipo A */
        a[4] = 0x00; a[5] = 0x01;             /* classe IN */
        a[6] = 0x00; a[7] = 0x00; a[8] = 0x00; a[9] = 0x3C; /* TTL 60 s */
        a[10] = 0x00; a[11] = 0x04;           /* tamanho */
        memcpy(&a[12], s_ip, 4);
    }
    return total;
}

static int open_dns_socket(void) {
    int sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_IP);
    if (sock < 0) return -1;
    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(DNS_PORT),
        .sin_addr.s_addr = htonl(INADDR_ANY),
    };
    if (bind(sock, (struct sockaddr*)&addr, sizeof(addr)) < 0) {
        close(sock);
        return -1;
    }
    struct timeval tv = {.tv_sec = 1, .tv_usec = 0};
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    return sock;
}

static void dns_task(void* arg) {
    (void)arg;
    uint8_t buf[DNS_BUF_SIZE];

    for (;;) {
        int sock = open_dns_socket();
        if (sock < 0) {
            ESP_LOGE(TAG, "Não foi possível abrir a porta %d", DNS_PORT);
            taskENTER_CRITICAL(&s_lock);
            s_alive = false;
            s_run = false;
            taskEXIT_CRITICAL(&s_lock);
            break;
        }
        ESP_LOGI(TAG, "DNS do portal ativo: todo nome -> %d.%d.%d.%d", s_ip[0], s_ip[1], s_ip[2], s_ip[3]);

        while (s_run) {
            struct sockaddr_in from;
            socklen_t from_len = sizeof(from);
            int n = recvfrom(sock, buf, sizeof(buf), 0, (struct sockaddr*)&from, &from_len);
            if (n <= 0) continue; /* timeout: confere s_run de novo */
            int out = build_reply(buf, n, sizeof(buf));
            if (out > 0) sendto(sock, buf, out, 0, (struct sockaddr*)&from, from_len);
        }
        close(sock);

        /* Pediram para religar enquanto saíamos? Continua no ar em vez de terminar. */
        taskENTER_CRITICAL(&s_lock);
        bool again = s_run;
        if (!again) s_alive = false;
        taskEXIT_CRITICAL(&s_lock);
        if (!again) break;
    }

    ESP_LOGI(TAG, "DNS do portal parado");
    vTaskDelete(NULL);
}

void captive_dns_start(const uint8_t ip[4]) {
    taskENTER_CRITICAL(&s_lock);
    memcpy(s_ip, ip, 4);
    s_run = true;
    bool spawn = !s_alive; /* task ainda viva (saindo ou não) continua o trabalho */
    if (spawn) s_alive = true;
    taskEXIT_CRITICAL(&s_lock);

    if (spawn && xTaskCreate(dns_task, "captive_dns", 3072, NULL, 3, NULL) != pdPASS) {
        taskENTER_CRITICAL(&s_lock);
        s_alive = false;
        s_run = false;
        taskEXIT_CRITICAL(&s_lock);
        ESP_LOGE(TAG, "Sem memória para a task do DNS");
    }
}

void captive_dns_stop(void) {
    taskENTER_CRITICAL(&s_lock);
    s_run = false; /* a task sai sozinha em até 1 s */
    taskEXIT_CRITICAL(&s_lock);
}
