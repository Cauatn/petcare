import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { deviceTypes } from '../constants/deviceTypes';
import type { Device } from '../types/device';
import {
	DeviceStatusBadge,
	deviceMetricLabel,
	deviceSubtitle,
} from './deviceMetric';
import { LevelBar } from './levelBar';

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
							'flex size-9 shrink-0 items-center justify-center rounded-xl border',
							config.tone,
						)}
					>
						<Icon className="size-4" />
					</span>
					<div className="min-w-0">
						<Link
							to={`/devices/${row.original._id}`}
							className="block truncate font-semibold text-n-700 hover:underline"
						>
							{row.original.name}
						</Link>
						<p className="truncate text-xs text-n-500">
							{deviceSubtitle(row.original)}
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
		cell: ({ row }) => {
			const level = row.original.status.level;
			if (level == null) return deviceMetricLabel(row.original);

			return (
				<div className="flex items-center gap-3">
					<LevelBar level={level} className="w-24" />
					<span className="font-semibold tabular-nums text-n-700">
						{level}%
					</span>
				</div>
			);
		},
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
