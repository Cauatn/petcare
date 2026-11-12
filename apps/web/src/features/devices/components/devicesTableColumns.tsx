import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { deviceTypes } from '../constants/deviceTypes';
import type { Device } from '../types/device';
import { DeviceStatusBadge, deviceMetricLabel } from './deviceMetric';

export const devicesTableColumns: ColumnDef<Device>[] = [
	{
		header: 'Dispositivo',
		accessorKey: 'name',
		cell: ({ row }) => {
			const config = deviceTypes[row.original.type];
			const Icon = config.icon;

			return (
				<div className="flex items-center gap-3">
					<span
						className={cn(
							'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
							config.tone,
						)}
					>
						<Icon className="size-4" />
					</span>
					<div className="min-w-0">
						<p className="truncate font-semibold text-n-700">
							{row.original.name}
						</p>
						<p className="truncate text-xs text-n-500">
							{config.label}
						</p>
					</div>
				</div>
			);
		},
	},
	{
		header: 'Sensor',
		accessorKey: 'sensorKey',
		cell: ({ row }) => (
			<code className="text-xs text-n-600">{row.original.sensorKey}</code>
		),
	},
	{
		header: 'Leitura atual',
		id: 'metric',
		cell: ({ row }) => deviceMetricLabel(row.original),
	},
	{
		header: 'Última leitura',
		id: 'lastReadingAt',
		cell: ({ row }) =>
			formatRelativeTime(row.original.status.lastReadingAt),
	},
	{
		header: 'Status',
		id: 'status',
		cell: ({ row }) => <DeviceStatusBadge device={row.original} />,
	},
];
