import {
	formatDuration,
	vocalizationTypes,
} from '../constants/vocalizationTypes';
import { LOW_LEVEL_THRESHOLD } from '../constants/deviceTypes';
import type { Device, Reading } from '../types/device';

/** Um acontecimento na casa, já em linguagem do dia a dia ("Gato entrou na caixa"). */
export type TimelineEvent = {
	id: string;
	at: string;
	device: Device;
	title: string;
	detail?: string;
	tone: 'neutral' | 'warn';
};

export function startOfToday() {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	return date;
}

/**
 * Leituras de um dia inteiro: o pote manda uma a cada 30 s (2880/dia). O limite da API é
 * 5000; com ele a linha do tempo cobre o dia todo, e não só as últimas horas.
 */
export const DAY_READINGS_LIMIT = 5000;

/**
 * Converte as leituras de um sensor (mais antiga primeiro) em acontecimentos a partir de `since`.
 * Potes mandam o nível a cada 30 s, então só viram evento quando o nível muda.
 */
export function toTimelineEvents(
	device: Device,
	readings: Reading[],
	since: Date,
): TimelineEvent[] {
	const events: TimelineEvent[] = [];
	let previousLevel: number | null = null;
	let enteredAt: Date | null = null;

	for (const reading of readings) {
		const at = new Date(reading.createdAt);
		const isToday = at >= since;

		switch (device.type) {
			case 'microphone': {
				if (!isToday) break;
				const label = reading.kind
					? vocalizationTypes[reading.kind].label
					: 'Som';
				events.push({
					id: reading._id,
					at: reading.createdAt,
					device,
					title: label,
					detail: [
						reading.durationMs != null
							? formatDuration(reading.durationMs)
							: null,
						`volume ${Math.round(reading.value)} dB`,
					]
						.filter(Boolean)
						.join(' · '),
					tone: 'neutral',
				});
				break;
			}
			case 'litterBox': {
				const entered = reading.value > 0;
				const stayMs =
					!entered && enteredAt
						? at.getTime() - enteredAt.getTime()
						: null;
				enteredAt = entered ? at : null;
				if (!isToday) break;
				events.push({
					id: reading._id,
					at: reading.createdAt,
					device,
					title: entered
						? 'Gato entrou na caixa'
						: 'Gato saiu da caixa',
					detail:
						stayMs != null
							? `ficou ${formatStay(stayMs)}`
							: undefined,
					tone: 'neutral',
				});
				break;
			}
			case 'foodBowl':
			case 'waterBowl': {
				const level = Math.round(reading.value);
				if (
					isToday &&
					previousLevel !== null &&
					level !== previousLevel
				) {
					events.push({
						id: reading._id,
						at: reading.createdAt,
						device,
						title:
							level < LOW_LEVEL_THRESHOLD
								? `Pote quase vazio (${level}%)`
								: `Nível foi para ${level}%`,
						detail: `antes: ${previousLevel}%`,
						tone: level < LOW_LEVEL_THRESHOLD ? 'warn' : 'neutral',
					});
				}
				previousLevel = level;
				break;
			}
		}
	}
	return events;
}

function formatStay(ms: number) {
	const seconds = Math.round(ms / 1000);
	if (seconds < 60) return `${seconds} s`;
	const minutes = Math.round(seconds / 60);
	return `${minutes} min`;
}

/** Junta os acontecimentos de vários sensores, do mais recente para o mais antigo. */
export function mergeTimelines(lists: TimelineEvent[][]) {
	return lists
		.flat()
		.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
