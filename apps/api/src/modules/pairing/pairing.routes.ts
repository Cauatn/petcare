import { Router } from 'express';
import { notFound } from '../../commons/httpError.js';
import { requireDeviceToken } from '../../commons/requireDeviceToken.js';
import { PairedBoard } from './pairing.model.js';
import { heartbeatPairingSchema } from './pairing.schemas.js';
import {
	getPairingConfig,
	listPairedBoards,
	upsertPairedBoard,
} from './pairing.service.js';

export const pairingRouter = Router();

pairingRouter.get('/config', (_req, res) => {
	res.json(getPairingConfig());
});

pairingRouter.get('/boards', async (_req, res) => {
	const boards = await listPairedBoards();
	res.json(boards);
});

/** Endpoint chamado pelo ESP32 assim que conecta no Wi-Fi configurado. */
pairingRouter.post('/heartbeat', requireDeviceToken, async (req, res) => {
	const payload = heartbeatPairingSchema.parse(req.body);
	const board = await upsertPairedBoard(payload);
	res.status(200).json(board);
});

pairingRouter.delete('/boards/:devicePrefix', async (req, res) => {
	const removed = await PairedBoard.findOneAndDelete({
		devicePrefix: req.params.devicePrefix,
	});
	if (!removed) throw notFound('Placa pareada não encontrada');
	res.status(204).end();
});
