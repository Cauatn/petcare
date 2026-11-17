import {
	AxiosError,
	AxiosHeaders,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from 'axios';
import type {
	CreateDevicePayload,
	Device,
	DeviceType,
	Reading,
	UpdateDevicePayload,
	VocalizationFeatures,
	VocalizationKind,
} from '@/features/devices/types/device';
import type {
	DailyCatStats,
	Pet,
	SavePetPayload,
} from '@/features/health/types/health';
import type {
	PairedBoard,
	PairingConfig,
} from '@/features/pairing/types/pairing';

/**
 * Simula a API (e os sensores do ESP32) no navegador, com o mesmo contrato
 * de `apps/api`. Ativado por `VITE_USE_MOCK=true`. Os dispositivos ficam no
 * localStorage; as leituras são geradas a cada consulta.
 */

const STORAGE_KEY = 'petcare:mock-devices';
const BOARDS_STORAGE_KEY = 'petcare:mock-boards';
const PET_STORAGE_KEY = 'petcare:mock-pet';
const HISTORY_SIZE = 60;
const TICK_MS = 3000;

type StoredDevice = Omit<Device, 'status'>;

type SimState = {
	level: number;
	eventsToday: number;
	kindsToday: Partial<Record<VocalizationKind, number>>;
	lastEventKind: VocalizationKind | null;
	lastEventAt: string | null;
	lastTickAt: number;
	history: Reading[];
};

const simByDevice = new Map<string, SimState>();

const seedDevices: StoredDevice[] = [
	{
		_id: 'seed-litter',
		name: 'Caixa de areia',
		type: 'litterBox',
		sensorKey: 'esp32-01:proximity',
		position: { x: 84, y: 76 },
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		_id: 'seed-water',
		name: 'Pote de água',
		type: 'waterBowl',
		sensorKey: 'esp32-01:water',
		position: { x: 52, y: 22 },
		capacity: 500,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		_id: 'seed-food',
		name: 'Pote de ração',
		type: 'foodBowl',
		sensorKey: 'esp32-01:food',
		position: { x: 60, y: 22 },
		capacity: 300,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		_id: 'seed-mic',
		name: 'Microfone da sala',
		type: 'microphone',
		sensorKey: 'esp32-01:mic',
		position: { x: 22, y: 40 },
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

function loadFromStorage<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		if (raw) return JSON.parse(raw) as T;
	} catch {
		// localStorage indisponível: segue com os dados iniciais
	}
	return fallback;
}

function saveToStorage<T>(key: string, value: T) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// sem persistência, só em memória
	}
}

let devices = loadFromStorage<StoredDevice[]>(STORAGE_KEY, seedDevices);

function saveDevices() {
	saveToStorage(STORAGE_KEY, devices);
}

