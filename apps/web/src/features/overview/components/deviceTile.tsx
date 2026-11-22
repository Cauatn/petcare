import { Separator } from '@/components/ui/separator';
import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { deviceTypes } from '@/features/devices/constants/deviceTypes';
import { vocalizationTypes } from '@/features/devices/constants/vocalizationTypes';
import type { Device } from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
	DeviceStatusBadge,
	isDeviceAlerting,
} from '@/features/devices/components/deviceMetric';

/** Número grande do cartão + legenda curta embaixo dele. */
function mainMetric(device: Device) {
	switch (device.type) {
		case 'foodBowl':
		case 'waterBowl':
			return {
				value:
					device.status.level != null
						? `${device.status.level}%`
						: '—',
				caption: 'do pote',
			};
		case 'litterBox':
			return {
				value: String(device.status.eventsToday),
				caption:
					device.status.eventsToday === 1
						? 'visita hoje'
						: 'visitas hoje',
			};
		case 'microphone':
			return {
				value: String(device.status.eventsToday),
				caption:
					device.status.eventsToday === 1 ? 'som hoje' : 'sons hoje',
			};
	}
}

/** Frase do que aconteceu por último, em linguagem do dia a dia. */
function lastActivity(device: Device) {
	switch (device.type) {
		case 'foodBowl':
		case 'waterBowl':
			return `Medido ${formatRelativeTime(device.status.lastReadingAt)}`;
		case 'litterBox':
			return device.status.lastEventAt
				? `Última visita ${formatRelativeTime(device.status.lastEventAt)}`
				: 'Nenhuma visita ainda';
		case 'microphone': {
			if (!device.status.lastEventAt) return 'Ouvindo… nenhum som ainda';
			const kind = device.status.lastEventKind;
			const label = kind ? vocalizationTypes[kind].label : 'Som';
			return `${label} ${formatRelativeTime(device.status.lastEventAt)}`;
		}
	}
}

/** Cartão de um sensor na tela inicial (no estilo dos cartões de módulo do Vinea). */
export function DeviceTile({
	device,
	reachable,
}: {
	device: Device;
	reachable: boolean;
}) {
	const config = deviceTypes[device.type];
	const Icon = config.icon;
	const metric = mainMetric(device);
	const low = isDeviceAlerting(device);

	return (
		<Link to={`/devices/${device._id}`} className="group block">
			<article className="flex h-full flex-col overflow-hidden rounded-xl border border-n-30 bg-n-0 p-4 shadow-xs transition-colors group-hover:bg-n-10">
				<div
					className={cn(
						'mb-4 flex items-center justify-between rounded-lg px-5 py-6',
						low ? 'bg-r-100 text-r-700' : config.tone,
					)}
				>
					<Icon className="size-8" />
					<div className="text-right">
						<p className="text-3xl leading-none font-bold">
							{metric.value}
						</p>
						<p className="mt-1 text-xs font-medium opacity-80">
							{metric.caption}
						</p>
					</div>
				</div>

				<div className="flex-1">
					<div className="flex items-center justify-between gap-2">
						<p className="truncate text-base font-semibold text-ink-secondary">
							{device.name}
						</p>
						<DeviceStatusBadge device={device} online={reachable} />
					</div>
					<p className="mt-1 text-sm text-n-600">
						{lastActivity(device)}
					</p>
				</div>

				<div className="mt-4 space-y-3">
					<Separator />
					<div className="flex items-center justify-between">
						<p className="text-sm font-semibold tracking-[0.2px] text-n-600">
							Ver detalhes
						</p>
						<ArrowRight className="size-5 text-n-600 transition-transform group-hover:translate-x-0.5" />
					</div>
				</div>
			</article>
		</Link>
	);
}
