import type {
	Reading,
	VocalizationKind,
} from '@/features/devices/types/device';

/** Duração assumida para sons antigos sem `durationMs`. */
const FALLBACK_DURATION_MS = 800;
/** Faixa do envelope sintetizado (sons sem `envelope`): pico − ruído, em dB. */
const SYNTH_RANGE_DB = 20;
/** Densidade da onda: pontos por segundo de som, com mínimo/máximo por som. */
const POINTS_PER_SECOND = 24;
const MIN_EVENT_POINTS = 12;
const MAX_EVENT_POINTS = 64;
/** Silêncio entre sons: trecho fixo, independente do tempo real. */
const GAP_POINTS = 12;
/** Folga abaixo do menor volume para a onda não encostar no centro. */
const BASE_MARGIN_DB = 3;
/** Amplitude da linha de silêncio, relativa ao maior pico. */
const IDLE_FRACTION = 0.05;
/** Espaço acima do maior pico. */
const HEADROOM = 1.1;

export type VocalEvent = {
	id: string;
	kind: VocalizationKind;
	start: number;
	end: number;
	durationMs: number;
	value: number;
	/** Volume (dB) ao longo do som; real (ESP32) ou sintetizado. */
	envelope: number[];
};

type Range = [number, number];

/** Um ponto da onda: `idle` no silêncio, a chave do tipo no trecho detectado. */
export type WavePoint = {
	i: number;
	event?: VocalEvent;
	idle?: Range;
} & Partial<Record<VocalizationKind, Range>>;

export type WaveSegment = {
	event: VocalEvent;
	x1: number;
	x2: number;
	mid: number;
};

export type Waveform = {
	points: WavePoint[];
	segments: WaveSegment[];
	/** Domínio do eixo Y é [-yMax, yMax] (onda espelhada). */
	yMax: number;
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

/** Envelope aproximado para leituras sem `envelope` (antigas ou só-DO). */
function synthEnvelope(
	durationMs: number,
	value: number,
	bursts?: number | null,
): number[] {
	const points = clamp(Math.round(durationMs / 40), 6, 32);
	const humps = Math.max(1, bursts ?? 1);
	const base = value - SYNTH_RANGE_DB;
	return Array.from({ length: points }, (_, i) => {
		const t = (i + 0.5) / points;
		return (
			base +
			SYNTH_RANGE_DB * Math.abs(Math.sin(Math.PI * t * humps)) ** 0.8
		);
	});
}

export function toVocalEvent(reading: Reading): VocalEvent {
	const durationMs = reading.durationMs ?? FALLBACK_DURATION_MS;
	const end = new Date(reading.createdAt).getTime();
	return {
		id: reading._id,
		kind: reading.kind ?? 'greeting',
		start: end - durationMs,
		end,
		durationMs,
		value: reading.value,
		envelope: reading.envelope?.length
			? reading.envelope
			: synthEnvelope(
					durationMs,
					reading.value,
					reading.features?.bursts,
				),
	};
}

/** Reamostra por interpolação linear para `count` pontos. */
function resample(values: number[], count: number): number[] {
	if (values.length === 1) return Array(count).fill(values[0]);
	return Array.from({ length: count }, (_, j) => {
		const pos = (j / (count - 1)) * (values.length - 1);
		const lo = Math.floor(pos);
		const hi = Math.min(values.length - 1, lo + 1);
		return values[lo] + (values[hi] - values[lo]) * (pos - lo);
	});
}

/**
 * Monta a onda espelhada numa linha do tempo comprimida: cada som ocupa
 * largura proporcional à duração e o silêncio entre sons é um trecho fixo
 * (numa escala de horas, um som de 1 s seria invisível).
 */
export function buildWaveform(events: VocalEvent[]): Waveform {
	const levels = events.flatMap((event) => event.envelope);
	const base = Math.min(...levels) - BASE_MARGIN_DB;
	const peakAmp = Math.max(...levels) - base;
	const idleAmp = peakAmp * IDLE_FRACTION;

	const points: WavePoint[] = [];
	const segments: WaveSegment[] = [];
	const push = (point: Omit<WavePoint, 'i'>) =>
		points.push({ i: points.length, ...point });
	const range = (amp: number): Range => [-amp, amp];
	/** Ruído leve e determinístico (sem Math.random no render). */
	const pushIdle = (count: number) => {
		for (let k = 0; k < count; k++) {
			const wobble = 0.6 + 0.4 * Math.abs(Math.sin(points.length * 2.3));
			push({ idle: range(idleAmp * wobble) });
		}
	};
	/** Ponto de fronteira: pertence às duas séries para a onda não quebrar. */
	const pushEdge = (event: VocalEvent) => {
		const point: Omit<WavePoint, 'i'> = { event, idle: range(idleAmp) };
		point[event.kind] = range(idleAmp);
		push(point);
	};

	for (const event of events) {
		pushIdle(GAP_POINTS);
		const count = clamp(
			Math.round((event.durationMs / 1000) * POINTS_PER_SECOND),
			MIN_EVENT_POINTS,
			MAX_EVENT_POINTS,
		);
		const x1 = points.length;
		pushEdge(event);
		for (const db of resample(event.envelope, count)) {
			const point: Omit<WavePoint, 'i'> = { event };
			point[event.kind] = range(Math.max(idleAmp, db - base));
			push(point);
		}
		pushEdge(event);
		const x2 = points.length - 1;
		segments.push({ event, x1, x2, mid: Math.round((x1 + x2) / 2) });
	}
	pushIdle(GAP_POINTS / 2);

	return { points, segments, yMax: peakAmp * HEADROOM };
}
