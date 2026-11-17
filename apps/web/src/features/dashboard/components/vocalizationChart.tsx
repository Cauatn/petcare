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
import {
	CartesianGrid,
	ComposedChart,
	ReferenceArea,
	Scatter,
	XAxis,
	YAxis,
} from 'recharts';

const READINGS_LIMIT = 40;
/** Duração assumida para sons antigos sem `durationMs`. */
const FALLBACK_DURATION_MS = 800;
/** Largura mínima do destaque (fração da janela) para sons curtos ficarem visíveis. */
const MIN_HIGHLIGHT_FRACTION = 0.012;
const RECENT_EVENTS = 5;

type VocalEvent = {
	id: string;
	kind: VocalizationKind;
	start: number;
	end: number;
	mid: number;
	durationMs: number;
	value: number;
};

const chartConfig = Object.fromEntries(
	vocalizationKindList.map((kind) => [
		kind,
		{
			label: vocalizationTypes[kind].label,
			color: vocalizationTypes[kind].color,
		},
	]),
) satisfies ChartConfig;

/** Ícone do tipo desenhado no topo do destaque (dentro do SVG do gráfico). */
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
	payload?: { payload: VocalEvent }[];
}) {
	const event = payload?.[0]?.payload;
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
 * Sons do gato no tempo: cada som é um destaque na sua duração, colorido pelo
 * tipo, com o ícone do significado no topo.
 */
export function VocalizationChart({ device }: { device: Device }) {
	const { data } = useGetDeviceReadings({
		deviceId: device._id,
		limit: READINGS_LIMIT,
	});

	if (!data) return <Skeleton className="aspect-auto h-44 w-full" />;

	const events: VocalEvent[] = data
		.filter((reading) => reading.value > 0)
		.map((reading) => {
			const durationMs = reading.durationMs ?? FALLBACK_DURATION_MS;
			const end = new Date(reading.createdAt).getTime();
			const start = end - durationMs;
			return {
				id: reading._id,
				kind: reading.kind ?? 'greeting',
				start,
				end,
				mid: (start + end) / 2,
				durationMs,
				value: reading.value,
			};
		});

	if (!events.length) {
		return (
			<div className="flex h-44 w-full flex-col items-center justify-center gap-2 text-sm text-n-500">
				<MicOff className="size-5" />
				Nenhum som detectado ainda.
			</div>
		);
	}

	const first = events[0].start;
	const last = events[events.length - 1].end;
	const span = Math.max(last - first, 60_000);
	const domain: [number, number] = [first - span * 0.04, last + span * 0.04];
	const minWidth = (domain[1] - domain[0]) * MIN_HIGHLIGHT_FRACTION;
	const yMax = Math.max(70, ...events.map((event) => event.value + 10));
	const presentKinds = vocalizationKindList.filter((kind) =>
		events.some((event) => event.kind === kind),
	);
	const recent = events.slice(-RECENT_EVENTS).reverse();

	return (
		<div className="flex w-full flex-col gap-3">
			<ChartContainer
				config={chartConfig}
				className="aspect-auto h-48 w-full"
			>
				<ComposedChart
					data={events}
					margin={{ left: -20, right: 8, top: 30 }}
				>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey="mid"
						type="number"
						scale="time"
						domain={domain}
						tickFormatter={(value: number) =>
							format(value, 'HH:mm')
						}
						tickLine={false}
						axisLine={false}
						minTickGap={40}
						fontSize={11}
					/>
					<YAxis
						dataKey="value"
						tickLine={false}
						axisLine={false}
						fontSize={11}
						domain={[0, yMax]}
						allowDecimals={false}
					/>
					{events.map((event) => {
						const color = vocalizationTypes[event.kind].color;
						const pad = Math.max(
							0,
							(minWidth - (event.end - event.start)) / 2,
						);
						return (
							<ReferenceArea
								key={event.id}
								x1={event.start - pad}
								x2={event.end + pad}
								y1={0}
								y2={event.value}
								fill={color}
								fillOpacity={0.28}
								stroke={color}
								strokeOpacity={0.9}
								ifOverflow="visible"
								label={<KindIconLabel kind={event.kind} />}
							/>
						);
					})}
					<Scatter
						dataKey="value"
						isAnimationActive={false}
						shape={(props: {
							cx?: number;
							cy?: number;
							payload?: VocalEvent;
						}) =>
							props.payload ? (
								<circle
									cx={props.cx}
									cy={props.cy}
									r={3}
									fill={
										vocalizationTypes[props.payload.kind]
											.color
									}
								/>
							) : (
								<g />
							)
						}
					/>
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