const seedBoards: PairedBoard[] = [
	{
		_id: 'seed-board-1',
		devicePrefix: 'esp32-01',
		ssid: 'PetCare_2.4G',
		ip: '172.20.10.5',
		mac: '24:6F:28:AA:BB:CC',
		lastSeenAt: new Date().toISOString(),
		online: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

let pairedBoards = loadFromStorage<PairedBoard[]>(
	BOARDS_STORAGE_KEY,
	seedBoards,
);

function saveBoards() {
	saveToStorage(BOARDS_STORAGE_KEY, pairedBoards);
}

const seedPet: Pet = {
	_id: 'seed-pet',
	name: 'Mingau',
	weightKg: 4.2,
	birthDate: '2021-03-10T00:00:00.000Z',
	neutered: true,
	diet: 'dry',
	foodKcalPerKg: null,
	bodyCondition: 'ideal',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

let pet = loadFromStorage<Pet | null>(PET_STORAGE_KEY, seedPet);

function savePet(payload: SavePetPayload) {
	const now = new Date().toISOString();
	pet = {
		...payload,
		_id: pet?._id ?? crypto.randomUUID(),
		createdAt: pet?.createdAt ?? now,
		updatedAt: now,
	};
	saveToStorage(PET_STORAGE_KEY, pet);
	return pet;
}

/** Gerador pseudoaleatório com semente: o mesmo dia gera sempre os mesmos números. */
function seededRandom(seed: string) {
	let h = 1779033703 ^ seed.length;
	for (let i = 0; i < seed.length; i++) {
		h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	return () => {
		h = Math.imul(h ^ (h >>> 16), 2246822507);
		h = Math.imul(h ^ (h >>> 13), 3266489909);
		h ^= h >>> 16;
		return (h >>> 0) / 4294967296;
	};
}

function toDayKey(date: Date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/** Imita `GET /insights/daily`: consumo e visitas realistas por dia. */
function buildDailyStats(days: number): DailyCatStats[] {
	const bowlCapacity = (type: DeviceType) => {
		const bowls = devices.filter((device) => device.type === type);
		if (!bowls.length) return undefined;
		return bowls.every((bowl) => bowl.capacity)
			? bowls.reduce((total, bowl) => total + (bowl.capacity ?? 0), 0) /
					bowls.length
			: null;
	};
	const waterCapacity = bowlCapacity('waterBowl');
	const foodCapacity = bowlCapacity('foodBowl');
	const hasLitter = devices.some((device) => device.type === 'litterBox');
	const hasMic = devices.some((device) => device.type === 'microphone');

	const now = new Date();
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	const dayFraction = (now.getTime() - startOfToday.getTime()) / 86_400_000;

	return Array.from({ length: days }, (_, index) => {
		const date = new Date(startOfToday);
		date.setDate(date.getDate() - (days - 1 - index));
		const key = toDayKey(date);
		const complete = index < days - 1;
		const share = complete ? 1 : dayFraction;
		const random = seededRandom(key);

		const waterMl = (180 + random() * 60) * share;
		const foodG = (50 + random() * 15) * share;
		const visits = Math.round((3 + random() * 3) * share);
		const durations = Array.from(
			{ length: visits },
			() => 60 + random() * 90,
		);
		const avgDuration = durations.length
			? durations.reduce((a, b) => a + b, 0) / durations.length
			: null;

		// Vocalização: ~15–30 sons/dia, distribuídos pela hora do dia
		const vocalCount = Math.round((15 + random() * 15) * share);
		const byKind = Object.fromEntries(
			vocalKinds.map((kind) => [kind, 0]),
		) as Record<VocalizationKind, number>;
		let night = 0;
		let vocalDuration = 0;
		for (let v = 0; v < vocalCount; v++) {
			const hour = Math.floor(random() * 24);
			const kind = pickVocalKind(hour, random);
			byKind[kind] += 1;
			if (hour < 6 || hour >= 22) night += 1;
			vocalDuration += vocalSample(kind, random).durationMs;
		}

		return {
			date: key,
			complete,
			water: {
				pct: Math.round((waterMl / (waterCapacity || 500)) * 1000) / 10,
				ml: waterCapacity ? Math.round(waterMl) : null,
				hasData: waterCapacity !== undefined,
			},
			food: {
				pct: Math.round((foodG / (foodCapacity || 300)) * 1000) / 10,
				g: foodCapacity ? Math.round(foodG) : null,
				hasData: foodCapacity !== undefined,
			},
			litter: {
				visits,
				avgDurationSec:
					avgDuration == null ? null : Math.round(avgDuration),
				maxDurationSec: durations.length
					? Math.round(Math.max(...durations))
					: null,
				hasData: hasLitter,
			},
			vocal: {
				total: vocalCount,
				byKind,
				night,
				avgDurationMs: vocalCount
					? Math.round(vocalDuration / vocalCount)
					: null,
				hasData: hasMic,
			},
		};
	});
}

// ── Microfone: sons do gato com tipo, duração e medidas acústicas ─────────

const vocalKinds: VocalizationKind[] = [
	'greeting',
	'demand',
	'trill',
	'yowl',
	'defensive',
	'chatter',
];

/** Peso de cada tipo conforme a hora: pedidos perto das refeições, uivos de madrugada. */
function vocalWeights(hour: number): Record<VocalizationKind, number> {
	const mealTime = (hour >= 6 && hour <= 8) || (hour >= 18 && hour <= 20);
	const night = hour < 6 || hour >= 22;
	const daytime = hour >= 9 && hour <= 17;
	return {
		greeting: 30,
		demand: mealTime ? 45 : 18,
		trill: 15,
		yowl: night ? 14 : 4,
		defensive: 4,
		chatter: daytime ? 16 : 6,
	};
}

function pickVocalKind(hour: number, random: () => number) {
	const weights = vocalWeights(hour);
	const total = vocalKinds.reduce((sum, kind) => sum + weights[kind], 0);
	let roll = random() * total;
	for (const kind of vocalKinds) {
		roll -= weights[kind];
		if (roll <= 0) return kind;
	}
	return 'greeting';
}

const between = (random: () => number, min: number, max: number) =>
	min + random() * (max - min);

/** Medidas típicas de cada tipo (as mesmas que o ESP32 extrai). */
function vocalSample(
	kind: VocalizationKind,
	random: () => number,
): { durationMs: number; value: number; features: VocalizationFeatures } {
	switch (kind) {
		case 'greeting': {
			const f0 = between(random, 550, 750);
			return {
				durationMs: Math.round(between(random, 300, 750)),
				value: Math.round(between(random, 40, 49)),
				features: {
					f0Hz: f0,
					f0StartHz: f0,
					f0EndHz: f0 - 40,
					voicedRatio: 0.8,
					zcr: 0.1,
					bursts: 1,
				},
			};
		}
		case 'demand': {
			const f0 = between(random, 600, 800);
			return {
				durationMs: Math.round(between(random, 900, 1800)),
				value: Math.round(between(random, 44, 49)),
				features: {
					f0Hz: f0,
					f0StartHz: f0 + 60,
					f0EndHz: f0 - 120,
					voicedRatio: 0.85,
					zcr: 0.11,
					bursts: 1,
				},
			};
		}
		case 'trill':
			return {
				durationMs: Math.round(between(random, 200, 500)),
				value: Math.round(between(random, 30, 40)),
				features: {
					f0Hz: 550,
					f0StartHz: 400,
					f0EndHz: 700,
					voicedRatio: 0.85,
					zcr: 0.09,
					bursts: 1,
				},
			};
		case 'yowl':
			return {
				durationMs: Math.round(between(random, 1600, 3500)),
				value: Math.round(between(random, 52, 62)),
				features: {
					f0Hz: 700,
					f0StartHz: 500,
					f0EndHz: 900,
					voicedRatio: 0.75,
					zcr: 0.12,
					bursts: 1,
				},
			};
		case 'defensive':
			return {
				durationMs: Math.round(between(random, 500, 1800)),
				value: Math.round(between(random, 40, 55)),
				features: {
					f0Hz: null,
					voicedRatio: 0.15,
					zcr: between(random, 0.3, 0.5),
					bursts: 1,
				},
			};
		case 'chatter': {
			const bursts = Math.round(between(random, 4, 7));
			return {
				durationMs: bursts * Math.round(between(random, 90, 150)),
				value: Math.round(between(random, 35, 45)),
				features: { f0Hz: 900, voicedRatio: 0.5, zcr: 0.18, bursts },
			};
		}
	}
}

/** Mesmo limite do firmware (`VOCAL_ENVELOPE_POINTS`) e quadro de ~25 ms. */
const ENVELOPE_POINTS = 64;
const ENVELOPE_FRAME_MS = 25;
/** Quanto o ruído de fundo fica abaixo do pico do som (dB). */
const ENVELOPE_RANGE_DB = 22;

/** Formato do volume ao longo do som (0–1) para cada tipo, em `t` de 0 a 1. */
function envelopeShape(
	kind: VocalizationKind,
	t: number,
	bursts: number,
	random: () => number,
): number {
	const hump = Math.sin(Math.PI * t);
	switch (kind) {
		case 'greeting':
			return hump ** 0.8;
		case 'demand': {
			const attack = Math.min(1, t / 0.15);
			const decay = Math.min(1, (1 - t) / 0.3);
			return Math.min(attack, decay) * (0.9 + 0.1 * Math.sin(t * 14));
		}
		case 'trill':
			return hump ** 0.6 * (0.75 + 0.25 * Math.sin(t * Math.PI * 12));
		case 'yowl':
			return hump ** 0.5 * (0.65 + 0.35 * Math.sin(t * Math.PI * 6 - 1));
		case 'defensive':
			return Math.min(1, t / 0.1, (1 - t) / 0.1) * (0.6 + 0.4 * random());
		case 'chatter':
			return Math.abs(Math.sin(Math.PI * t * bursts)) ** 1.5;
	}
}

function vocalEnvelope(
	kind: VocalizationKind,
	{ durationMs, value, features }: ReturnType<typeof vocalSample>,
	random: () => number,
): number[] {
	const points = Math.max(
		4,
		Math.min(ENVELOPE_POINTS, Math.round(durationMs / ENVELOPE_FRAME_MS)),
	);
	const base = value - ENVELOPE_RANGE_DB;
	const bursts = features.bursts ?? 1;
	return Array.from({ length: points }, (_, i) => {
		const t = (i + 0.5) / points;
		const jitter = 0.92 + 0.08 * random();
		const shape = Math.max(0, envelopeShape(kind, t, bursts, random));
		return Math.round(base + ENVELOPE_RANGE_DB * shape * jitter);
	});
}

function vocalReading(
	device: StoredDevice,
	at: number,
	random = Math.random,
): Reading {
	const kind = pickVocalKind(new Date(at).getHours(), random);
	const sample = vocalSample(kind, random);
	return {
		_id: `${device._id}-${at}`,
		sensorKey: device.sensorKey,
		kind,
		...sample,
		envelope: vocalEnvelope(kind, sample, random),
		createdAt: new Date(at).toISOString(),
	};
}

function registerVocal(sim: SimState, reading: Reading) {
	if (!reading.kind) return;
	sim.eventsToday += 1;
	sim.lastEventAt = reading.createdAt;
	sim.lastEventKind = reading.kind;
	sim.kindsToday[reading.kind] = (sim.kindsToday[reading.kind] ?? 0) + 1;
}

const isLevelSensor = (type: DeviceType) =>
	type === 'waterBowl' || type === 'foodBowl';

function readingValue(type: DeviceType, sim: SimState) {
	if (isLevelSensor(type)) return Math.round(sim.level);
	return 0;
}

/** Visitas esporádicas no histórico inicial da caixa de areia. */
function backfillEventValue() {
	return Number(Math.random() < 0.08);
}

function getSim(device: StoredDevice): SimState {
	let sim = simByDevice.get(device._id);
	if (sim) return sim;

	const now = Date.now();
	sim = {
		level: 55 + Math.random() * 40,
		eventsToday: Math.floor(Math.random() * 5),
		kindsToday: {},
		lastEventKind: null,
		lastEventAt: new Date(now - Math.random() * 3_600_000).toISOString(),
		lastTickAt: now,
		history: [],
	};

	// Microfone: só eventos (sons), espalhados pelos últimos ~30 min
	if (device.type === 'microphone') {
		sim.eventsToday = 0;
		for (let at = now - 30 * 60_000; ;) {
			at += between(Math.random, 45_000, 180_000);
			if (at >= now) break;
			const reading = vocalReading(device, at);
			sim.history.push(reading);
			registerVocal(sim, reading);
		}
		simByDevice.set(device._id, sim);
		return sim;
	}

	// Histórico retroativo para o gráfico já nascer preenchido
	for (let i = HISTORY_SIZE; i > 0; i--) {
		sim.history.push({
			_id: `${device._id}-h${i}`,
			sensorKey: device.sensorKey,
			value: isLevelSensor(device.type)
				? Math.round(Math.min(100, sim.level + i * 0.6))
				: backfillEventValue(),
			createdAt: new Date(now - i * TICK_MS).toISOString(),
		});
	}

	simByDevice.set(device._id, sim);
	return sim;
}

function advance(device: StoredDevice) {
	const sim = getSim(device);
	const now = Date.now();
	const ticks = Math.min(
		HISTORY_SIZE,
		Math.floor((now - sim.lastTickAt) / TICK_MS),
	);

	for (let i = 0; i < ticks; i++) {
		const at = sim.lastTickAt + (i + 1) * TICK_MS;

		if (device.type === 'microphone') {
			// Um som a cada ~1,5 min em média
			if (Math.random() < 0.035) {
				const reading = vocalReading(device, at);
				sim.history.push(reading);
				registerVocal(sim, reading);
			}
			continue;
		}

		if (isLevelSensor(device.type)) {
			sim.level = Math.max(0, sim.level - Math.random() * 1.2);
			// Alguém reabasteceu o pote
			if (sim.level < 10 && Math.random() < 0.15) sim.level = 100;
		} else if (Math.random() < 0.06) {
			// Gato entrou na caixinha
			sim.eventsToday += 1;
			sim.lastEventAt = new Date(at).toISOString();
		}

		const isEvent = sim.lastEventAt === new Date(at).toISOString();
		sim.history.push({
			_id: `${device._id}-${at}`,
			sensorKey: device.sensorKey,
			value:
				device.type === 'litterBox'
					? Number(isEvent)
					: readingValue(device.type, sim),
			createdAt: new Date(at).toISOString(),
		});
	}

	sim.history = sim.history.slice(-HISTORY_SIZE);
	if (ticks > 0) sim.lastTickAt += ticks * TICK_MS;
	return sim;
}

function withStatus(device: StoredDevice): Device {
	const sim = advance(device);
	const lastReading = sim.history.at(-1);

	return {
		...device,
		status: {
			level: isLevelSensor(device.type) ? Math.round(sim.level) : null,
			eventsToday: isLevelSensor(device.type) ? 0 : sim.eventsToday,
			lastEventAt: isLevelSensor(device.type) ? null : sim.lastEventAt,
			lastReadingAt: lastReading?.createdAt ?? null,
			online: true,
			...(device.type === 'microphone'
				? {
						kindsToday: sim.kindsToday,
						lastEventKind: sim.lastEventKind,
					}
				: {}),
		},
	};
}

function respond<T>(
	config: InternalAxiosRequestConfig,
	status: number,
	data: T,
): AxiosResponse<T> {
	const response: AxiosResponse<T> = {
		data,
		status,
		statusText: String(status),
		headers: new AxiosHeaders(),
		config,
	};

	if (status >= 400) {
		throw new AxiosError(
			`Request failed with status code ${status}`,
			String(status),
			config,
			null,
			response,
		);
	}
	return response;
}

function parseBody<T>(config: InternalAxiosRequestConfig): T {
	return (
		typeof config.data === 'string' ? JSON.parse(config.data) : config.data
	) as T;
}

const delay = () =>
	new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));

export async function mockAdapter(
	config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> {
	await delay();

	const method = (config.method ?? 'get').toLowerCase();
	const url = config.url ?? '';
	const deviceMatch = url.match(/^\/devices\/([^/]+)(\/readings)?$/);

	if (method === 'get' && url === '/health') {
		return respond(config, 200, { status: 'ok', mock: true });
	}

	if (method === 'get' && url === '/pairing/config') {
		const mockConfig: PairingConfig = {
			suggestedApiBaseUrl: null,
			readingsUrl: null,
			heartbeatUrl: null,
			requiresDeviceToken: false,
			defaultDevicePrefix: 'esp32-01',
			softApSsid: 'PetCare-Setup',
			softApBaseUrl: 'http://10.73.73.1',
		};
		return respond(config, 200, mockConfig);
	}

	if (url === '/pairing/boards' && method === 'get') {
		const onlineWindowMs = 5 * 60 * 1000;
		return respond(
			config,
			200,
			pairedBoards.map((board) => ({
				...board,
				online:
					Date.now() - new Date(board.lastSeenAt).getTime() <
					onlineWindowMs,
			})),
		);
	}

	if (url === '/pairing/heartbeat' && method === 'post') {
		const payload = parseBody<{
			devicePrefix: string;
			ssid: string;
			ip: string;
			mac?: string;
		}>(config);
		const nowIso = new Date().toISOString();
		const existing = pairedBoards.find(
			(b) => b.devicePrefix === payload.devicePrefix,
		);
		const updated: PairedBoard = {
			_id: existing?._id ?? crypto.randomUUID(),
			devicePrefix: payload.devicePrefix,
			ssid: payload.ssid,
			ip: payload.ip,
			mac: payload.mac ?? existing?.mac ?? null,
			lastSeenAt: nowIso,
			online: true,
			createdAt: existing?.createdAt ?? nowIso,
			updatedAt: nowIso,
		};
		pairedBoards = existing
			? pairedBoards.map((b) =>
					b.devicePrefix === payload.devicePrefix ? updated : b,
				)
			: [updated, ...pairedBoards];
		saveBoards();
		return respond(config, 200, updated);
	}

	const boardDeleteMatch = url.match(/^\/pairing\/boards\/([^/]+)$/);
	if (boardDeleteMatch && method === 'delete') {
		const prefix = decodeURIComponent(boardDeleteMatch[1]);
		pairedBoards = pairedBoards.filter((b) => b.devicePrefix !== prefix);
		saveBoards();
		return respond(config, 204, null);
	}

	if (url === '/pet') {
		if (method === 'get') return respond(config, 200, pet);
		if (method === 'put') {
			return respond(
				config,
				200,
				savePet(parseBody<SavePetPayload>(config)),
			);
		}
	}

	if (method === 'get' && url === '/insights/daily') {
		const days = Math.min(
			60,
			Math.max(3, Number(config.params?.days ?? 21)),
		);
		return respond(config, 200, buildDailyStats(days));
	}

	if (url === '/devices') {
		if (method === 'get') {
			return respond(config, 200, devices.map(withStatus));
		}
		if (method === 'post') {
			const payload = parseBody<CreateDevicePayload>(config);
			const now = new Date().toISOString();
			const device: StoredDevice = {
				...payload,
				_id: crypto.randomUUID(),
				createdAt: now,
				updatedAt: now,
			};
			devices = [...devices, device];
			saveDevices();
			return respond(config, 201, withStatus(device));
		}
	}

	if (deviceMatch) {
		const [, id, readings] = deviceMatch;
		const device = devices.find((item) => item._id === id);

		if (!device) {
			return respond(config, 404, {
				message: 'Dispositivo não encontrado',
			});
		}

		if (readings && method === 'get') {
			const limit = Number(config.params?.limit ?? HISTORY_SIZE);
			return respond(config, 200, advance(device).history.slice(-limit));
		}

		if (method === 'patch') {
			const payload = parseBody<UpdateDevicePayload>(config);
			const updated = {
				...device,
				...payload,
				updatedAt: new Date().toISOString(),
			};
			devices = devices.map((item) => (item._id === id ? updated : item));
			saveDevices();
			return respond(config, 200, withStatus(updated));
		}

		if (method === 'delete') {
			devices = devices.filter((item) => item._id !== id);
			simByDevice.delete(id);
			saveDevices();
			return respond(config, 204, null);
		}
	}

	return respond(config, 404, { message: `Mock: rota ${url} não existe` });
}
