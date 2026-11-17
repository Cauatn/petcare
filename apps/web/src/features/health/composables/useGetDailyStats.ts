import { useQuery } from '@tanstack/react-query';
import { getDailyStats } from '../services/health';

export const insightsQueryKey = ['insights'];

/** Os agregados diários mudam devagar: um minuto basta. */
const REFRESH_INTERVAL_MS = 60_000;

export function useGetDailyStats({ days }: { days: number }) {
	return useQuery({
		queryKey: [...insightsQueryKey, 'daily', days],
		queryFn: () => getDailyStats({ days }),
		select: (response) => response.data,
		refetchInterval: REFRESH_INTERVAL_MS,
	});
}
