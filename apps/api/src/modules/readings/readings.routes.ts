import { Router } from 'express';
import { requireDeviceToken } from '../../commons/requireDeviceToken.js';
import { Reading } from './reading.model.js';
import { ingestReadingsSchema } from './readings.schemas.js';

export const readingsRouter = Router();

/** Endpoint chamado pelo ESP32. */
readingsRouter.post('/', requireDeviceToken, async (req, res) => {
	const readings = ingestReadingsSchema.parse(req.body);
	const created = await Reading.insertMany(
		readings.map((reading) => ({
			sensorKey: reading.sensorKey,
			value: reading.value,
			createdAt: reading.recordedAt
				? new Date(reading.recordedAt)
				: new Date(),
		})),
	);

	res.status(201).json({ inserted: created.length });
});
