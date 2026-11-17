import { z } from 'zod';
import { vocalizationKinds } from './vocalization.classifier.js';

const optionalNumber = z.number().finite().nullable().optional();

const featuresSchema = z.object({
	f0Hz: optionalNumber,
	f0StartHz: optionalNumber,
	f0EndHz: optionalNumber,
	voicedRatio: z.number().min(0).max(1).nullable().optional(),
	zcr: z.number().min(0).max(1).nullable().optional(),
	bursts: z.number().int().min(0).nullable().optional(),
});

const readingSchema = z.object({
	sensorKey: z.string().trim().min(1),
	value: z.number(),
	/** Opcional: horário da medição no ESP32 (ISO). Padrão: agora. */
	recordedAt: z.iso.datetime().optional(),
	/** Microfone: duração do som, em ms. */
	durationMs: z.number().int().min(0).max(60_000).optional(),
	/** Microfone: tipo já classificado no ESP32 (opcional). */
	kind: z.enum(vocalizationKinds).optional(),
	/** Microfone: medidas acústicas para a API classificar. */
	features: featuresSchema.optional(),
	/**
	 * Microfone: volume (dB, mesma escala de `value`) em pontos igualmente
	 * espaçados ao longo de `durationMs`. Desenha a onda no gráfico.
	 */
	envelope: z.array(z.number().finite().min(0).max(150)).max(128).optional(),
});

export type IngestReading = z.infer<typeof readingSchema>;

/** Aceita uma leitura ou um lote: { readings: [...] }. */
export const ingestReadingsSchema = z.union([
	readingSchema.transform((reading) => [reading]),
	z
		.object({ readings: z.array(readingSchema).min(1).max(100) })
		.transform((body) => body.readings),
]);
