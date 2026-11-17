import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
	formatDuration,
	vocalizationKindList,
	vocalizationTypes,
} from '@/features/devices/constants/vocalizationTypes';
import { useGetDeviceReadings } from '@/features/devices/composables/useGetDeviceReadings';
import type { Device, VocalizationKind } from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MicOff } from 'lucide-react';
import { Area, ComposedChart, ReferenceArea, XAxis, YAxis } from 'recharts';
import {
	type WavePoint,
	buildWaveform,
	toVocalEvent,
} from '../utils/vocalWaveform';

const READINGS_LIMIT = 40;
/** Sons desenhados na onda (mais que isso fica fino demais no celular). */
const WAVE_EVENTS = 10;
const RECENT_EVENTS = 5;
const IDLE_COLOR = 'var(--n-200)';

const chartConfig = Object.fromEntries(
	vocalizationKindList.map((kind) => [
		kind,
		{
			label: vocalizationTypes[kind].label,
			color: vocalizationTypes[kind].color,
		},
	]),
) satisfies ChartConfig;

/** Ícone do tipo desenhado no topo do trecho detectado (dentro do SVG). */
function KindIconLabel({
	viewBox,
	kind,
}: {
	viewBox?: { x?: number; y?: number; width?: number };
	kind: VocalizationKind;
}) {
	if (!viewBox) return null;
	const { x = 0, y = 0, width = 0 } = viewBox;
	const config = vocalizationTypes[kind];
	const Icon = config.icon;
	const cx = x + width / 2;
	const cy = y - 13;

	return (
		<g>
			<circle
				cx={cx}
				cy={cy}
				r={11}
				fill="var(--n-0)"
				stroke={config.color}
				strokeWidth={1.5}
			/>
			<Icon
				x={cx - 7}
				y={cy - 7}
				width={14}
				height={14}
				color={config.color}
			/>
		</g>
	);
}

function VocalTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: { payload: WavePoint }[];
}) {
	const event = payload?.[0]?.payload.event;
	if (!active || !event) return null;
	const config = vocalizationTypes[event.kind];
	const Icon = config.icon;

	return (
		<div className="flex max-w-60 flex-col gap-1 rounded-lg border border-n-30 bg-n-0 px-3 py-2 text-xs shadow-lg">
			<span className="flex items-center gap-1.5 font-semibold text-n-800">
				<Icon className="size-3.5" style={{ color: config.color }} />
				{config.label}
			</span>
			<span className="text-n-600">{config.meaning}</span>
			<span className="text-n-500">
				{format(event.end, 'HH:mm:ss')} ·{' '}
				{formatDuration(event.durationMs)} · volume{' '}
				{Math.round(event.value)}
			</span>
		</div>
	);
}

function KindChip({ kind }: { kind: VocalizationKind }) {
	const config = vocalizationTypes[kind];
	return (
		<span className="flex items-center gap-1.5 text-xs text-n-600">
			<span
				className="size-2.5 rounded-sm"
				style={{ backgroundColor: config.color }}
			/>
			{config.label}
		</span>
	);
}

/**
 * Onda do microfone: silêncio em cinza e cada som detectado colorido pelo
 * tipo, com o ícone do significado em cima.
 */
export function VocalizationChart({ device }: { device: Device }) {
	const { data } = useGetDeviceReadings({
		deviceId: device._id,
		limit: READINGS_LIMIT,
	});

	if (!data) return <Skeleton className="aspect-auto h-44 w-full" />;

	const events = data
		.filter((reading) => reading.value > 0)
		.map(toVocalEvent);

	if (!events.length) {
		return (
			<div className="flex h-44 w-full flex-col items-center justify-center gap-2 text-sm text-n-500">
				<MicOff className="size-5" />
				Nenhum som detectado ainda.
			</div>
		);
	}

	const waveEvents = events.slice(-WAVE_EVENTS);
	const { points, segments, yMax } = buildWaveform(waveEvents);
	const tickLabels = new Map(
		segments.map((segment) => [
			segment.mid,
			format(segment.event.end, 'HH:mm'),
		]),
	);
	const presentKinds = vocalizationKindList.filter((kind) =>
		waveEvents.some((event) => event.kind === kind),
	);
	const recent = events.slice(-RECENT_EVENTS).reverse();

	return (
		<div className="flex w-full flex-col gap-3">
			<ChartContainer
				config={chartConfig}
				className="aspect-auto h-48 w-full"
			>
				<ComposedChart
					data={points}
					margin={{ left: 8, right: 8, top: 30 }}
				>
					<XAxis
						dataKey="i"
						ticks={segments.map((segment) => segment.mid)}
						tickFormatter={(value: number) =>
							tickLabels.get(value) ?? ''
						}
						tickLine={false}
						axisLine={false}
						minTickGap={16}
						fontSize={11}
					/>
					<YAxis hide domain={[-yMax, yMax]} />
					{segments.map((segment) => (
						<ReferenceArea
							key={segment.event.id}
							x1={segment.x1}
							x2={segment.x2}
							y1={-yMax}
							y2={yMax}
							fill={vocalizationTypes[segment.event.kind].color}
							fillOpacity={0.08}
							ifOverflow="visible"
							label={<KindIconLabel kind={segment.event.kind} />}
						/>
					))}
					<Area
						dataKey="idle"
						type="monotone"
						stroke={IDLE_COLOR}
						fill={IDLE_COLOR}
						fillOpacity={0.6}
						strokeWidth={1}
						activeDot={false}
						isAnimationActive={false}
					/>
					{presentKinds.map((kind) => (
						<Area
							key={kind}
							dataKey={kind}
							type="monotone"
							stroke={vocalizationTypes[kind].color}
							fill={vocalizationTypes[kind].color}
							fillOpacity={0.35}
							strokeWidth={1.5}
							activeDot={false}
							isAnimationActive={false}
						/>
					))}
					<ChartTooltip cursor={false} content={<VocalTooltip />} />
				</ComposedChart>
			</ChartContainer>

			<div className="flex flex-wrap gap-x-4 gap-y-1">
				{presentKinds.map((kind) => (
					<KindChip key={kind} kind={kind} />
				))}
			</div>

			<ul className="flex flex-col divide-y divide-n-30 border-t border-n-30">
				{recent.map((event) => {
					const config = vocalizationTypes[event.kind];
					const Icon = config.icon;
					return (
						<li
							key={event.id}
							className="flex items-center gap-3 py-2"
						>
							<span
								className={cn(
									'flex size-7 shrink-0 items-center justify-center rounded-full border',
									config.tone,
								)}
							>
								<Icon className="size-3.5" />
							</span>
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="text-sm font-medium text-n-700">
									{config.label}
								</span>
								<span className="truncate text-xs text-n-500">
									{config.meaning}
								</span>
							</div>
							<div className="flex shrink-0 flex-col items-end text-xs text-n-500">
								<span>{format(event.end, 'HH:mm:ss')}</span>
								<span>{formatDuration(event.durationMs)}</span>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
