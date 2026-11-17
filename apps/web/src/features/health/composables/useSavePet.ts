import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savePet } from '../services/pet';
import type { SavePetPayload } from '../types/health';
import { insightsQueryKey } from './useGetDailyStats';
import { petQueryKey } from './useGetPet';

export function useSavePet() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: SavePetPayload) => savePet(payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: petQueryKey });
			queryClient.invalidateQueries({ queryKey: insightsQueryKey });
		},
	});
}
