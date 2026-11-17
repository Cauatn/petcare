import {
	Box,
	Droplets,
	Mic,
	UtensilsCrossed,
	type LucideIcon,
} from 'lucide-react';
import type { DeviceType } from '../types/device';

export type DeviceTypeConfig = {
	label: string;
	sensor: string;
	icon: LucideIcon;
	/** Classes do círculo do marcador no plano. */
	tone: string;
	defaultSensorSuffix: string;
};

export const deviceTypes: Record<DeviceType, DeviceTypeConfig> = {
	litterBox: {
		label: 'Caixa de areia',
		sensor: 'Sensor de proximidade',
		icon: Box,
		tone: 'bg-y-100 text-y-700 border-(--color-y-400)',
		defaultSensorSuffix: 'proximity',
	},
	waterBowl: {
		label: 'Pote de água',
		sensor: 'Sensor capacitivo de nível',
		icon: Droplets,
		tone: 'bg-b-100 text-b-600 border-(--color-b-400)',
		defaultSensorSuffix: 'water',
	},
	foodBowl: {
		label: 'Pote de ração',
		sensor: 'Sensor capacitivo de nível',
		icon: UtensilsCrossed,
		tone: 'bg-o-100 text-o-400 border-o-400',
		defaultSensorSuffix: 'food',
	},
	microphone: {
		label: 'Microfone',
		sensor: 'Microfone (detecção de miado)',
		icon: Mic,
		tone: 'bg-g-100 text-g-600 border-g-400',
		defaultSensorSuffix: 'mic',
	},
};

export const deviceTypeList = Object.keys(deviceTypes) as DeviceType[];

/** Unidade da capacidade de cada pote (só potes têm capacidade). */
export const bowlCapacityUnit: Record<DeviceType, 'ml' | 'g' | null> = {
	waterBowl: 'ml',
	foodBowl: 'g',
	litterBox: null,
	microphone: null,
};

/** Abaixo disso o pote é considerado vazio/precisando reabastecer. */
export const LOW_LEVEL_THRESHOLD = 20;
