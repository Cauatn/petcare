import { Reading } from './reading.model.js';
import type { VocalizationKind } from './vocalization.classifier.js';

/** Sem leitura nesse intervalo o dispositivo é considerado offline. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const LEVEL_TYPES = new Set(['waterBowl', 'foodBowl']);

export type DeviceStatus = {
	level: number | null;
	eventsToday: number;
	lastEventAt: string | null;
	lastReadingAt: string | null;
	online: boolean;
	/** Microfone: sons de hoje por tipo. */
	kindsToday?: Partial<Record<VocalizationKind, number>>;
	/** Microfone: tipo do último som. */
	lastEventKind?: VocalizationKind | null;
};

type ReadingSummary = {
	_id: string;
	lastValue: number;
	lastReadingAt: Date;
	lastKind: VocalizationKind | null;
	eventsToday: number;
	kindsToday?: Partial<Record<VocalizationKind, number>>;
};

export async function getStatusBySensorKey(sensorKeys: string[]) {
	const startOfDay = new Date();
	startOfDay.setHours(0, 0, 0, 0);

	const [summaries, kindCounts] = await Promise.all([
		Reading.aggregate<ReadingSummary>([
			{ $match: { sensorKey: { $in: sensorKeys } } },
			{ $sort: { createdAt: -1 } },
			{
				$group: {
					_id: '$sensorKey',
					lastValue: { $first: '$value' },
					lastReadingAt: { $first: '$createdAt' },
					lastKind: { $first: '$kind' },
					eventsToday: {
						$sum: {
							$cond: [
								{
									$and: [
										{ $gte: ['$createdAt', startOfDay] },
										{ $gt: ['$value', 0] },
									],
								},
								1,
								0,
							],
						},
					},
				},
			},
		]),
		Reading.aggregate<{
			_id: { sensorKey: string; kind: VocalizationKind };
			count: number;
		}>([
			{
				$match: {
					sensorKey: { $in: sensorKeys },
					createdAt: { $gte: startOfDay },
					kind: { $exists: true },
				},
			},
			{
				$group: {
					_id: { sensorKey: '$sensorKey', kind: '$kind' },
					count: { $sum: 1 },
				},
			},
		]),
	]);

	const map = new Map(summaries.map((summary) => [summary._id, summary]));
	for (const { _id, count } of kindCounts) {
		const summary = map.get(_id.sensorKey);
		if (!summary) continue;
		summary.kindsToday = { ...summary.kindsToday, [_id.kind]: count };
	}
	return map;
}

export function buildStatus(
	type: string,
	summary: ReadingSummary | undefined,
): DeviceStatus {
	const isLevel = LEVEL_TYPES.has(type);
	const lastReadingAt = summary?.lastReadingAt ?? null;

	return {
		level: isLevel && summary ? Math.round(summary.lastValue) : null,
		eventsToday: !isLevel && summary ? summary.eventsToday : 0,
		lastEventAt:
			!isLevel && lastReadingAt ? lastReadingAt.toISOString() : null,
		lastReadingAt: lastReadingAt?.toISOString() ?? null,
		online:
			lastReadingAt != null &&
			Date.now() - lastReadingAt.getTime() < ONLINE_WINDOW_MS,
		...(type === 'microphone'
			? {
					kindsToday: summary?.kindsToday ?? {},
					lastEventKind: summary?.lastKind ?? null,
				}
			: {}),
	};
}
