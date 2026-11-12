import { DashboardCard } from '@/components/ui/dashboard-card';
import { Skeleton } from '@/components/ui/skeleton';
import { LOW_LEVEL_THRESHOLD } from '@/features/devices/constants/deviceTypes';
import type { Device, DeviceType } from '@/features/devices/types/device';
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
			<DashboardCard title="Miados" subtitle="Detectados hoje">
				<SummaryValue
					value={devices && eventsToday(devices, 'microphone')}
				/>
			</DashboardCard>
		</div>
	);
}
