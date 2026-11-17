import { useQuery } from '@tanstack/react-query';
import { getEsp32SoftApStatus } from '../services/esp32SoftAp';

const POLL_INTERVAL_MS = 3000;

export const esp32SoftApStatusQueryKey = (baseUrl: string) => [
	'pairing',
	'softAp',
	baseUrl,
	'status',
];

/**
 * Verifica se o computador está na rede do Hotspot do ESP32. Placa inacessível vira `null`
 * (e não erro) para o status não ficar preso no último valor de sucesso.
 * O React Query pausa o polling com a aba em segundo plano.
 */
export function useGetEsp32SoftApStatus(baseUrl: string) {
	return useQuery({
		queryKey: esp32SoftApStatusQueryKey(baseUrl),
		queryFn: () => getEsp32SoftApStatus(baseUrl).catch(() => null),
		select: (response) => response?.data ?? null,
		refetchInterval: POLL_INTERVAL_MS,
		retry: false,
	});
}
