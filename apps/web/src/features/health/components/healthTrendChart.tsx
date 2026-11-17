import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
	vocalizationKindList,
	vocalizationTypes,
} from '@/features/devices/constants/vocalizationTypes';
import { format, parseISO } from 'date-fns';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ReferenceArea,
	XAxis,
	YAxis,
} from 'recharts';
import { areaChartColor } from '../constants/healthAreas';
import type { DailyCatStats, HealthArea } from '../types/health';

function dailyValue(area: HealthArea, day: DailyCatStats, unit: string) {
	if (area === 'water') {
		if (!day.water.hasData) return null;
		return unit.startsWith('ml') ? day.water.ml : day.water.pct;
	}
	if (area === 'food') {
		if (!day.food.hasData) return null;
		return unit.startsWith('g') ? day.food.g : day.food.pct;
	}
	if (area === 'vocal') return day.vocal.hasData ? day.vocal.total : null;
	return day.litter.hasData ? day.litter.visits : null;
}

const vocalChartConfig = Object.fromEntries(
	vocalizationKindList.map((kind) => [
		kind,
		{
			label: vocalizationTypes[kind].label,
			color: vocalizationTypes[kind].color,
		},
	]),
) satisfies ChartConfig;

type HealthTrendChartProps = {
	area: HealthArea;
	stats: DailyCatStats[] | undefined;
	target: { min: number; max: number } | null;
	unit: string;
};

export function HealthTrendChart({
	area,
	stats,
	target,
	unit,
}: HealthTrendChartProps) {
	if (!stats) return <Skeleton className="h-36 w-full" />;

	const isVocal = area === 'vocal';
	const chartConfig: ChartConfig = isVocal
		? vocalChartConfig
		: { value: { label: unit, color: areaChartColor[area] } };

	const data = stats.map((day) => ({
		date: day.date,
		label: format(parseISO(day.date), 'dd/MM'),
		value: dailyValue(area, day, unit),
		complete: day.complete,
		// Vocalização: uma série por tipo, empilhadas
		...(isVocal && day.vocal.hasData ? day.vocal.byKind : {}),
	}));

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-36 w-full"
		>
			<BarChart data={data} margin={{ left: -20, right: 4, top: 8 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					minTickGap={16}
					fontSize={11}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					fontSize={11}
					allowDecimals={false}
				/>
				{target ? (
					<ReferenceArea
						y1={target.min}
						y2={target.max}
						fill="var(--g-200)"
						fillOpacity={0.45}
						strokeOpacity={0}
						ifOverflow="extendDomain"
					/>
				) : null}
				<ChartTooltip
					cursor={false}
					content={
						<ChartTooltipContent
							labelFormatter={(_, payload) => {
								const item = payload?.[0]?.payload as
									(typeof data)[number] | undefined;
								if (!item) return '';
								const date = format(
									parseISO(item.date),
									'dd/MM/yyyy',
								);
								return item.complete
									? date
									: `${date} (até agora)`;
							}}
						/>
					}
				/>
				{isVocal ? (
					vocalizationKindList.map((kind, index) => (
						<Bar
							key={kind}
							dataKey={kind}
							stackId="vocal"
							fill={`var(--color-${kind})`}
							radius={
								index === vocalizationKindList.length - 1
									? [4, 4, 0, 0]
									: 0
							}
							isAnimationActive={false}
						>
							{data.map((item) => (
								<Cell
									key={item.date}
									fillOpacity={item.complete ? 0.9 : 0.35}
								/>
							))}
						</Bar>
					))
				) : (
					<Bar
						dataKey="value"
						radius={[4, 4, 0, 0]}
						isAnimationActive={false}
					>
						{data.map((item) => (
							<Cell
								key={item.date}
								fill="var(--color-value)"
								fillOpacity={item.complete ? 0.9 : 0.35}
							/>
						))}
					</Bar>
				)}
			</BarChart>
		</ChartContainer>
	);
}
