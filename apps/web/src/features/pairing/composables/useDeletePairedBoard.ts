import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePairedBoard } from '../services/pairing';
import { pairedBoardsQueryKey } from './useGetPairedBoards';

export function useDeletePairedBoard() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deletePairedBoard,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: pairedBoardsQueryKey }),
	});
}
