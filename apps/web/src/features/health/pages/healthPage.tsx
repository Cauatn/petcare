import { AppPage } from '@/components/Layout/AppPage';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import * as React from 'react';
import { HealthAreaCard } from '../components/healthAreaCard';
import { HealthScoreCard } from '../components/healthScoreCard';
import { HowWeCalculate } from '../components/howWeCalculate';
import { PetProfileSheet } from '../components/petProfileSheet';
import { useGetDailyStats } from '../composables/useGetDailyStats';
import { useGetPet } from '../composables/useGetPet';
import { areaDeviceType, healthAreaList } from '../constants/healthAreas';
import {
	areaLabels,
	BASELINE_EXTRA_DAYS,
	periodOptions,
} from '../constants/healthReferences';
import { assessHealth } from '../utils/assessHealth';

const periodValues = periodOptions.map((option) => option.value);

export function HealthPage() {
	const [period, setPeriod] = useQueryState(
		'days',
		parseAsStringLiteral(periodValues).withDefault('14'),
	);
	const [isProfileOpen, setIsProfileOpen] = React.useState(false);
	const days = Number(period);

	const { data: pet } = useGetPet();
	const { data: devices } = useGetDevices();
	// Só avalia o que tem sensor: área sem sensor não vira um cartão vazio
	const activeAreas = React.useMemo(
		() =>
			healthAreaList.filter((area) =>
				devices?.some((d) => d.type === areaDeviceType[area]),
			),
		[devices],
	);
	const missingAreas = healthAreaList.filter(
		(area) => devices && !activeAreas.includes(area),
	);
	// Dias extras formam a linha de base usada para detectar mudanças
	const { data: stats } = useGetDailyStats({
		days: days + BASELINE_EXTRA_DAYS,
	});

	const assessment = React.useMemo(
		() =>
			stats && pet !== undefined
				? assessHealth(stats, pet, activeAreas)
				: undefined,
		[stats, pet, activeAreas],
	);
	const visibleStats = stats?.slice(-days);

	const body = (
		<div className="flex flex-col gap-section">
			<div className="grid gap-4 lg:grid-cols-2">
				{activeAreas.map((area) =>
					assessment ? (
						<HealthAreaCard
							key={area}
							assessment={assessment.areas[area]}
							stats={visibleStats}
						/>
					) : (
						<Skeleton
							key={area}
							className="h-96 w-full rounded-lg"
						/>
					),
				)}
			</div>
			{missingAreas.length > 0 ? (
				<div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-n-40 px-4 py-3 text-sm text-ink-muted">
					<span>
						Sem sensor para:{' '}
						<strong className="text-ink-secondary">
							{missingAreas
								.map((area) => areaLabels[area])
								.join(', ')}
						</strong>
						.
					</span>
					<Link
						to="/inicio"
						className="ml-auto inline-flex items-center gap-1.5 font-semibold text-b-600 hover:underline"
					>
						<PlusCircle className="size-4" />
						Adicionar pela planta da casa
					</Link>
				</div>
			) : null}
			<HowWeCalculate pet={pet} />
		</div>
	);

	return (
		<AppPage
			title="Saúde do gato"
			description="Como o gato está, comparado com o normal dele e com referências veterinárias. Só avalia o que tem sensor e dados suficientes."
		>
			<div className="flex flex-col gap-section">
				<HealthScoreCard
					assessment={assessment}
					pet={pet}
					activeAreas={activeAreas}
					onEditPet={() => setIsProfileOpen(true)}
				/>
				<Tabs
					items={periodOptions.map((option) => ({
						value: option.value,
						label: option.label,
						content: body,
					}))}
					value={period}
					onValueChange={(value) => setPeriod(value)}
					className="space-y-4"
				/>
			</div>
			<PetProfileSheet
				open={isProfileOpen}
				pet={pet ?? null}
				onClose={() => setIsProfileOpen(false)}
			/>
		</AppPage>
	);
}
