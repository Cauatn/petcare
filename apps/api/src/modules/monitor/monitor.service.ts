import type { MonitorFrame } from './monitor.schemas.js';

/** Quantos pontos de histórico (volume × tempo) ficam em memória por sensor. */
const HISTORY_MAX = 240;
/** Depois de ser consultado, o sensor é considerado "observado" por este tempo. */
const WATCH_WINDOW_MS = 10_000;
/** Sem quadro nesse intervalo, o monitor é considerado offline. */
const ONLINE_WINDOW_MS = 10_000;
/** Limite de sensores distintos em memória (o endpoint do ESP32 não exige login). */
const MAX_SENSORS = 32;

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

function getOrCreate(sensorKey: string): Entry | null {
	let entry = entries.get(sensorKey);
	if (!entry) {
		if (entries.size >= MAX_SENSORS) return null;
		entry = { latest: null, history: [], lastWatchedAt: 0 };
		entries.set(sensorKey, entry);
	}
	return entry;
}

export function recordFrame(frame: MonitorFrame) {
	const entry = getOrCreate(frame.sensorKey);
	if (!entry) return;

	const now = Date.now();
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
	const entry = getOrCreate(sensorKey);
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
