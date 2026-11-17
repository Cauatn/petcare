#pragma once

#include <stddef.h>

/**
 * Copia `in` para `out` escapando aspas, barras invertidas e caracteres de controle,
 * para que o texto possa ser interpolado com segurança dentro de uma string JSON.
 * Sempre termina `out` com '\0'; trunca sem quebrar uma sequência de escape.
 */
void json_escape(const char* in, char* out, size_t out_len);
