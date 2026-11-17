import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import {
	deviceShortValue,
	deviceSubtitle,
	isDeviceAlerting,
} from '@/features/devices/components/deviceMetric';
import { LevelBar } from '@/features/devices/components/levelBar';
import { deviceTypes } from '@/features/devices/constants/deviceTypes';
import { vocalizationTypes } from '@/features/devices/constants/vocalizationTypes';
import type { Device } from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

function deviceDetail(device: Device) {
	switch (device.type) {
		case 'waterBowl':
		case 'foodBowl':
			return isDeviceAlerting(device)
				? 'Hora de reabastecer'
				: 'Nível do pote';
		case 'litterBox':
			return `visitas hoje · última ${formatRelativeTime(device.status.lastEventAt)}`;
		case 'microphone': {
			const kind = device.status.lastEventKind;
			return kind
				? `sons hoje · último: ${vocalizationTypes[kind].label.toLowerCase()}`
				: 'sons hoje';
		}
	}
}

function StatusDot({ device }: { device: Device }) {
	const alerting = isDeviceAlerting(device);
	const online = device.status.online;

	return (
		<span
			title={!online ? 'Offline' : alerting ? 'Reabastecer' : 'Online'}
			className="relative flex size-2.5"
		>
			{online && !alerting ? (
				<span className="absolute inset-0 animate-ping rounded-full bg-g-400/50 [animation-duration:2.5s]" />
			) : null}
			<span
				className={cn(
					'relative size-2.5 rounded-full',
					!online ? 'bg-n-200' : alerting ? 'bg-r-500' : 'bg-g-400',
				)}
			/>
		</span>
	);
}

function DeviceStatusTile({
	device,
	isSelected,
	onSelect,
}: {
	device: Device;
	isSelected: boolean;
	onSelect: (id: string) => void;
}) {
	const config = deviceTypes[device.type];
	const Icon = config.icon;
	const alerting = isDeviceAlerting(device);
	const isBowl = device.status.level != null;

	return (
		<button
			type="button"
			onClick={() => onSelect(device._id)}
			className={cn(
				'group flex w-full flex-col gap-3 rounded-xl border bg-n-0 p-4 text-left shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-4 focus-visible:ring-accent-mint/30',
				alerting ? 'border-(--color-r-500)/50' : 'border-n-30',
				isSelected && 'ring-4 ring-accent-mint/40',
			)}
		>
			<div className="flex items-center gap-3">
				<span
					className={cn(
						'flex size-10 shrink-0 items-center justify-center rounded-xl border',
						config.tone,
					)}
				>
					<Icon className="size-5" />
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm font-semibold text-n-700">
						{device.name}
					</span>
					<span className="truncate text-xs text-n-500">
						{deviceSubtitle(device)}
					</span>
				</div>
				<StatusDot device={device} />
			</div>

			<div className="flex items-end justify-between gap-2">
				<div className="flex min-w-0 items-baseline gap-1.5">
					<span
						className={cn(
							'text-2xl font-bold tracking-tight tabular-nums',
							alerting ? 'text-danger' : 'text-n-800',
						)}
					>
						{deviceShortValue(device)}
					</span>
					<span className="truncate text-xs text-n-500">
						{deviceDetail(device)}
					</span>
				</div>
				<ChevronRight className="size-4 shrink-0 text-n-300 transition-transform group-hover:translate-x-0.5 group-hover:text-n-500" />
			</div>

			{isBowl ? <LevelBar level={device.status.level} /> : null}
		</button>
	);
}

export function DeviceStatusList({
	devices,
	selectedId,
	onSelect,
}: {
	devices: Device[] | undefined;
	selectedId: string | null;
	onSelect: (id: string) => void;
}) {
	if (devices && devices.length === 0) return null;

	const alerts = devices?.filter(isDeviceAlerting).length ?? 0;
	const offline =
		devices?.filter((device) => !device.status.online).length ?? 0;

	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="text-base font-semibold text-n-700">
					Agora em casa
				</h2>
				{devices ? (
					<span className="text-xs text-n-500">
						{alerts || offline
							? [
									alerts && `${alerts} precisando de atenção`,
									offline && `${offline} offline`,
								]
									.filter(Boolean)
									.join(' · ')
							: 'Tudo certo com os sensores'}
					</span>
				) : null}
			</div>
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{devices
					? devices.map((device) => (
							<DeviceStatusTile
								key={device._id}
								device={device}
								isSelected={device._id === selectedId}
								onSelect={onSelect}
							/>
						))
					: Array.from({ length: 4 }, (_, index) => (
							<Skeleton key={index} className="h-32 rounded-xl" />
						))}
			</div>
		</section>
	);
}
