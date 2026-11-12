import { AppPage } from '@/components/Layout/AppPage';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { useQueryState } from 'nuqs';
import * as React from 'react';
import { DeviceChartCard } from '../components/deviceChartCard';
import { SummaryCards } from '../components/summaryCards';

export function DashboardPage() {
	const { data: devices } = useGetDevices();
	// Vindo do plano da casa: ?device=<id> rola até o gráfico e destaca
	const [highlightedId] = useQueryState('device');
	const hasDevices = devices != null;

	React.useEffect(() => {
		if (!highlightedId || !hasDevices) return;
		document
			.getElementById(`device-${highlightedId}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, [highlightedId, hasDevices]);

	return (
		<AppPage
			title="Dashboard"
			description="Resumo do dia e histórico recente de cada sensor."
			isEmpty={devices?.length === 0}
			emptyStateDescription="Adicione dispositivos pelo plano em “Minha casa”."
		>
			<div className="flex flex-col gap-section">
				<SummaryCards devices={devices} />
				<div className="grid gap-4 xl:grid-cols-2">
					{devices?.map((device) => (
						<DeviceChartCard
							key={device._id}
							device={device}
							isHighlighted={device._id === highlightedId}
						/>
					))}
				</div>
			</div>
		</AppPage>
	);
}
