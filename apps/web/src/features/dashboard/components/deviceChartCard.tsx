import { buttonVariants } from '@/components/ui/button';
import { DashboardCard } from '@/components/ui/dashboard-card';
import {
	DeviceStatusBadge,
	deviceMetricLabel,
} from '@/features/devices/components/deviceMetric';
import { deviceTypes } from '@/features/devices/constants/deviceTypes';
import type { Device } from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { AudioWaveform } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReadingsChart } from './readingsChart';
import { VocalizationChart } from './vocalizationChart';

export function DeviceChartCard({
	device,
	isHighlighted,
}: {
	device: Device;
	isHighlighted: boolean;
}) {
	const config = deviceTypes[device.type];
	const Icon = config.icon;

	return (
		<DashboardCard
			id={`device-${device._id}`}
			className={cn(
				'scroll-mt-6 transition-shadow',
				isHighlighted && 'ring-4 ring-accent-mint/40',
			)}
			title={
				<span className="flex items-center gap-2">
					<span
						className={cn(
							'flex size-8 shrink-0 items-center justify-center rounded-xl border',
							config.tone,
						)}
					>
						<Icon className="size-4" />
					</span>
					<span className="truncate">{device.name}</span>
					<span className="ml-auto flex items-center gap-2">
						{device.type === 'microphone' ? (
							<Link
								to={`/monitor/${device._id}`}
								title="Ver o sinal do microfone ao vivo"
								aria-label="Ver o sinal do microfone ao vivo"
								className={buttonVariants({
									variant: 'outline',
									size: 'icon-sm',
								})}
							>
								<AudioWaveform className="size-4" />
							</Link>
						) : null}
						<DeviceStatusBadge device={device} />
					</span>
				</span>
			}
			subtitle={deviceMetricLabel(device)}
			contentClassName="items-start pb-0"
		>
			<div className="w-full min-w-0">
				{device.type === 'microphone' ? (
					<VocalizationChart device={device} />
				) : (
					<ReadingsChart device={device} />
				)}
			</div>
		</DashboardCard>
	);
}
