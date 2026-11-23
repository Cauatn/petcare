import { useQuery } from '@tanstack/react-query';
import { getDeviceReadings } from '../services/devices';

const REFRESH_INTERVAL_MS = 3000;

/** Chave de cache das leituras de um sensor (compartilhada com `useGetDevicesReadings`). */
export const deviceReadingsQueryKey = (
	deviceId: string,
	limit: number,
	since?: string,
) => ['devices', deviceId, 'readings', limit, since ?? null] as const;

export function useGetDeviceReadings({
	deviceId,
	limit,
	since,
	refetchInterval = REFRESH_INTERVAL_MS,
}: {
	deviceId: string | null;
	limit: number;
	/** Só leituras a partir deste instante (ISO), ex.: início do dia. */
	since?: string;
	refetchInterval?: number;
}) {
	return useQuery({
		queryKey: deviceReadingsQueryKey(deviceId ?? '', limit, since),
		queryFn: () => getDeviceReadings(deviceId!, { limit, since }),
		select: (response) => response.data,
		enabled: deviceId != null,
		refetchInterval,
	});
}
