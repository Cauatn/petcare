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
} from '@/features/devices/types/device';
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
const HISTORY_SIZE = 60;
const TICK_MS = 3000;

type StoredDevice = Omit<Device, 'status'>;

type SimState = {
	level: number;
	eventsToday: number;
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
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		_id: 'seed-food',
		name: 'Pote de ração',
		type: 'foodBowl',
		sensorKey: 'esp32-01:food',
		position: { x: 60, y: 22 },
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

const isLevelSensor = (type: DeviceType) =>
	type === 'waterBowl' || type === 'foodBowl';

function readingValue(type: DeviceType, sim: SimState) {
	if (isLevelSensor(type)) return Math.round(sim.level);
	if (type === 'microphone') return Math.round(35 + Math.random() * 15);
	return 0;
}

/** Eventos esporádicos no histórico inicial (visitas / miados). */
function backfillEventValue(type: DeviceType) {
	const isEvent = Math.random() < 0.08;
	if (type === 'litterBox') return Number(isEvent);
	return isEvent
		? Math.round(65 + Math.random() * 20)
		: Math.round(35 + Math.random() * 15);
}

function getSim(device: StoredDevice): SimState {
	let sim = simByDevice.get(device._id);
	if (sim) return sim;

	const now = Date.now();
	sim = {
		level: 55 + Math.random() * 40,
		eventsToday: Math.floor(Math.random() * 5),
		lastEventAt: new Date(now - Math.random() * 3_600_000).toISOString(),
		lastTickAt: now,
		history: [],
	};

	// Histórico retroativo para o gráfico já nascer preenchido
	for (let i = HISTORY_SIZE; i > 0; i--) {
		sim.history.push({
			_id: `${device._id}-h${i}`,
			sensorKey: device.sensorKey,
			value: isLevelSensor(device.type)
				? Math.round(Math.min(100, sim.level + i * 0.6))
				: backfillEventValue(device.type),
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

		if (isLevelSensor(device.type)) {
			sim.level = Math.max(0, sim.level - Math.random() * 1.2);
			// Alguém reabasteceu o pote
			if (sim.level < 10 && Math.random() < 0.15) sim.level = 100;
		} else if (Math.random() < 0.06) {
			// Gato entrou na caixinha / miou
			sim.eventsToday += 1;
			sim.lastEventAt = new Date(at).toISOString();
		}

		const isEvent = sim.lastEventAt === new Date(at).toISOString();
		sim.history.push({
			_id: `${device._id}-${at}`,
			sensorKey: device.sensorKey,
			value:
				device.type === 'microphone' && isEvent
					? Math.round(65 + Math.random() * 20)
					: device.type === 'litterBox'
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
			suggestedApiBaseUrl: '',
			readingsUrl: '/api/readings',
			heartbeatUrl: '/api/pairing/heartbeat',
			deviceToken: '',
			defaultDevicePrefix: 'esp32-01',
			softApSsid: 'PetCare-Setup',
			softApBaseUrl: 'http://192.168.4.1',
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
