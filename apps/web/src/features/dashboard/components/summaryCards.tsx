import { DashboardCard } from '@/components/ui/dashboard-card';
import { Skeleton } from '@/components/ui/skeleton';
import { LOW_LEVEL_THRESHOLD } from '@/features/devices/constants/deviceTypes';
import { vocalizationTypes } from '@/features/devices/constants/vocalizationTypes';
import type {
	Device,
	DeviceType,
	VocalizationKind,
} from '@/features/devices/types/device';
import { cn } from '@/lib/utils';

function lowestLevel(devices: Device[], type: DeviceType) {
	const levels = devices
		.filter((device) => device.type === type)
		.map((device) => device.status.level ?? 0);
	return levels.length ? Math.min(...levels) : null;
}

function eventsToday(devices: Device[], type: DeviceType) {
	return devices
		.filter((device) => device.type === type)
		.reduce((total, device) => total + device.status.eventsToday, 0);
}

const TOP_KINDS = 3;

/** Tipos de som mais frequentes hoje, somando todos os microfones. */
function topKindsToday(devices: Device[]) {
	const totals = new Map<VocalizationKind, number>();
	for (const device of devices) {
		if (device.type !== 'microphone') continue;
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

function KindBreakdown({ devices }: { devices: Device[] | undefined }) {
	if (!devices) return null;
	const kinds = topKindsToday(devices);
	if (!kinds.length) return null;

	return (
		<div className="flex flex-wrap justify-center gap-1.5">
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

function SummaryValue({
	value,
	suffix,
	alert = false,
}: {
	value: number | null | undefined;
	suffix?: string;
	alert?: boolean;
}) {
	if (value === undefined) return <Skeleton className="mt-3 h-9 w-20" />;

	return (
		<span
			className={cn(
				'mt-2 text-3xl font-bold',
				alert ? 'text-danger' : 'text-n-800',
			)}
		>
			{value === null ? '—' : `${value}${suffix ?? ''}`}
		</span>
	);
}

export function SummaryCards({ devices }: { devices: Device[] | undefined }) {
	const water = devices && lowestLevel(devices, 'waterBowl');
	const food = devices && lowestLevel(devices, 'foodBowl');

	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<DashboardCard title="Água" subtitle="Pote mais vazio">
				<SummaryValue
					value={water}
					suffix="%"
					alert={water != null && water < LOW_LEVEL_THRESHOLD}
				/>
			</DashboardCard>
			<DashboardCard title="Ração" subtitle="Pote mais vazio">
				<SummaryValue
					value={food}
					suffix="%"
					alert={food != null && food < LOW_LEVEL_THRESHOLD}
				/>
			</DashboardCard>
			<DashboardCard title="Caixa de areia" subtitle="Visitas hoje">
				<SummaryValue
					value={devices && eventsToday(devices, 'litterBox')}
				/>
			</DashboardCard>
			<DashboardCard
				title="Miados"
				subtitle="Detectados hoje"
				footer={
					devices && topKindsToday(devices).length ? (
						<KindBreakdown devices={devices} />
					) : undefined
				}
			>
				<SummaryValue
					value={devices && eventsToday(devices, 'microphone')}
				/>
			</DashboardCard>
		</div>
	);
}
