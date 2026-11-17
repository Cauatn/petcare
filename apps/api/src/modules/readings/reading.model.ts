import { Schema, model } from 'mongoose';
import { vocalizationKinds } from './vocalization.classifier.js';

/**
 * Uma leitura enviada pelo ESP32.
 * - waterBowl/foodBowl: `value` = nível em % (envio periódico)
 * - litterBox: `value` = 1 quando o gato entra e 0 quando sai (evento)
 * - microphone: um som do gato (evento). `value` = volume relativo,
 *   `durationMs` = duração, `features` = medidas acústicas e `kind` = tipo
 *   (classificado pela API quando o ESP32 não envia).
 */
const readingSchema = new Schema(
	{
		sensorKey: { type: String, required: true, index: true },
		value: { type: Number, required: true },
		durationMs: { type: Number, min: 0 },
		kind: { type: String, enum: vocalizationKinds },
		features: {
			type: new Schema(
				{
					f0Hz: Number,
					f0StartHz: Number,
					f0EndHz: Number,
					voicedRatio: Number,
					zcr: Number,
					bursts: Number,
				},
				{ _id: false },
			),
			default: undefined,
		},
		createdAt: { type: Date, default: () => new Date() },
	},
	{ versionKey: false },
);

readingSchema.index({ sensorKey: 1, createdAt: -1 });

export const Reading = model('Reading', readingSchema);
