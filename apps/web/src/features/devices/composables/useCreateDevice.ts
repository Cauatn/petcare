import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDevice } from '../services/devices';
import { devicesQueryKey } from './useGetDevices';

export function useCreateDevice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createDevice,
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: devicesQueryKey }),
	});
}
