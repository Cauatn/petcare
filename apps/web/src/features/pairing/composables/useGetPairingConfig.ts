import { useQuery } from '@tanstack/react-query';
import { getPairingConfig } from '../services/pairing';

export const pairingConfigQueryKey = ['pairing', 'config'];

export function useGetPairingConfig() {
	return useQuery({
		queryKey: pairingConfigQueryKey,
		queryFn: getPairingConfig,
		select: (response) => response.data,
		staleTime: 60_000,
	});
}
