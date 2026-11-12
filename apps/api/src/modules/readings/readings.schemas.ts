import { z } from 'zod';

const readingSchema = z.object({
	sensorKey: z.string().trim().min(1),
	value: z.number(),
	/** Opcional: horário da medição no ESP32 (ISO). Padrão: agora. */
	recordedAt: z.iso.datetime().optional(),
});

/** Aceita uma leitura ou um lote: { readings: [...] }. */
export const ingestReadingsSchema = z.union([
	readingSchema.transform((reading) => [reading]),
	z.object({ readings: z.array(readingSchema).min(1).max(100) }).transform(
		(body) => body.readings,
	),
]);
