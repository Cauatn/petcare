import type { DeviceType } from '@/features/devices/types/device';
import type { HealthArea } from '../types/health';

/** Cada área de saúde vem de um tipo de dispositivo (reaproveita ícone e cores). */
export const areaDeviceType: Record<HealthArea, DeviceType> = {
	water: 'waterBowl',
	food: 'foodBowl',
	litter: 'litterBox',
	vocal: 'microphone',
};

/** Cor das barras no gráfico de tendência. */
export const areaChartColor: Record<HealthArea, string> = {
	water: 'var(--b-400)',
	food: 'var(--o-400)',
	litter: 'var(--y-600)',
	vocal: 'var(--p-500)',
};

export const healthAreaList: HealthArea[] = [
	'water',
	'food',
	'litter',
	'vocal',
];
