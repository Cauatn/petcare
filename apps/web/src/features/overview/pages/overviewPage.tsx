import { AppPage } from '@/components/Layout/AppPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { useGetPet } from '@/features/health/composables/useGetPet';
import { useGetPairedBoards } from '@/features/pairing/composables/useGetPairedBoards';
import { DeviceTile } from '../components/deviceTile';
import { HomeStatusHeader } from '../components/homeStatusHeader';
import { HousePlanSection } from '@/features/home/components/housePlanSection';
import { AddDeviceTile } from '../components/shortcutCards';
import { computeHomeStatus, isDeviceReachable } from '../utils/homeStatus';

const tabValues = ['dispositivos', 'casa'] as const;

export function OverviewPage() {
	const [tab, setTab] = useQueryState(
		'tab',
		parseAsStringLiteral(tabValues).withDefault('dispositivos'),
	);
	const { data: devices, isLoading: loadingDevices } = useGetDevices();
	const { data: boards = [], isLoading: loadingBoards } =
		useGetPairedBoards();
	const { data: pet } = useGetPet();

	const isLoading = loadingDevices || loadingBoards;
	const list = devices ?? [];
	const status = computeHomeStatus(list, boards);
	const onlineBoards = boards.filter((b) => b.online).length;
	const summary = [
		`${list.length} ${list.length === 1 ? 'sensor' : 'sensores'}`,
		boards.length
			? `${onlineBoards}/${boards.length} ${boards.length === 1 ? 'placa online' : 'placas online'}`
			: 'nenhuma placa',
	].join(' · ');

	return (
		<AppPage
			title="Início"
			description={`Tudo o que importa sobre ${pet?.name ?? 'o seu gato'}, num lugar só.`}
		>
			<div className="flex flex-col gap-section">
				{isLoading ? (
					<Skeleton className="h-24 w-full rounded-2xl" />
				) : (
					<HomeStatusHeader
						petName={pet?.name ?? null}
						summary={summary}
						status={status}
					/>
				)}

				<Tabs
					items={[
						{
							value: 'dispositivos',
							label: 'Dispositivos',
							content: (
								<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
									{isLoading
										? [0, 1, 2].map((i) => (
												<Skeleton
													key={i}
													className="h-64 rounded-xl"
												/>
											))
										: list.map((device) => (
												<DeviceTile
													key={device._id}
													device={device}
													reachable={isDeviceReachable(
														device,
														boards,
													)}
												/>
											))}
									{!isLoading ? <AddDeviceTile /> : null}
								</div>
							),
						},
						{
							value: 'casa',
							label: 'Minha casa',
							content: isLoading ? (
								<Skeleton className="h-96 w-full rounded-2xl" />
							) : (
								<HousePlanSection
									devices={list}
									showHeading={false}
								/>
							),
						},
					]}
					value={tab}
					onValueChange={(value) => void setTab(value)}
					className="space-y-6"
				/>
			</div>
		</AppPage>
	);
}
