import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetDeviceReadings } from '@/features/devices/composables/useGetDeviceReadings';
import type { Device } from '@/features/devices/types/device';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const READINGS_LIMIT = 40;

const chartAxisLabel: Record<Device['type'], string> = {
	waterBowl: 'Nível (%)',
	foodBowl: 'Nível (%)',
	litterBox: 'Presença',
	microphone: 'Som (dB)',
};

/** Mesma cor do ícone do tipo (ver `deviceTypes[type].tone`). */
const chartColor: Record<Device['type'], string> = {
	waterBowl: 'var(--b-400)',
	foodBowl: 'var(--o-400)',
	litterBox: 'var(--y-600)',
	microphone: 'var(--g-400)',
};

export function ReadingsChart({ device }: { device: Device }) {
	const { data } = useGetDeviceReadings({
		deviceId: device._id,
		limit: READINGS_LIMIT,
	});

	const chartConfig = {
		value: {
			label: chartAxisLabel[device.type],
			color: chartColor[device.type],
		},
	} satisfies ChartConfig;

	if (!data) return <Skeleton className="aspect-auto h-44 w-full" />;

	return (
		<ChartContainer
			config={chartConfig}
			className="aspect-auto h-44 w-full"
		>
			<AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
				<defs>
					<linearGradient
						id={`fill-${device._id}`}
						x1="0"
						y1="0"
						x2="0"
						y2="1"
					>
						<stop
							offset="5%"
							stopColor="var(--color-value)"
							stopOpacity={0.3}
						/>
						<stop
							offset="95%"
							stopColor="var(--color-value)"
							stopOpacity={0.02}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="createdAt"
					tickFormatter={(value: string) =>
						format(new Date(value), 'HH:mm:ss')
					}
					tickLine={false}
					axisLine={false}
					minTickGap={40}
					fontSize={11}
				/>
				<YAxis
					tickLine={false}
					axisLine={false}
					fontSize={11}
					domain={device.type === 'litterBox' ? [0, 1] : [0, 'auto']}
				/>
				<Area
					dataKey="value"
					type={
						device.type === 'litterBox' ? 'stepAfter' : 'monotone'
					}
					stroke="var(--color-value)"
					fill={`url(#fill-${device._id})`}
					strokeWidth={2}
					isAnimationActive={false}
				/>
			</AreaChart>
		</ChartContainer>
	);
}
