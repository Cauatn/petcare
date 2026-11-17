import { Router } from 'express';
import { requireDeviceToken } from '../../commons/requireDeviceToken.js';
import { touchPairedBoards } from '../pairing/pairing.service.js';
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
	await touchPairedBoards(readings.map((reading) => reading.sensorKey));

	res.status(201).json({ inserted: created.length });
});
