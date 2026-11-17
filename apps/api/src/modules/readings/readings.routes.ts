import { Router } from 'express';
import { requireDeviceToken } from '../../commons/requireDeviceToken.js';
import { touchPairedBoards } from '../pairing/pairing.service.js';
import { Reading } from './reading.model.js';
import {
	type IngestReading,
	ingestReadingsSchema,
} from './readings.schemas.js';
import { classifyVocalization } from './vocalization.classifier.js';

export const readingsRouter = Router();

/** Sons do microfone chegam com duração; sem `kind`, a API classifica. */
function resolveKind(reading: IngestReading) {
	if (reading.kind) return reading.kind;
	if (reading.durationMs == null) return undefined;
	return classifyVocalization({
		durationMs: reading.durationMs,
		value: reading.value,
		features: reading.features,
	});
}

/** Endpoint chamado pelo ESP32. */
readingsRouter.post('/', requireDeviceToken, async (req, res) => {
	const readings = ingestReadingsSchema.parse(req.body);
	const created = await Reading.insertMany(
		readings.map((reading) => ({
			sensorKey: reading.sensorKey,
			value: reading.value,
			durationMs: reading.durationMs,
			kind: resolveKind(reading),
			features: reading.features,
			envelope: reading.envelope,
			createdAt: reading.recordedAt
				? new Date(reading.recordedAt)
				: new Date(),
		})),
	);
	await touchPairedBoards(readings.map((reading) => reading.sensorKey));

	res.status(201).json({ inserted: created.length });
});
