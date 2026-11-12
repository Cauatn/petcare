import { Router } from 'express';
import { env } from '../../config/env.js';
import { HttpError } from '../../commons/httpError.js';
import { Reading } from './reading.model.js';
import { ingestReadingsSchema } from './readings.schemas.js';

export const readingsRouter = Router();

/** Endpoint chamado pelo ESP32. */
readingsRouter.post('/', async (req, res) => {
	if (env.DEVICE_TOKEN && req.header('x-device-token') !== env.DEVICE_TOKEN) {
		throw new HttpError(401, 'Token do dispositivo inválido');
	}

	const readings = ingestReadingsSchema.parse(req.body);
	const created = await Reading.insertMany(
		readings.map((reading) => ({
			sensorKey: reading.sensorKey,
			value: reading.value,
			createdAt: reading.recordedAt ? new Date(reading.recordedAt) : new Date(),
		})),
	);

	res.status(201).json({ inserted: created.length });
});
