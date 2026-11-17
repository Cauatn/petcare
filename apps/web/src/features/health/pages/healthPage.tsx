import { AppPage } from '@/components/Layout/AppPage';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import * as React from 'react';
import { HealthAreaCard } from '../components/healthAreaCard';
import { HealthScoreCard } from '../components/healthScoreCard';
import { HealthTips } from '../components/healthTips';
import { HowWeCalculate } from '../components/howWeCalculate';
import { PetProfileSheet } from '../components/petProfileSheet';
import { useGetDailyStats } from '../composables/useGetDailyStats';
import { useGetPet } from '../composables/useGetPet';
import { healthAreaList } from '../constants/healthAreas';
import {
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
	// Dias extras formam a linha de base usada para detectar mudanças
	const { data: stats } = useGetDailyStats({
		days: days + BASELINE_EXTRA_DAYS,
	});

	const assessment = React.useMemo(
		() =>
			stats && pet !== undefined ? assessHealth(stats, pet) : undefined,
		[stats, pet],
	);
	const visibleStats = stats?.slice(-days);

	const body = (
		<div className="flex flex-col gap-section">
			<div className="grid gap-4 lg:grid-cols-2">
				{healthAreaList.map((area) =>
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
			{assessment ? <HealthTips assessment={assessment} /> : null}
			<HowWeCalculate pet={pet} />
		</div>
	);

	return (
		<AppPage
			title="Saúde do gato"
			description="Hidratação, alimentação, caixa de areia e vocalização estimadas a partir dos sensores, com dicas para melhorar."
		>
			<div className="flex flex-col gap-section">
				<HealthScoreCard
					assessment={assessment}
					pet={pet}
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
