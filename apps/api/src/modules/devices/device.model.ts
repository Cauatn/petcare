import { type InferSchemaType, Schema, model } from 'mongoose';

export const deviceTypes = [
	'litterBox',
	'waterBowl',
	'foodBowl',
	'microphone',
] as const;

const deviceSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		type: { type: String, enum: deviceTypes, required: true },
		/** Identificador que o ESP32 manda junto da leitura (ex.: "esp32-01:water"). */
		sensorKey: { type: String, required: true, unique: true, trim: true },
		/** Posição no plano da casa, em % (0–100). */
		position: {
			x: { type: Number, required: true, min: 0, max: 100 },
			y: { type: Number, required: true, min: 0, max: 100 },
		},
		/** Capacidade do pote cheio: ml (waterBowl) ou g (foodBowl). Converte o nível em % em consumo. */
		capacity: { type: Number, min: 1, default: null },
	},
	{ timestamps: true, versionKey: false },
);

export type DeviceDocument = InferSchemaType<typeof deviceSchema> & {
	_id: string;
};

export const Device = model('Device', deviceSchema);
