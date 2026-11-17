import { useMutation } from '@tanstack/react-query';
import { scanEsp32Networks } from '../services/esp32SoftAp';

/** Mutation porque a busca derruba o STA da placa por alguns segundos: só sob demanda. */
export function useScanEsp32Networks(baseUrl: string) {
	return useMutation({
		mutationFn: () =>
			scanEsp32Networks(baseUrl).then(
				(response) => response.data.networks ?? [],
			),
	});
}
