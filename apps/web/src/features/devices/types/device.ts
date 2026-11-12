export type DeviceType = 'litterBox' | 'waterBowl' | 'foodBowl' | 'microphone';

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
};

export type Device = {
	_id: string;
	name: string;
	type: DeviceType;
	/** Identificador que o ESP32 envia junto da leitura (ex.: "esp32-01:water"). */
	sensorKey: string;
	position: DevicePosition;
	status: DeviceStatus;
	createdAt: string;
	updatedAt: string;
};

export type Reading = {
	_id: string;
	sensorKey: string;
	value: number;
	createdAt: string;
};

export type CreateDevicePayload = Pick<
	Device,
	'name' | 'type' | 'sensorKey' | 'position'
>;

export type UpdateDevicePayload = Partial<
	Pick<Device, 'name' | 'sensorKey' | 'position'>
>;

export type ListReadingsParams = {
	limit?: number;
};
