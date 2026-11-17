import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { LOW_LEVEL_THRESHOLD, deviceTypes } from '../constants/deviceTypes';
import { vocalizationTypes } from '../constants/vocalizationTypes';
import type { Device } from '../types/device';

export function isDeviceAlerting(device: Device) {
	return (
		device.status.level != null && device.status.level < LOW_LEVEL_THRESHOLD
	);
}

/** Valor principal do dispositivo em texto curto (usado no marcador do plano). */
export function deviceShortValue(device: Device) {
	if (device.status.level != null) return `${device.status.level}%`;
	return String(device.status.eventsToday);
}

/** Linha secundária sob o nome: o tipo, ou o sensor quando o nome já é o tipo. */
export function deviceSubtitle(device: Device) {
	const config = deviceTypes[device.type];
	return device.name === config.label ? config.sensor : config.label;
}

export function deviceMetricLabel(device: Device) {
	switch (device.type) {
		case 'waterBowl':
		case 'foodBowl':
			return `Nível: ${device.status.level ?? '—'}%`;
		case 'litterBox':
			return `${device.status.eventsToday} visita(s) hoje · última ${formatRelativeTime(device.status.lastEventAt)}`;
		case 'microphone': {
			const lastKind = device.status.lastEventKind;
			const kindLabel = lastKind
				? `${vocalizationTypes[lastKind].label.toLowerCase()} `
				: '';
			return `${device.status.eventsToday} som(ns) hoje · último: ${kindLabel}${formatRelativeTime(device.status.lastEventAt)}`;
		}
	}
}

export function DeviceStatusBadge({ device }: { device: Device }) {
	if (!device.status.online) return <Badge variant="neutral">Offline</Badge>;
	if (isDeviceAlerting(device))
		return <Badge variant="red">Reabastecer</Badge>;
	return <Badge variant="green">Online</Badge>;
}
