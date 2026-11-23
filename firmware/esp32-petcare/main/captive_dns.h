#pragma once

#include <stdint.h>

/**
 * Servidor DNS mínimo para o portal cativo: responde a QUALQUER consulta do tipo A com o IP
 * informado (o da placa no Hotspot). Assim o celular que conecta em "PetCare-Setup" resolve os
 * endereços de teste de internet para a placa e abre a página de configuração sozinho.
 * `ip` em ordem de rede (a, b, c, d).
 */
void captive_dns_start(const uint8_t ip[4]);

/** Para o servidor e libera a porta 53. */
void captive_dns_stop(void);
