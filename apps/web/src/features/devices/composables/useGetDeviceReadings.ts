import { useQuery } from '@tanstack/react-query';
import { getDeviceReadings } from '../services/devices';

const REFRESH_INTERVAL_MS = 3000;

export function useGetDeviceReadings({
	deviceId,
	limit,
}: {
	deviceId: string | null;
	limit: number;
}) {
	return useQuery({
		queryKey: ['devices', deviceId, 'readings', limit],
		queryFn: () => getDeviceReadings(deviceId!, { limit: limit }),
		select: (response) => response.data,
		enabled: deviceId != null,
		refetchInterval: REFRESH_INTERVAL_MS,
	});
}
