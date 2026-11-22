/** Um quadro (~25 ms) do sinal do microfone, enviado pelo ESP32. */
export type MicFrame = {
	sensorKey: string;
	/** Volume do quadro (dB relativo). */
	rmsDb: number;
	/** Ruído de fundo estimado pelo firmware. */
	noiseDb: number;
	/** Acima disso o quadro conta como som (ruído + margem). */
	thresholdDb: number;
	f0Hz?: number | null;
	zcr?: number;
	/** O DO do módulo LM393 pulsou (limite do trimpot). */
	doActive: boolean;
	/** O firmware considerou o quadro como som. */
	loud: boolean;
	voiced?: boolean;
	/** Menor/maior contagem do ADC no quadro (0–4095). */
	rawMin: number;
	rawMax: number;
	/** ADC (0–4095) depois da decimação, antes do filtro de DC. */
	raw: number[];
	/** O mesmo trecho depois do filtro de DC (centrado em 0). */
	filtered: number[];
	receivedAt: number;
};

export type MicHistoryPoint = {
	t: number;
	rmsDb: number;
	noiseDb: number;
	thresholdDb: number;
	doActive: boolean;
	loud: boolean;
};

export type MicMonitor = {
	online: boolean;
	ageMs: number | null;
	latest: MicFrame | null;
	history: MicHistoryPoint[];
};
