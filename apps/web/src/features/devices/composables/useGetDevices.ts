import { useQuery } from '@tanstack/react-query';
import { getDevices } from '../services/devices';

export const devicesQueryKey = ['devices'];

/** Intervalo de atualização das leituras (polling). Trocar por SSE/WebSocket depois. */
const REFRESH_INTERVAL_MS = 3000;

export function useGetDevices() {
	return useQuery({
		queryKey: devicesQueryKey,
		queryFn: getDevices,
		select: (response) => response.data,
		refetchInterval: REFRESH_INTERVAL_MS,
	});
}
