import { LOW_LEVEL_THRESHOLD } from '@/features/devices/constants/deviceTypes';
import type { Device } from '@/features/devices/types/device';
import type { PairedBoard } from '@/features/pairing/types/pairing';

export type HomeStatusKind = 'ok' | 'attention' | 'offline' | 'empty';

export type HomeStatus = {
	kind: HomeStatusKind;
	title: string;
	detail: string;
};

/** Prefixo da placa na chave do sensor ("esp32-01:mic" → "esp32-01"). */
export function boardPrefixOf(device: Device) {
	return device.sensorKey.split(':')[0];
}

/**
 * O sensor "está respondendo" quando a placa dele está online. Usa a placa (heartbeat a cada
 * 15 s) e não a última leitura, porque o microfone e a caixa de areia só mandam dados quando
 * algo acontece — em silêncio eles pareceriam desligados.
 */
export function isDeviceReachable(device: Device, boards: PairedBoard[]) {
	const board = boards.find((b) => b.devicePrefix === boardPrefixOf(device));
	return board ? board.online : device.status.online;
}

export function isBowlLow(device: Device) {
	return (
		(device.type === 'foodBowl' || device.type === 'waterBowl') &&
		device.status.level != null &&
		device.status.level < LOW_LEVEL_THRESHOLD
	);
}

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
		...devices.filter(isBowlLow).map((d) => `${d.name} quase vazio`),
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
