import { isDeviceAlerting } from '@/features/devices/components/deviceMetric';
import type { Device } from '@/features/devices/types/device';
import { isDeviceReachable } from '@/features/devices/utils/board';
import type { PairedBoard } from '@/features/pairing/types/pairing';

export type HomeStatusKind = 'ok' | 'attention' | 'offline' | 'empty';

export type HomeStatus = {
	kind: HomeStatusKind;
	title: string;
	detail: string;
};

/** Resumo de uma linha para o topo da tela inicial (selo verde, âmbar ou vermelho). */
export function computeHomeStatus(
	devices: Device[],
	boards: PairedBoard[],
): HomeStatus {
	if (devices.length === 0 && boards.length === 0) {
		return {
			kind: 'empty',
			title: 'Vamos começar',
			detail: 'Adicione a placa do PetCare para ver o seu gato por aqui.',
		};
	}

	const anyBoardOnline = boards.length
		? boards.some((b) => b.online)
		: devices.some((d) => d.status.online);
	if (!anyBoardOnline) {
		return {
			kind: 'offline',
			title: 'Placa sem sinal',
			detail: 'Confira se ela está ligada e perto do Wi-Fi.',
		};
	}

	const reasons = [
		...devices.filter(isDeviceAlerting).map((d) => `${d.name} quase vazio`),
		...devices
			.filter((d) => !isDeviceReachable(d, boards))
			.map((d) => `${d.name} sem sinal`),
	];
	if (reasons.length > 0) {
		return {
			kind: 'attention',
			title: 'Atenção',
			detail: reasons.join(' · '),
		};
	}

	return {
		kind: 'ok',
		title: 'Tudo certo',
		detail: 'Todos os sensores estão respondendo.',
	};
}
