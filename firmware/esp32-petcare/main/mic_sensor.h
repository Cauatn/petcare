#pragma once

/**
 * Microfone de eletreto com comparador LM393 (placa vermelha: AO + DO).
 *
 * - AO -> GPIO34 (ADC1_CH6), amostrado continuamente a 20 kHz (reduzido para 10 kHz).
 * - DO -> GPIO35 (interrupção): ajuda a detectar o início do som.
 * - Alimentar o módulo em 3,3 V para o AO não passar da faixa do ADC.
 *
 * Para cada som do gato, mede duração, volume relativo, tom (f0) no início/fim,
 * tonalidade, cruzamentos por zero e rajadas, e envia para a API, que classifica
 * o tipo. Com MIC_HAS_ANALOG = 0 (FC-04 / placa preta, só DO) envia apenas
 * duração e rajadas.
 *
 * Roda numa task própria (núcleo 1); não precisa de poll no loop principal.
 */
void mic_sensor_init(void);
