import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../service/health';

export const healthQueryKey = ['health'];

export function useGetHealth() {
	return useQuery({
		queryKey: healthQueryKey,
		queryFn: getHealth,
		select: (response) => response.data,
		refetchInterval: 10000,
		retry: false,
	});
}
