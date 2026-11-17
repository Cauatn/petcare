import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { LevelBar } from '@/features/devices/components/levelBar';
import {
	LOW_LEVEL_THRESHOLD,
	deviceTypes,
} from '@/features/devices/constants/deviceTypes';
import { vocalizationTypes } from '@/features/devices/constants/vocalizationTypes';
import type {
	Device,
	DeviceType,
	VocalizationKind,
} from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import type * as React from 'react';

function ofType(devices: Device[], type: DeviceType) {
	return devices.filter((device) => device.type === type);
}

function lowestLevel(devices: Device[], type: DeviceType) {
	const levels = ofType(devices, type).map(
		(device) => device.status.level ?? 0,
	);
	return levels.length ? Math.min(...levels) : null;
}

function eventsToday(devices: Device[], type: DeviceType) {
	return ofType(devices, type).reduce(
		(total, device) => total + device.status.eventsToday,
		0,
	);
}

function lastEventAt(devices: Device[], type: DeviceType) {
	const dates = ofType(devices, type)
		.map((device) => device.status.lastEventAt)
		.filter((date): date is string => date != null)
		.sort();
	return dates.at(-1) ?? null;
}

const TOP_KINDS = 3;

/** Tipos de som mais frequentes hoje, somando todos os microfones. */
function topKindsToday(devices: Device[]) {
	const totals = new Map<VocalizationKind, number>();
	for (const device of ofType(devices, 'microphone')) {
		for (const [kind, count] of Object.entries(
			device.status.kindsToday ?? {},
		)) {
			const key = kind as VocalizationKind;
			totals.set(key, (totals.get(key) ?? 0) + (count ?? 0));
		}
	}
	return [...totals.entries()]
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1])
		.slice(0, TOP_KINDS);
}

function KindBreakdown({ devices }: { devices: Device[] }) {
	const kinds = topKindsToday(devices);
	if (!kinds.length)
		return <span className="text-xs text-n-400">Nenhum som hoje</span>;

	return (
		<div className="flex flex-wrap gap-1.5">
			{kinds.map(([kind, count]) => {
				const config = vocalizationTypes[kind];
				const Icon = config.icon;
				return (
					<span
						key={kind}
						title={`${config.label}: ${config.meaning}`}
						className={cn(
							'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
							config.tone,
						)}
					>
						<Icon className="size-3" />
						{count}
					</span>
				);
			})}
		</div>
	);
}

type SummaryTileProps = {
	type: DeviceType;
	title: string;
	caption: string;
	value: number | null | undefined;
	suffix?: string;
	alert?: boolean;
	footer?: React.ReactNode;
};

function SummaryTile({
	type,
	title,
	caption,
	value,
	suffix,
	alert = false,
	footer,
}: SummaryTileProps) {
	const config = deviceTypes[type];
	const Icon = config.icon;

	return (
		<div
			className={cn(
				'flex min-w-0 flex-col gap-3 rounded-xl border bg-n-0 p-4 shadow-xs transition-colors sm:gap-4 sm:p-5',
				alert ? 'border-(--color-r-500)/50' : 'border-n-30',
			)}
		>
			<div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-3">
				<span
					className={cn(
						'flex size-9 shrink-0 items-center justify-center rounded-xl border sm:size-10',
						config.tone,
					)}
				>
					<Icon className="size-5" />
				</span>
				<div className="flex min-w-0 flex-col">
					<span className="text-sm leading-tight font-semibold text-n-700">
						{title}
					</span>
					<span className="truncate text-xs text-n-500">
						{caption}
					</span>
				</div>
			</div>

			{value === undefined ? (
				<Skeleton className="h-9 w-20" />
			) : (
				<span
					className={cn(
						'text-3xl font-bold tracking-tight tabular-nums',
						alert ? 'text-danger' : 'text-n-800',
					)}
				>
					{value === null ? '—' : value}
					{value !== null && suffix ? (
						<span className="ml-0.5 text-lg font-semibold text-n-400">
							{suffix}
						</span>
					) : null}
				</span>
			)}

			{footer ? <div className="mt-auto">{footer}</div> : null}
		</div>
	);
}

function LevelFooter({ level }: { level: number | null }) {
	if (level == null)
		return <span className="text-xs text-n-400">Sem sensor</span>;

	const low = level < LOW_LEVEL_THRESHOLD;
	return (
		<div className="flex flex-col gap-1.5">
			<LevelBar level={level} />
			<span
				className={cn(
					'text-xs font-medium',
					low ? 'text-r-600' : 'text-n-500',
				)}
			>
				{low ? 'Hora de reabastecer' : 'Nível ok'}
			</span>
		</div>
	);
}

export function SummaryCards({ devices }: { devices: Device[] | undefined }) {
	const water = devices && lowestLevel(devices, 'waterBowl');
	const food = devices && lowestLevel(devices, 'foodBowl');
	const lastLitter = devices && lastEventAt(devices, 'litterBox');

	return (
		<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
			<SummaryTile
				type="waterBowl"
				title="Água"
				caption="Pote mais vazio"
				value={water}
				suffix="%"
				alert={water != null && water < LOW_LEVEL_THRESHOLD}
				footer={devices ? <LevelFooter level={water ?? null} /> : null}
			/>
			<SummaryTile
				type="foodBowl"
				title="Ração"
				caption="Pote mais vazio"
				value={food}
				suffix="%"
				alert={food != null && food < LOW_LEVEL_THRESHOLD}
				footer={devices ? <LevelFooter level={food ?? null} /> : null}
			/>
			<SummaryTile
				type="litterBox"
				title="Caixa de areia"
				caption="Visitas hoje"
				value={devices && eventsToday(devices, 'litterBox')}
				footer={
					devices ? (
						<span className="text-xs text-n-500">
							Última visita{' '}
							{formatRelativeTime(lastLitter ?? null)}
						</span>
					) : null
				}
			/>
			<SummaryTile
				type="microphone"
				title="Miados"
				caption="Detectados hoje"
				value={devices && eventsToday(devices, 'microphone')}
				footer={devices ? <KindBreakdown devices={devices} /> : null}
			/>
		</div>
	);
}
