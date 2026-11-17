import { useMutation, useQueryClient } from '@tanstack/react-query';
import { provisionEsp32 } from '../services/esp32SoftAp';
import type { Esp32ProvisionPayload } from '../types/pairing';
import { pairedBoardsQueryKey } from './useGetPairedBoards';

export function useProvisionEsp32(baseUrl: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: Esp32ProvisionPayload) =>
			provisionEsp32(baseUrl, payload).then((response) => response.data),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: pairedBoardsQueryKey }),
	});
}
