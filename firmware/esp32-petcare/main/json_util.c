#include "json_util.h"

#include <stdio.h>

void json_escape(const char* in, char* out, size_t out_len) {
    if (out_len == 0) return;

    size_t o = 0;
    for (const unsigned char* p = (const unsigned char*)in; p && *p; p++) {
        char seq[7];
        size_t n;

        switch (*p) {
            case '"':
                n = snprintf(seq, sizeof(seq), "\\\"");
                break;
            case '\\':
                n = snprintf(seq, sizeof(seq), "\\\\");
                break;
            case '\n':
                n = snprintf(seq, sizeof(seq), "\\n");
                break;
            case '\r':
                n = snprintf(seq, sizeof(seq), "\\r");
                break;
            case '\t':
                n = snprintf(seq, sizeof(seq), "\\t");
                break;
            default:
                if (*p < 0x20) {
                    n = snprintf(seq, sizeof(seq), "\\u%04x", *p);
                } else {
                    seq[0] = (char)*p;
                    seq[1] = '\0';
                    n = 1;
                }
        }

        if (o + n + 1 > out_len) break;
        for (size_t i = 0; i < n; i++) out[o++] = seq[i];
    }
    out[o] = '\0';
}
