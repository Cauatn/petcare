import { useQueries } from '@tanstack/react-query';
import { getDeviceReadings } from '../services/devices';
import type { Device, Reading } from '../types/device';

/** A linha do tempo não precisa do ritmo de 3 s: são muitas leituras por sensor. */
const REFRESH_INTERVAL_MS = 10_000;

/**
 * Leituras de vários sensores de uma vez (mesma chave de cache de `useGetDeviceReadings`,
 * então a página do sensor e o resumo compartilham o que já foi buscado).
 */
export function useGetDevicesReadings(
	devices: Device[],
	{ limit, since }: { limit: number; since?: string },
) {
	return useQueries({
		queries: devices.map((device) => ({
			queryKey: ['devices', device._id, 'readings', limit, since ?? null],
			queryFn: () => getDeviceReadings(device._id, { limit, since }),
			select: (response: { data: Reading[] }) => response.data,
			refetchInterval: REFRESH_INTERVAL_MS,
		})),
		combine: (results) => ({
			readingsByDevice: new Map(
				devices.map((device, index) => [
					device._id,
					results[index]?.data ?? [],
				]),
			),
			isLoading: results.some((result) => result.isLoading),
		}),
	});
}
