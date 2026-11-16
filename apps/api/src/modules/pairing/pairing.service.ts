import { env } from '../../config/env.js';
import { Reading } from '../readings/reading.model.js';
import { detectLocalLanIp } from './pairing.discovery.js';
import { PairedBoard, type PairedBoardDocument } from './pairing.model.js';
import type { HeartbeatPairingInput } from './pairing.schemas.js';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type PairedBoardStatus = PairedBoardDocument & {
	online: boolean;
};

export function getPairingConfig() {
	const lanIp = detectLocalLanIp();
	const suggestedApiBaseUrl = `http://${lanIp}:${env.PORT}/api`;

	return {
		suggestedApiBaseUrl,
		readingsUrl: `${suggestedApiBaseUrl}/readings`,
		heartbeatUrl: `${suggestedApiBaseUrl}/pairing/heartbeat`,
		deviceToken: env.DEVICE_TOKEN ?? '',
		defaultDevicePrefix: 'esp32-01',
		softApSsid: 'PetCare-Setup',
		softApBaseUrl: 'http://192.168.4.1',
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

export async function listPairedBoards(): Promise<PairedBoardStatus[]> {
	const boards = await PairedBoard.find()
		.sort({ updatedAt: -1 })
		.lean<PairedBoardDocument[]>();

	if (boards.length === 0) return [];

	const prefixes = boards.map((b) => b.devicePrefix);
	const regexes = prefixes.map(
		(p) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:`),
	);

	const recentReadings = await Reading.aggregate<{
		_id: string;
		lastReadingAt: Date;
	}>([
		{ $match: { sensorKey: { $in: regexes } } },
		{ $sort: { createdAt: -1 } },
		{
			$group: {
				_id: {
					$arrayElemAt: [{ $split: ['$sensorKey', ':'] }, 0],
				},
				lastReadingAt: { $first: '$createdAt' },
			},
		},
	]);

	const readingMap = new Map(
		recentReadings.map((item) => [item._id, item.lastReadingAt]),
	);

	return boards.map((board) => {
		const readingAt = readingMap.get(board.devicePrefix);
		const lastActivity =
			readingAt && readingAt > board.lastSeenAt
				? readingAt
				: board.lastSeenAt;

		return {
			...board,
			lastSeenAt: lastActivity,
			online:
				Date.now() - new Date(lastActivity).getTime() <
				ONLINE_WINDOW_MS,
		};
	});
}
