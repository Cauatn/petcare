import { Device, type DeviceDocument } from '../devices/device.model.js';
import { Reading } from '../readings/reading.model.js';
import {
	type VocalizationKind,
	vocalizationKinds,
} from '../readings/vocalization.classifier.js';

/** Queda mínima (pontos de %) para contar como consumo: filtra ruído do sensor. */
const DROP_THRESHOLD = 2;
/** Subida mínima (pontos de %) para tratar como reabastecimento. */
const REFILL_THRESHOLD = 5;
/** Janela usada para suavizar o nível dos potes antes de calcular o consumo. */
const LEVEL_BUCKET_MINUTES = 5;
/** Permanência acima disso é descartada (sensor travado / saída perdida). */
const MAX_VISIT_MS = 30 * 60 * 1000;
/** Sons entre 22h e 6h contam como vocalização noturna. */
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 6;

type LevelPoint = { at: Date; value: number };
type TimedValue = { at: Date; value: number };

export type DailyCatStats = {
	/** Dia local no formato YYYY-MM-DD. */
	date: string;
	/** `false` para hoje (dia ainda em andamento). */
	complete: boolean;
	water: { pct: number; ml: number | null; hasData: boolean };
	food: { pct: number; g: number | null; hasData: boolean };
	litter: {
		visits: number;
		avgDurationSec: number | null;
		maxDurationSec: number | null;
		hasData: boolean;
	};
	vocal: {
		total: number;
		byKind: Record<VocalizationKind, number>;
		/** Sons entre 22h e 6h. */
		night: number;
		avgDurationMs: number | null;
		hasData: boolean;
	};
};

const emptyKinds = () =>
	Object.fromEntries(vocalizationKinds.map((kind) => [kind, 0])) as Record<
		VocalizationKind,
		number
	>;

export const isNightHour = (date: Date) =>
	date.getHours() >= NIGHT_START_HOUR || date.getHours() < NIGHT_END_HOUR;

type VocalEvent = {
	at: Date;
	kind?: VocalizationKind | null;
	durationMs?: number | null;
};

type VocalDay = {
	total: number;
	byKind: Record<VocalizationKind, number>;
	night: number;
	durations: number[];
};

/** Sons do microfone agregados por dia: total, por tipo, noturnos e duração média. */
export function vocalByDay(events: VocalEvent[]) {
	const byDay = new Map<string, VocalDay>();
	for (const event of events) {
		const key = toDayKey(event.at);
		let day = byDay.get(key);
		if (!day) {
			day = { total: 0, byKind: emptyKinds(), night: 0, durations: [] };
			byDay.set(key, day);
		}
		day.total += 1;
		if (event.kind) day.byKind[event.kind] += 1;
		if (isNightHour(event.at)) day.night += 1;
		if (event.durationMs != null) day.durations.push(event.durationMs);
	}
	return byDay;
}

