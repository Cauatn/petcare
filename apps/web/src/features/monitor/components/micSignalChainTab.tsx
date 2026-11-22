import type { Device } from '@/features/devices/types/device';
import { useGetMicMonitor } from '../composables/useGetMicMonitor';
import { SignalChainCard } from './signalChainCard';

/** Curiosidade: o caminho do som até virar leitura, com os valores de agora em cada etapa. */
export function MicSignalChainTab({ device }: { device: Device }) {
	const { data: monitor } = useGetMicMonitor({
		sensorKey: device.sensorKey,
		paused: false,
	});

	return (
		<div>
			<SignalChainCard frame={monitor?.latest ?? null} />
		</div>
	);
}
