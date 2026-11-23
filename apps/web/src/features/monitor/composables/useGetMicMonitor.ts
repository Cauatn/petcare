import { useQuery } from '@tanstack/react-query';
import { getMicMonitor } from '../services/monitor';

/** ~2 quadros por segundo: é o ritmo que o ESP32 usa quando a página está aberta. */
const REFRESH_INTERVAL_MS = 500;

/**
 * Consultar a API marca o sensor como "observado" — só então o ESP32 passa a mandar
 * quadros rápidos. Pausado, o polling para e o último quadro continua na tela.
 */
export function useGetMicMonitor({
	sensorKey,
	paused,
}: {
	sensorKey: string | null;
	paused: boolean;
}) {
	return useQuery({
		queryKey: ['monitor', sensorKey],
		queryFn: () => getMicMonitor(sensorKey!),
		select: (response) => response.data,
		enabled: sensorKey != null && !paused,
		refetchInterval: REFRESH_INTERVAL_MS,
		refetchIntervalInBackground: false,
	});
}
