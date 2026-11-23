import { boardPrefixOf } from '../../commons/boardPrefix.js';
import { env } from '../../config/env.js';
import {
	SOFTAP_SUBNET_PREFIX,
	detectLocalLanIp,
	publicApiPort,
} from './pairing.discovery.js';
import { PairedBoard, type PairedBoardDocument } from './pairing.model.js';
import type { HeartbeatPairingInput } from './pairing.schemas.js';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type PairedBoardStatus = PairedBoardDocument & {
	online: boolean;
};

/**
 * Dados para o assistente de pareamento. Não expõe o `DEVICE_TOKEN`: a rota é pública e o
 * CORS pode ser `*`, então qualquer página poderia lê-lo. O usuário digita o token no front.
 */
export function getPairingConfig() {
	const lanIp = detectLocalLanIp();
	const suggestedApiBaseUrl = lanIp
		? `http://${lanIp}:${publicApiPort}/api`
		: null;

	return {
		suggestedApiBaseUrl,
		readingsUrl: suggestedApiBaseUrl && `${suggestedApiBaseUrl}/readings`,
		heartbeatUrl:
			suggestedApiBaseUrl && `${suggestedApiBaseUrl}/pairing/heartbeat`,
		requiresDeviceToken: Boolean(env.DEVICE_TOKEN),
		defaultDevicePrefix: 'esp32-01',
		softApSsid: 'PetCare-Setup',
		softApBaseUrl: `http://${SOFTAP_SUBNET_PREFIX}1`,
	};
}

export async function upsertPairedBoard(
	payload: HeartbeatPairingInput,
): Promise<PairedBoardStatus> {
	const now = new Date();
	const doc = await PairedBoard.findOneAndUpdate(
		{ devicePrefix: payload.devicePrefix },
		{
			$set: {
				ssid: payload.ssid,
				ip: payload.ip,
				...(payload.mac ? { mac: payload.mac } : {}),
				lastSeenAt: now,
			},
		},
		{ upsert: true, new: true, runValidators: true },
	).lean<PairedBoardDocument>();

	return {
		...doc,
		online: true,
	};
}

/**
 * Marca atividade das placas que enviaram leituras (prefixo antes do ":" no sensorKey),
 * para a lista de pareadas não precisar varrer o histórico de leituras.
 */
export async function touchPairedBoards(sensorKeys: string[]) {
	const prefixes = [
		...new Set(
			sensorKeys
				.filter((key) => key.includes(':'))
				.map(boardPrefixOf),
		),
	];
	if (prefixes.length === 0) return;

	await PairedBoard.updateMany(
		{ devicePrefix: { $in: prefixes } },
		{ $set: { lastSeenAt: new Date() } },
		{ timestamps: false },
	);
}

export async function listPairedBoards(): Promise<PairedBoardStatus[]> {
	const boards = await PairedBoard.find()
		.sort({ updatedAt: -1 })
		.lean<PairedBoardDocument[]>();

	return boards.map((board) => ({
		...board,
		online:
			Date.now() - new Date(board.lastSeenAt).getTime() < ONLINE_WINDOW_MS,
	}));
}
