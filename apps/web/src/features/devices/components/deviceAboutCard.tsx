import { Badge } from '@/components/ui/badge';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { formatDate } from '@/features/core/utils/formatDate';
import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import type { PairedBoard } from '@/features/pairing/types/pairing';
import { deviceTypes } from '../constants/deviceTypes';
import type { Device } from '../types/device';

/** Ficha técnica do sensor e da placa a que ele pertence. */
export function DeviceAboutCard({
	device,
	board,
}: {
	device: Device;
	board: PairedBoard | undefined;
}) {
	const config = deviceTypes[device.type];
	const rows: { label: string; value: React.ReactNode }[] = [
		{ label: 'Tipo', value: config.label },
		{ label: 'Sensor', value: config.sensor },
		{
			label: 'Chave do sensor',
			value: (
				<code className="rounded bg-n-20 px-1.5 py-0.5 text-xs">
					{device.sensorKey}
				</code>
			),
		},
		{
			label: 'Placa',
			value: board ? (
				<span className="flex items-center gap-2">
					{board.devicePrefix}
					<Badge variant={board.online ? 'green' : 'neutral'}>
						{board.online ? 'Online' : 'Sem sinal'}
					</Badge>
				</span>
			) : (
				'Não pareada'
			),
		},
		{
			label: 'Rede da placa',
			value: board ? `${board.ssid} · ${board.ip}` : '—',
		},
		{
			label: 'Placa vista por último',
			value: board ? formatRelativeTime(board.lastSeenAt) : '—',
		},
		{
			label: 'Última leitura',
			value: formatRelativeTime(device.status.lastReadingAt),
		},
		{
			label: 'Adicionado em',
			value: formatDate(new Date(device.createdAt)),
		},
	];

	return (
		<DashboardCard
			title="Sobre o dispositivo"
			contentClassName="items-stretch"
		>
			<dl className="grid w-full gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
				{rows.map((row) => (
					<div key={row.label} className="min-w-0">
						<dt className="text-xs text-ink-muted">{row.label}</dt>
						<dd className="truncate text-sm font-medium text-ink-strong">
							{row.value}
						</dd>
					</div>
				))}
			</dl>
		</DashboardCard>
	);
}
