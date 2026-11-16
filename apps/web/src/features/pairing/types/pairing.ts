export type PairingConfig = {
	suggestedApiBaseUrl: string;
	readingsUrl: string;
	heartbeatUrl: string;
	deviceToken: string;
	defaultDevicePrefix: string;
	softApSsid: string;
	softApBaseUrl: string;
};

export type PairedBoard = {
	_id: string;
	devicePrefix: string;
	ssid: string;
	ip: string;
	mac: string | null;
	lastSeenAt: string;
	online: boolean;
	createdAt: string;
	updatedAt: string;
};

export type Esp32ScanNetwork = {
	ssid: string;
	rssi: number;
	auth: boolean;
};

export type Esp32SoftApStatus = {
	devicePrefix: string;
	ssid: string;
	connected: boolean;
	ip: string;
};

export type Esp32ProvisionPayload = {
	ssid: string;
	password?: string;
	apiBaseUrl: string;
	deviceToken?: string;
	devicePrefix: string;
};
