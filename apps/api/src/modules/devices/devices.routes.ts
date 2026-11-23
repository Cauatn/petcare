import { Router } from 'express';
import { notFound } from '../../commons/httpError.js';
import { Reading } from '../readings/reading.model.js';
import {
	buildStatus,
	getStatusBySensorKey,
} from '../readings/readings.service.js';
import { Device, type DeviceDocument } from './device.model.js';
import {
	createDeviceSchema,
	listReadingsQuerySchema,
	updateDeviceSchema,
} from './devices.schemas.js';

export const devicesRouter = Router();

async function withStatus(devices: DeviceDocument[]) {
	const summaries = await getStatusBySensorKey(
		devices.map((device) => device.sensorKey),
	);

	return devices.map((device) => ({
		...device,
		status: buildStatus(device.type, summaries.get(device.sensorKey)),
	}));
}

async function findDeviceOrFail(id: string) {
	const device = await Device.findById(id).lean<DeviceDocument>();
	if (!device) throw notFound('Dispositivo não encontrado');
	return device;
}

devicesRouter.get('/', async (_req, res) => {
	const devices = await Device.find().sort({ createdAt: 1 }).lean<DeviceDocument[]>();
	res.json(await withStatus(devices));
});

devicesRouter.post('/', async (req, res) => {
	const payload = createDeviceSchema.parse(req.body);
	const device = await Device.create(payload);
	const [created] = await withStatus([await findDeviceOrFail(device.id)]);
	res.status(201).json(created);
});

devicesRouter.get('/:id', async (req, res) => {
	const [device] = await withStatus([await findDeviceOrFail(req.params.id)]);
	res.json(device);
});

devicesRouter.patch('/:id', async (req, res) => {
	const payload = updateDeviceSchema.parse(req.body);
	const device = await Device.findByIdAndUpdate(req.params.id, payload, {
		new: true,
		runValidators: true,
	}).lean<DeviceDocument>();
	if (!device) throw notFound('Dispositivo não encontrado');

	const [updated] = await withStatus([device]);
	res.json(updated);
});

devicesRouter.delete('/:id', async (req, res) => {
	const device = await Device.findByIdAndDelete(req.params.id);
	if (!device) throw notFound('Dispositivo não encontrado');
	res.status(204).end();
});

devicesRouter.get('/:id/readings', async (req, res) => {
	const { limit, since } = listReadingsQuerySchema.parse(req.query);
	const device = await findDeviceOrFail(req.params.id);

	const readings = await Reading.find({
		sensorKey: device.sensorKey,
		...(since ? { createdAt: { $gte: new Date(since) } } : {}),
	})
		// Com `since` (linha do tempo do dia) o envelope/features pesam e não são usados
		.select(since ? { envelope: 0, features: 0 } : {})
		.sort({ createdAt: -1 })
		.limit(limit)
		.lean();

	// Mais antiga primeiro, pronto para o gráfico
	res.json(readings.reverse());
});
