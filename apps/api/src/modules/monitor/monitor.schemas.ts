import { z } from 'zod';

const finite = z.number().finite();

/**
 * "Foto" do sinal do microfone enviada pelo ESP32 (um quadro de ~25 ms).
 * `raw`: contagens do ADC (0–4095) depois da decimação, antes de tirar o nível DC.
 * `filtered`: o mesmo trecho depois do filtro de DC (centrado em zero).
 */
export const monitorFrameSchema = z.object({
	sensorKey: z.string().trim().min(1).max(64),
	rmsDb: finite,
	noiseDb: finite,
	thresholdDb: finite,
	f0Hz: finite.nullable().optional(),
	zcr: finite.min(0).max(1).optional(),
	doActive: z.boolean(),
	loud: z.boolean(),
	voiced: z.boolean().optional(),
	rawMin: z.number().int().min(0).max(4095),
	rawMax: z.number().int().min(0).max(4095),
	raw: z.array(z.number().int().min(0).max(4095)).max(256),
	filtered: z.array(z.number().int().min(-4096).max(4096)).max(256),
});

export type MonitorFrame = z.infer<typeof monitorFrameSchema>;
