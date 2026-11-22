import { deviceTypes } from '@/features/devices/constants/deviceTypes';
import {
	vocalizationKindList,
	vocalizationTypes,
} from '@/features/devices/constants/vocalizationTypes';
import { cn } from '@/lib/utils';
import {
	Hourglass,
	Info,
	Lightbulb,
	Minus,
	Moon,
	TrendingDown,
	TrendingUp,
} from 'lucide-react';
import { areaDeviceType } from '../constants/healthAreas';
import { areaLabels } from '../constants/healthReferences';
import type { AreaAssessment } from '../types/health';
import { HealthStatusBadge, healthStatusMeta } from './healthStatusBadge';
import { HealthTrendChart } from './healthTrendChart';
import type { DailyCatStats } from '../types/health';
import { TargetRangeBar } from './targetRangeBar';

const formatNumber = (value: number) =>
	value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function TrendLabel({ trendPct }: { trendPct: number | null }) {
	if (trendPct == null) {
		return (
			<span className="text-xs text-n-400">
				Sem histórico para comparar
			</span>
		);
	}
	const Icon =
		Math.abs(trendPct) < 0.1
			? Minus
			: trendPct > 0
				? TrendingUp
				: TrendingDown;
	const sign = trendPct > 0 ? '+' : '';
	return (
		<span className="flex items-center gap-1 text-xs text-n-600">
			<Icon className="size-3.5" />
			{sign}
			{Math.round(trendPct * 100)}% vs. média anterior
		</span>
	);
}

/** Média diária de cada tipo de som, com o ícone do significado. */
function VocalBreakdown({
	breakdown,
}: {
	breakdown: NonNullable<AreaAssessment['breakdown']>;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap gap-1.5">
				{vocalizationKindList.map((kind) => {
					const config = vocalizationTypes[kind];
					const Icon = config.icon;
					return (
						<span
							key={kind}
							title={`${config.meaning}. ${config.healthHint}`}
							className={cn(
								'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
								config.tone,
								breakdown.byKind[kind] === 0 && 'opacity-40',
							)}
						>
							<Icon className="size-3" />
							{config.label}:{' '}
							{formatNumber(breakdown.byKind[kind])}
						</span>
					);
				})}
			</div>
			<span className="flex items-center gap-1 text-xs text-n-500">
				<Moon className="size-3.5" />
				{formatNumber(breakdown.night)} som(ns) por noite (22h–6h)
			</span>
		</div>
	);
}

/** O que cada sensor de pote consegue ou não medir (fica visível para não iludir). */
const sensorLimits: Partial<Record<AreaAssessment['area'], string>> = {
	food: 'Se o sensor do pote só detecta presença (como o CR18-8DP), ele diz se há ração, não quanto: o consumo fica aproximado.',
	water: 'Se o sensor do pote só detecta presença, ele diz se há água, não quanto: o consumo fica aproximado.',
};

type HealthAreaCardProps = {
	assessment: AreaAssessment;
	stats: DailyCatStats[] | undefined;
};

export function HealthAreaCard({ assessment, stats }: HealthAreaCardProps) {
	const device = deviceTypes[areaDeviceType[assessment.area]];
	const Icon = device.icon;
	const meta = healthStatusMeta[assessment.status];
	const unitShort = assessment.unit.replace('/dia', '');
	const collecting = assessment.status === 'insufficient';
	const needsAction =
		assessment.status === 'attention' || assessment.status === 'alert';
	const tip = needsAction ? assessment.tips[0] : undefined;
	const limit = sensorLimits[assessment.area];
	// O sensor já mandou algo hoje? (o dia de hoje vem incompleto nos dados diários)
	const binarySensor =
		(assessment.area === 'water' || assessment.area === 'food') &&
		(stats?.some(
			(day) => day[assessment.area as 'water' | 'food'].binary,
		) ??
			false);
	const hasDataToday =
		stats?.some((day) => !day.complete && day[assessment.area].hasData) ??
		false;

	return (
		<div className="flex w-full min-w-0 flex-col gap-4 rounded-xl border border-n-30 bg-n-0 p-5 shadow-xs">
			<div className="flex items-center gap-2">
				<span
					className={cn(
						'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
						device.tone,
					)}
				>
					<Icon className="size-4" />
				</span>
				<span className="truncate text-base font-semibold text-n-700">
					{areaLabels[assessment.area]}
				</span>
				<span className="ml-auto">
					<HealthStatusBadge status={assessment.status} />
				</span>
			</div>

			{collecting ? (
				<div className="flex gap-3 rounded-lg bg-n-10 p-3 text-sm text-ink-secondary">
					<Hourglass className="mt-0.5 size-4 shrink-0 text-n-500" />
					<div className="space-y-1">
						<p>{assessment.reasons[0]}</p>
						<p className="text-xs text-ink-muted">
							{binarySensor
								? 'Para acompanhar o consumo, use um sensor que meça o nível (por exemplo, vários sensores em alturas diferentes).'
								: hasDataToday
									? 'O sensor já está mandando dados hoje: a primeira avaliação sai amanhã.'
									: 'A primeira avaliação sai depois de um dia inteiro com o sensor ligado.'}
						</p>
					</div>
				</div>
			) : null}

			{collecting ? null : (
				<div className="flex items-end justify-between gap-3">
					<div className="flex flex-col">
						<span className="text-caption text-n-500">
							Média dos últimos dias
						</span>
						<span className="text-3xl font-bold text-n-800">
							{assessment.value == null
								? '—'
								: formatNumber(assessment.value)}
							<span className="ml-1 text-sm font-medium text-n-500">
								{assessment.unit}
							</span>
						</span>
					</div>
					{assessment.score != null ? (
						<span
							className={cn('text-sm font-semibold', meta.text)}
						>
							{assessment.score}/100
						</span>
					) : null}
				</div>
			)}

			{assessment.target && assessment.value != null ? (
				<TargetRangeBar
					value={assessment.value}
					target={assessment.target}
					unit={assessment.unit}
				/>
			) : null}

			{collecting ? null : (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<TrendLabel trendPct={assessment.trendPct} />
					{assessment.today != null ? (
						<span className="text-xs text-n-500">
							Hoje até agora: {formatNumber(assessment.today)}{' '}
							{unitShort}
						</span>
					) : null}
				</div>
			)}

			{assessment.breakdown ? (
				<VocalBreakdown breakdown={assessment.breakdown} />
			) : null}

			<HealthTrendChart
				area={assessment.area}
				stats={stats}
				target={assessment.target}
				unit={assessment.unit}
			/>

			{tip ? (
				<div className="flex gap-3 rounded-lg bg-y-100 p-3 text-sm text-y-700">
					<Lightbulb className="mt-0.5 size-4 shrink-0" />
					<div>
						<p className="font-semibold">{tip.title}</p>
						<p className="text-xs opacity-90">{tip.description}</p>
					</div>
				</div>
			) : null}

			{limit ? (
				<p className="flex gap-2 text-xs text-ink-muted">
					<Info className="mt-0.5 size-3.5 shrink-0" />
					{limit}
				</p>
			) : null}

			{collecting ? null : (
				<ul className="flex flex-col gap-2 border-t border-n-30 pt-4">
					{assessment.reasons.map((reason) => (
						<li
							key={reason}
							className="flex gap-2 text-sm text-n-700"
						>
							<span
								className="mt-1.5 size-1.5 shrink-0 rounded-full"
								style={{ backgroundColor: meta.color }}
							/>
							{reason}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
