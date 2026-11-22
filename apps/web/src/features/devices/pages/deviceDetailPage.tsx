import { AppPage } from '@/components/Layout/AppPage';
import { Button } from '@/components/ui/button';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { Skeleton } from '@/components/ui/skeleton';
import { type TabItem, Tabs } from '@/components/ui/tabs';
import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { ReadingsChart } from '@/features/dashboard/components/readingsChart';
import { VocalizationChart } from '@/features/dashboard/components/vocalizationChart';
import { DeviceSettingsSheet } from '@/features/home/components/deviceSettingsSheet';
import { MicLivePanel } from '@/features/monitor/components/micLivePanel';
import { MicSignalChainTab } from '@/features/monitor/components/micSignalChainTab';
import { useGetPairedBoards } from '@/features/pairing/composables/useGetPairedBoards';
import { cn } from '@/lib/utils';
import { ArrowLeft, AudioWaveform, Pencil } from 'lucide-react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DeviceAboutCard } from '../components/deviceAboutCard';
import { DeviceNowCard } from '../components/deviceNowCard';
import { TimelineList } from '../components/timelineList';
import { deviceTypes } from '../constants/deviceTypes';
import { vocalizationTypes } from '../constants/vocalizationTypes';
import { useGetDeviceReadings } from '../composables/useGetDeviceReadings';
import { useGetDevices } from '../composables/useGetDevices';
import type { Device } from '../types/device';
import { startOfToday, toTimelineEvents } from '../utils/timeline';

/** Leituras suficientes para o dia de um microfone/caixa e algumas horas de um pote. */
const READINGS_LIMIT = 300;

const tabValues = ['geral', 'ao-vivo', 'sobre'] as const;
type DeviceTab = (typeof tabValues)[number];

export function DeviceDetailPage() {
	const { deviceId = null } = useParams<{ deviceId: string }>();
	const navigate = useNavigate();
	const { data: devices, isLoading } = useGetDevices();
	const { data: boards = [] } = useGetPairedBoards();
	const { data: readings = [] } = useGetDeviceReadings({
		deviceId,
		limit: READINGS_LIMIT,
	});
	const [tab, setTab] = useQueryState(
		'tab',
		parseAsStringLiteral(tabValues).withDefault('geral'),
	);
	const [isEditing, setIsEditing] = React.useState(false);

	const device = devices?.find((d) => d._id === deviceId) ?? null;

	if (isLoading) {
		return (
			<AppPage title="Carregando…">
				<Skeleton className="h-48 w-full rounded-2xl" />
			</AppPage>
		);
	}

	if (!device) {
		return (
			<AppPage
				title="Sensor não encontrado"
				description="Ele pode ter sido removido."
				headerActions={<BackLink />}
			/>
		);
	}

	const config = deviceTypes[device.type];
	const prefix = device.sensorKey.split(':')[0];
	const board = boards.find((b) => b.devicePrefix === prefix);
	const events = toTimelineEvents(device, readings, startOfToday()).reverse();
	const isMic = device.type === 'microphone';

	const overview = (
		<div className="flex flex-col gap-4">
			{isMic ? (
				<MicNowStrip
					device={device}
					online={board?.online ?? device.status.online}
					onOpenLive={() => void setTab('ao-vivo')}
				/>
			) : (
				<DeviceNowCard device={device} readings={readings} />
			)}
			<div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				<DashboardCard
					title={isMic ? 'Sons recentes' : 'Histórico recente'}
					subtitle={
						isMic
							? 'Cada som com a forma da onda e o tipo que a API identificou.'
							: 'As últimas leituras do sensor.'
					}
					contentClassName="items-start pb-0"
				>
					<div className="w-full min-w-0">
						{isMic ? (
							<VocalizationChart device={device} />
						) : (
							<ReadingsChart device={device} />
						)}
					</div>
				</DashboardCard>
				<DashboardCard
					title="Hoje"
					subtitle="Do mais recente para o mais antigo."
					contentClassName="items-stretch"
				>
					<TimelineList
						events={events}
						emptyText="Nada aconteceu hoje por aqui ainda."
					/>
				</DashboardCard>
			</div>
		</div>
	);

	const items: TabItem<DeviceTab>[] = [
		{ value: 'geral', label: 'Visão geral', content: overview },
		...(isMic
			? [
					{
						value: 'ao-vivo' as const,
						label: 'Ao vivo',
						content: <MicLivePanel device={device} />,
					},
				]
			: []),
		{
			value: 'sobre',
			label: 'Sobre',
			content: (
				<div className="flex flex-col gap-4">
					<DeviceAboutCard device={device} board={board} />
					{isMic ? <MicSignalChainTab device={device} /> : null}
				</div>
			),
		},
	];

	return (
		<AppPage
			title={device.name}
			description={`${config.sensor} · placa ${prefix}`}
			headerActions={
				<div className="flex items-center gap-2">
					<BackLink />
					<Button
						variant="outline"
						onClick={() => setIsEditing(true)}
					>
						<Pencil className="size-4" />
						Editar
					</Button>
				</div>
			}
		>
			<Tabs
				items={items}
				value={tab}
				onValueChange={(value) => void setTab(value)}
				className="space-y-6"
			/>

			<DeviceSettingsSheet
				device={isEditing ? device : null}
				onClose={() => setIsEditing(false)}
				onDeleted={() => navigate('/inicio')}
				hideDetailsLink
			/>
		</AppPage>
	);
}

/** "Agora" do microfone sem abrir o sinal ao vivo: está ouvindo? qual foi o último som? */
function MicNowStrip({
	device,
	online,
	onOpenLive,
}: {
	device: Device;
	online: boolean;
	onOpenLive: () => void;
}) {
	const kind = device.status.lastEventKind;
	const last = device.status.lastEventAt
		? `${kind ? vocalizationTypes[kind].label : 'Som'} ${formatRelativeTime(device.status.lastEventAt)}`
		: 'Nenhum som ainda hoje';

	return (
		<section className="flex flex-col gap-3 rounded-2xl border border-n-30 bg-n-0 p-4 shadow-xs sm:flex-row sm:items-center">
			<span
				className={cn(
					'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold',
					online ? 'bg-g-100 text-g-700' : 'bg-n-20 text-n-600',
				)}
			>
				<span
					className={cn(
						'size-2 rounded-full',
						online ? 'animate-pulse bg-g-500' : 'bg-n-400',
					)}
				/>
				{online ? 'Ouvindo' : 'Sem sinal'}
			</span>
			<p className="flex-1 text-sm text-ink-secondary">
				<strong>{device.status.eventsToday}</strong>{' '}
				{device.status.eventsToday === 1 ? 'som hoje' : 'sons hoje'} ·
				último: {last}
			</p>
			<Button variant="outline" size="sm" onClick={onOpenLive}>
				<AudioWaveform className="size-4" />
				Ver o sinal ao vivo
			</Button>
		</section>
	);
}

function BackLink() {
	return (
		<Button variant="outline" asChild>
			<Link to="/inicio">
				<ArrowLeft className="size-4" />
				Início
			</Link>
		</Button>
	);
}
