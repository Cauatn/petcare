import { Router } from 'express';
import { requireDeviceToken } from '../../commons/requireDeviceToken.js';
import { monitorFrameSchema } from './monitor.schemas.js';
import { getMonitor, isWatched, recordFrame } from './monitor.service.js';

export const monitorRouter = Router();

/** Chamado pelo ESP32. A resposta diz se ele deve mandar quadros rápidos. */
monitorRouter.post('/', requireDeviceToken, (req, res) => {
	const frame = monitorFrameSchema.parse(req.body);
	recordFrame(frame);
	res.json({ watch: isWatched(frame.sensorKey) });
});

/** Chamado pela página do sensor (polling). Consultar marca o sensor como "observado". */
monitorRouter.get('/:sensorKey', (req, res) => {
	res.json(getMonitor(req.params.sensorKey));
});
