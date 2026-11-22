import { useQuery } from '@tanstack/react-query';
import { getDeviceReadings } from '../services/devices';

const REFRESH_INTERVAL_MS = 3000;

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
		queryKey: ['devices', deviceId, 'readings', limit, since ?? null],
		queryFn: () => getDeviceReadings(deviceId!, { limit, since }),
		select: (response) => response.data,
		enabled: deviceId != null,
		refetchInterval,
	});
}
