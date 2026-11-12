import { Reading } from './reading.model.js';

/** Sem leitura nesse intervalo o dispositivo é considerado offline. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

const LEVEL_TYPES = new Set(['waterBowl', 'foodBowl']);

export type DeviceStatus = {
	level: number | null;
	eventsToday: number;
	lastEventAt: string | null;
	lastReadingAt: string | null;
	online: boolean;
};

type ReadingSummary = {
	_id: string;
	lastValue: number;
	lastReadingAt: Date;
	eventsToday: number;
};

export async function getStatusBySensorKey(sensorKeys: string[]) {
	const startOfDay = new Date();
	startOfDay.setHours(0, 0, 0, 0);

	const summaries = await Reading.aggregate<ReadingSummary>([
		{ $match: { sensorKey: { $in: sensorKeys } } },
		{ $sort: { createdAt: -1 } },
		{
			$group: {
				_id: '$sensorKey',
				lastValue: { $first: '$value' },
				lastReadingAt: { $first: '$createdAt' },
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
	]);

	return new Map(summaries.map((summary) => [summary._id, summary]));
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
		lastEventAt: !isLevel && lastReadingAt ? lastReadingAt.toISOString() : null,
		lastReadingAt: lastReadingAt?.toISOString() ?? null,
		online:
			lastReadingAt != null &&
			Date.now() - lastReadingAt.getTime() < ONLINE_WINDOW_MS,
	};
}
