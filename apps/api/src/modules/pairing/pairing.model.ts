import { type InferSchemaType, Schema, model } from 'mongoose';

const pairedBoardSchema = new Schema(
	{
		/** Prefixo enviado nos sensorKeys (ex.: "esp32-01"). */
		devicePrefix: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		ssid: { type: String, required: true, trim: true },
		ip: { type: String, required: true, trim: true },
		mac: { type: String, default: null, trim: true },
		lastSeenAt: { type: Date, required: true, default: Date.now },
	},
	{ timestamps: true, versionKey: false },
);

export type PairedBoardDocument = InferSchemaType<typeof pairedBoardSchema> & {
	_id: string;
};

export const PairedBoard = model('PairedBoard', pairedBoardSchema);
