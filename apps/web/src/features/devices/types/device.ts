export type DeviceType = 'litterBox' | 'waterBowl' | 'foodBowl' | 'microphone';

/** Tipos de som do gato classificados a partir do microfone. */
export type VocalizationKind =
	'greeting' | 'demand' | 'trill' | 'yowl' | 'defensive' | 'chatter';

/** Medidas acústicas que o ESP32 extrai de cada som. */
export type VocalizationFeatures = {
	f0Hz?: number | null;
	f0StartHz?: number | null;
	f0EndHz?: number | null;
	voicedRatio?: number | null;
	zcr?: number | null;
	bursts?: number | null;
};

/** Posição no plano da casa, em % (0–100) da largura/altura. */
export type DevicePosition = {
	x: number;
	y: number;
};

export type DeviceStatus = {
	/** Nível (%) — só pote de água/ração (sensor capacitivo). */
	level: number | null;
	/** Visitas à caixa de areia ou miados detectados hoje. */
	eventsToday: number;
	lastEventAt: string | null;
	lastReadingAt: string | null;
	online: boolean;
	/** Microfone: sons de hoje por tipo. */
	kindsToday?: Partial<Record<VocalizationKind, number>>;
	/** Microfone: tipo do último som. */
	lastEventKind?: VocalizationKind | null;
};

export type Device = {
	_id: string;
	name: string;
	type: DeviceType;
	/** Identificador que o ESP32 envia junto da leitura (ex.: "esp32-01:water"). */
	sensorKey: string;
	position: DevicePosition;
	/** Capacidade do pote cheio: ml (água) ou g (ração). Converte nível em consumo. */
	capacity?: number | null;
	status: DeviceStatus;
	createdAt: string;
	updatedAt: string;
};

export type Reading = {
	_id: string;
	sensorKey: string;
	value: number;
	/** Microfone: duração do som (ms). O som termina em `createdAt`. */
	durationMs?: number;
	/** Microfone: tipo do som. */
	kind?: VocalizationKind;
	features?: VocalizationFeatures;
	createdAt: string;
};

export type CreateDevicePayload = Pick<
	Device,
	'name' | 'type' | 'sensorKey' | 'position'
> &
	Partial<Pick<Device, 'capacity'>>;

export type UpdateDevicePayload = Partial<
	Pick<Device, 'name' | 'sensorKey' | 'position' | 'capacity'>
>;

export type ListReadingsParams = {
	limit?: number;
};
