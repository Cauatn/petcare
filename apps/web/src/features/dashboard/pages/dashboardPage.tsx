import { AppPage } from '@/components/Layout/AppPage';
import { DashboardCard } from '@/components/ui/dashboard-card';
import Divider from '@/components/ui/divider';
import { Skeleton } from '@/components/ui/skeleton';
import { TimelineList } from '@/features/devices/components/timelineList';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { useGetDevicesReadings } from '@/features/devices/composables/useGetDevicesReadings';
import {
	DAY_READINGS_LIMIT,
	mergeTimelines,
	startOfToday,
	toTimelineEvents,
} from '@/features/devices/utils/timeline';
import * as React from 'react';
import { SummaryCards } from '../components/summaryCards';

/** Resumo do dia da casa toda: números de hoje e tudo o que aconteceu, de todos os sensores. */
export function DashboardPage() {
	const { data: devices } = useGetDevices();
	const list = devices ?? [];
	const [sinceIso] = React.useState(() => startOfToday().toISOString());
	const { readingsByDevice, isLoading } = useGetDevicesReadings(list, {
		limit: DAY_READINGS_LIMIT,
		since: sinceIso,
	});

	const since = new Date(sinceIso);
	const events = mergeTimelines(
		list.map((device) =>
			toTimelineEvents(
				device,
				readingsByDevice.get(device._id) ?? [],
				since,
			),
		),
	);

	return (
		<AppPage
			title="Resumo"
			description="O dia da casa em números e tudo o que aconteceu, de todos os sensores."
			isEmpty={devices?.length === 0}
			emptyStateDescription="Adicione um dispositivo para ver o resumo do dia."
		>
			<div className="flex flex-col gap-section">
				<SummaryCards devices={devices} />
				<section className="space-y-4">
					<Divider text="O que rolou hoje" />
					<DashboardCard
						title="Linha do tempo"
						subtitle="Toque no nome do sensor para ver os detalhes dele."
						contentClassName="items-stretch"
					>
						{isLoading ? (
							<Skeleton className="h-40 w-full" />
						) : (
							<TimelineList
								events={events}
								showDevice
								emptyText="Nada aconteceu hoje ainda."
							/>
						)}
					</DashboardCard>
				</section>
			</div>
		</AppPage>
	);
}
