import { useQuery } from '@tanstack/react-query';
import { getPairedBoards } from '../services/pairing';

export const pairedBoardsQueryKey = ['pairing', 'boards'];

const REFRESH_INTERVAL_MS = 3000;

export function useGetPairedBoards() {
	return useQuery({
		queryKey: pairedBoardsQueryKey,
		queryFn: getPairedBoards,
		select: (response) => response.data,
		refetchInterval: REFRESH_INTERVAL_MS,
	});
}
