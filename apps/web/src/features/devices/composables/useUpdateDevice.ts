import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateDevice } from '../services/devices';
import type { Device, UpdateDevicePayload } from '../types/device';
import { devicesQueryKey } from './useGetDevices';

export function useUpdateDevice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			payload,
		}: {
			id: string;
			payload: UpdateDevicePayload;
		}) => updateDevice(id, payload),
		// Atualização otimista: o marcador fica onde foi solto sem "pular"
		onMutate: async ({ id, payload }) => {
			await queryClient.cancelQueries({ queryKey: devicesQueryKey });
			const previous = queryClient.getQueryData(devicesQueryKey);

			queryClient.setQueryData(
				devicesQueryKey,
				(old: { data: Device[] } | undefined) =>
					old && {
						...old,
						data: old.data.map((device) =>
							device._id === id
								? { ...device, ...payload }
								: device,
						),
					},
			);

			return { previous: previous };
		},
		onError: (_error, _variables, context) => {
			queryClient.setQueryData(devicesQueryKey, context?.previous);
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: devicesQueryKey }),
	});
}
