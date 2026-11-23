import type { MonitorFrame } from './monitor.schemas.js';

/** Quantos pontos de histórico (volume × tempo) ficam em memória por sensor. */
const HISTORY_MAX = 240;
/** Depois de ser consultado, o sensor é considerado "observado" por este tempo. */
const WATCH_WINDOW_MS = 10_000;
/** Sem quadro nesse intervalo, o monitor é considerado offline. */
const ONLINE_WINDOW_MS = 10_000;
/** Limite de sensores distintos em memória (o endpoint do ESP32 não exige login). */
const MAX_SENSORS = 32;
/** Sensor sem quadro há mais que isso pode ser descartado para dar lugar a outro. */
const STALE_MS = 5 * 60 * 1000;

type HistoryPoint = {
	t: number;
	rmsDb: number;
	noiseDb: number;
	thresholdDb: number;
	doActive: boolean;
	loud: boolean;
};

type Entry = {
	latest: (MonitorFrame & { receivedAt: number }) | null;
	history: HistoryPoint[];
	lastWatchedAt: number;
};

/** Só em memória: é um osciloscópio, não um registro. Reiniciar a API zera. */
const entries = new Map<string, Entry>();

/** Abre espaço no limite descartando o sensor parado há mais tempo. */
function evictStale(now: number) {
	let oldestKey: string | null = null;
	let oldestAt = Infinity;
	for (const [key, entry] of entries) {
		const at = entry.latest?.receivedAt ?? 0;
		if (at < oldestAt) {
			oldestAt = at;
			oldestKey = key;
		}
	}
	if (oldestKey !== null && now - oldestAt > STALE_MS) {
		entries.delete(oldestKey);
		return true;
	}
	return false;
}

/** Só quem manda quadros (a placa) cria entradas; consultar não cria nada. */
function getOrCreate(sensorKey: string, now: number): Entry | null {
	let entry = entries.get(sensorKey);
	if (!entry) {
		if (entries.size >= MAX_SENSORS && !evictStale(now)) return null;
		entry = { latest: null, history: [], lastWatchedAt: 0 };
		entries.set(sensorKey, entry);
	}
	return entry;
}

export function recordFrame(frame: MonitorFrame) {
	const now = Date.now();
	const entry = getOrCreate(frame.sensorKey, now);
	if (!entry) return;

	entry.latest = { ...frame, receivedAt: now };
	entry.history.push({
		t: now,
		rmsDb: frame.rmsDb,
		noiseDb: frame.noiseDb,
		thresholdDb: frame.thresholdDb,
		doActive: frame.doActive,
		loud: frame.loud,
	});
	if (entry.history.length > HISTORY_MAX) {
		entry.history.splice(0, entry.history.length - HISTORY_MAX);
	}
}

/** O ESP32 só manda quadros rápidos enquanto alguém está olhando a página. */
export function isWatched(sensorKey: string) {
	const entry = entries.get(sensorKey);
	return !!entry && Date.now() - entry.lastWatchedAt < WATCH_WINDOW_MS;
}

export function getMonitor(sensorKey: string) {
	const entry = entries.get(sensorKey);
	if (entry) entry.lastWatchedAt = Date.now();

	const latest = entry?.latest ?? null;
	const ageMs = latest ? Date.now() - latest.receivedAt : null;

	return {
		online: ageMs !== null && ageMs < ONLINE_WINDOW_MS,
		ageMs,
		latest,
		history: entry?.history ?? [],
	};
}
