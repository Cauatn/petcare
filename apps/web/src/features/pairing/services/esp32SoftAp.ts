import axios from 'axios';
import type {
	Esp32ProvisionPayload,
	Esp32ScanNetwork,
	Esp32SoftApStatus,
} from '../types/pairing';

/**
 * Cliente do portal do ESP32 (Hotspot). Fica fora do `api` porque fala direto com a placa,
 * não com a API, e não deve passar pelo mockAdapter.
 */
const softAp = axios.create();

export const getEsp32SoftApStatus = (baseUrl: string) =>
	softAp.get<Esp32SoftApStatus>(`${baseUrl}/status`, { timeout: 1800 });

export const scanEsp32Networks = (baseUrl: string) =>
	softAp.get<{ networks?: Esp32ScanNetwork[] }>(`${baseUrl}/scan`, {
		timeout: 8000,
	});

export const provisionEsp32 = (
	baseUrl: string,
	payload: Esp32ProvisionPayload,
) =>
	softAp.post<{ ok: boolean; message?: string }>(
		`${baseUrl}/provision`,
		payload,
		{ timeout: 5000 },
	);
