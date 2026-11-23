import type { PairedBoard } from '@/features/pairing/types/pairing';
import type { Device } from '../types/device';

/** Prefixo da placa na chave do sensor ("esp32-01:mic" → "esp32-01"). */
export function boardPrefixOf(device: Device) {
	return device.sensorKey.split(':')[0];
}

/** A placa a que o sensor pertence, se já foi pareada. */
export function findBoard(device: Device, boards: PairedBoard[]) {
	const prefix = boardPrefixOf(device);
	return boards.find((board) => board.devicePrefix === prefix);
}

/**
 * O sensor "está respondendo" quando a placa dele está online. Usa a placa (heartbeat a cada
 * 15 s) e não a última leitura, porque o microfone e a caixa de areia só mandam dados quando
 * algo acontece — em silêncio eles pareceriam desligados.
 */
export function isDeviceReachable(device: Device, boards: PairedBoard[]) {
	const board = findBoard(device, boards);
	return board ? board.online : device.status.online;
}
