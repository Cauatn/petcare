/** Prefixo da placa na chave do sensor ("esp32-01:mic" → "esp32-01"). */
export const boardPrefixOf = (sensorKey: string) => sensorKey.split(':')[0];