export function toDayKey(date: Date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Consumo a partir do nível do pote: soma as quedas e ignora os reabastecimentos.
 * Devolve o consumo (em pontos de %) atribuído ao dia de cada queda.
 */
export function consumptionByDay(points: LevelPoint[]) {
	const byDay = new Map<string, number>();
	let ref: number | null = null;

	for (const point of points) {
		if (ref === null) {
			ref = point.value;
			continue;
		}
		if (point.value <= ref - DROP_THRESHOLD) {
			const key = toDayKey(point.at);
			byDay.set(key, (byDay.get(key) ?? 0) + (ref - point.value));
			ref = point.value;
		} else if (point.value >= ref + REFILL_THRESHOLD) {
			ref = point.value;
		}
	}

	return byDay;
}

/**
 * Visitas à caixa de areia: cada 1 é uma entrada; o 0 seguinte fecha a visita
 * e dá o tempo de permanência (atribuído ao dia da entrada).
 */
export function litterVisitsByDay(events: TimedValue[]) {
	const byDay = new Map<string, { visits: number; durations: number[] }>();
	let enteredAt: Date | null = null;

	const dayOf = (date: Date) => {
		const key = toDayKey(date);
		let day = byDay.get(key);
		if (!day) {
			day = { visits: 0, durations: [] };
			byDay.set(key, day);
		}
		return day;
	};

	for (const event of events) {
		if (event.value > 0) {
			dayOf(event.at).visits += 1;
			enteredAt = event.at;
		} else if (enteredAt) {
			const durationMs = event.at.getTime() - enteredAt.getTime();
			if (durationMs > 0 && durationMs <= MAX_VISIT_MS) {
				dayOf(enteredAt).durations.push(durationMs / 1000);
			}
			enteredAt = null;
		}
	}

	return byDay;
}

async function loadLevelSeries(sensorKeys: string[], since: Date) {
	if (!sensorKeys.length) return new Map<string, LevelPoint[]>();

	const buckets = await Reading.aggregate<{
		_id: { sensorKey: string; at: Date };
		value: number;
	}>([
		{
			$match: {
				sensorKey: { $in: sensorKeys },
				createdAt: { $gte: since },
			},
		},
		{
			$group: {
				_id: {
					sensorKey: '$sensorKey',
					at: {
						$dateTrunc: {
							date: '$createdAt',
							unit: 'minute',
							binSize: LEVEL_BUCKET_MINUTES,
						},
					},
				},
				value: { $avg: '$value' },
			},
		},
		{ $sort: { '_id.at': 1 } },
	]);

	const series = new Map<string, LevelPoint[]>();
	for (const bucket of buckets) {
		const list = series.get(bucket._id.sensorKey) ?? [];
		list.push({ at: bucket._id.at, value: bucket.value });
		series.set(bucket._id.sensorKey, list);
	}
	return series;
}

function sumDays(
	target: Map<string, number>,
	source: Map<string, number>,
	factor = 1,
) {
	for (const [key, value] of source) {
		target.set(key, (target.get(key) ?? 0) + value * factor);
	}
}

const round = (value: number, digits = 0) => {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
};

export async function getDailyStats(days: number): Promise<DailyCatStats[]> {
	const since = new Date();
	since.setHours(0, 0, 0, 0);
	since.setDate(since.getDate() - (days - 1));

	const devices = await Device.find({
		type: { $in: ['waterBowl', 'foodBowl', 'litterBox', 'microphone'] },
	}).lean<DeviceDocument[]>();

	const bowls = devices.filter(
		(d) => d.type === 'waterBowl' || d.type === 'foodBowl',
	);
	const litterBoxes = devices.filter((d) => d.type === 'litterBox');
	const microphones = devices.filter((d) => d.type === 'microphone');

	const [levelSeries, litterEvents, micEvents] = await Promise.all([
		loadLevelSeries(
			bowls.map((d) => d.sensorKey),
			since,
		),
		litterBoxes.length
			? Reading.find({
					sensorKey: { $in: litterBoxes.map((d) => d.sensorKey) },
					createdAt: { $gte: since },
				})
					.sort({ createdAt: 1 })
					.select({ sensorKey: 1, value: 1, createdAt: 1 })
					.lean()
			: Promise.resolve([]),
		microphones.length
			? Reading.find({
					sensorKey: { $in: microphones.map((d) => d.sensorKey) },
					createdAt: { $gte: since },
					value: { $gt: 0 },
				})
					.select({ createdAt: 1, kind: 1, durationMs: 1 })
					.lean()
			: Promise.resolve([]),
	]);

	const vocalDays = vocalByDay(
		micEvents.map((reading) => ({
			at: reading.createdAt as Date,
			kind: reading.kind as VocalizationKind | null | undefined,
			durationMs: reading.durationMs,
		})),
	);

	// Água e ração: % somado entre potes do mesmo tipo e convertido pela capacidade
	const levelTotals = {
		waterBowl: {
			pct: new Map<string, number>(),
			amount: new Map<string, number>(),
			days: new Set<string>(),
			allHaveCapacity: true,
		},
		foodBowl: {
			pct: new Map<string, number>(),
			amount: new Map<string, number>(),
			days: new Set<string>(),
			allHaveCapacity: true,
		},
	};

	for (const bowl of bowls) {
		const totals = levelTotals[bowl.type as 'waterBowl' | 'foodBowl'];
		const points = levelSeries.get(bowl.sensorKey) ?? [];
		for (const point of points) totals.days.add(toDayKey(point.at));

		const consumed = consumptionByDay(points);
		sumDays(totals.pct, consumed);
		if (bowl.capacity)
			sumDays(totals.amount, consumed, bowl.capacity / 100);
		else totals.allHaveCapacity = false;
	}

	// Caixa de areia: eventos de cada sensor, separados para parear entrada/saída
	const litterBySensor = new Map<string, TimedValue[]>();
	for (const reading of litterEvents) {
		const list = litterBySensor.get(reading.sensorKey) ?? [];
		list.push({ at: reading.createdAt as Date, value: reading.value });
		litterBySensor.set(reading.sensorKey, list);
	}
	const litterDays = new Map<
		string,
		{ visits: number; durations: number[] }
	>();
	const litterDataDays = new Set<string>();
	for (const events of litterBySensor.values()) {
		for (const event of events) litterDataDays.add(toDayKey(event.at));
		for (const [key, day] of litterVisitsByDay(events)) {
			const current = litterDays.get(key) ?? { visits: 0, durations: [] };
			current.visits += day.visits;
			current.durations.push(...day.durations);
			litterDays.set(key, current);
		}
	}

	const todayKey = toDayKey(new Date());
	const result: DailyCatStats[] = [];

	for (let i = 0; i < days; i++) {
		const date = new Date(since);
		date.setDate(since.getDate() + i);
		const key = toDayKey(date);

		const water = levelTotals.waterBowl;
		const food = levelTotals.foodBowl;
		const litter = litterDays.get(key);
		const durations = litter?.durations ?? [];
		const vocal = vocalDays.get(key);
		const vocalDurations = vocal?.durations ?? [];

		result.push({
			date: key,
			complete: key !== todayKey,
			water: {
				pct: round(water.pct.get(key) ?? 0, 1),
				ml:
					water.allHaveCapacity && water.days.size
						? round(water.amount.get(key) ?? 0)
						: null,
				hasData: water.days.has(key),
			},
			food: {
				pct: round(food.pct.get(key) ?? 0, 1),
				g:
					food.allHaveCapacity && food.days.size
						? round(food.amount.get(key) ?? 0)
						: null,
				hasData: food.days.has(key),
			},
			litter: {
				visits: litter?.visits ?? 0,
				avgDurationSec: durations.length
					? round(
							durations.reduce((a, b) => a + b, 0) /
								durations.length,
						)
					: null,
				maxDurationSec: durations.length
					? round(Math.max(...durations))
					: null,
				// O sonar só envia eventos: um dia sem visitas ainda é um dado válido se houver sensor
				hasData:
					litterBoxes.length > 0 &&
					(litterDataDays.has(key) || hasCoverage(litterBoxes, date)),
			},
			vocal: {
				total: vocal?.total ?? 0,
				byKind: vocal?.byKind ?? emptyKinds(),
				night: vocal?.night ?? 0,
				avgDurationMs: vocalDurations.length
					? round(
							vocalDurations.reduce((a, b) => a + b, 0) /
								vocalDurations.length,
						)
					: null,
				// Também só envia eventos: dia em silêncio conta se o microfone já existia
				hasData:
					microphones.length > 0 &&
					(vocalDays.has(key) || hasCoverage(microphones, date)),
			},
		});
	}

	return result;
}

/** O sensor de eventos existia nesse dia (cadastrado antes do fim do dia)? */
function hasCoverage(sensors: DeviceDocument[], day: Date) {
	const endOfDay = new Date(day);
	endOfDay.setHours(23, 59, 59, 999);
	return sensors.some(
		(box) => new Date(box.createdAt).getTime() <= endOfDay.getTime(),
	);
}
