import { Schema, model } from 'mongoose';

/**
 * Uma leitura enviada pelo ESP32.
 * - waterBowl/foodBowl: `value` = nível em % (envio periódico)
 * - litterBox: `value` = 1 a cada presença detectada (evento)
 * - microphone: `value` = pico em dB de um miado detectado (evento)
 */
const readingSchema = new Schema(
	{
		sensorKey: { type: String, required: true, index: true },
		value: { type: Number, required: true },
		createdAt: { type: Date, default: () => new Date() },
	},
	{ versionKey: false },
);

readingSchema.index({ sensorKey: 1, createdAt: -1 });

export const Reading = model('Reading', readingSchema);
