import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { cn } from '@/lib/utils';
import { CircleCheck, PawPrint, TriangleAlert } from 'lucide-react';
import {
	LOW_LEVEL_THRESHOLD,
	bowlCapacityUnit,
	deviceTypes,
} from '../constants/deviceTypes';
import type { Device, Reading } from '../types/device';
import { LevelBar } from './levelBar';

/**
 * "Agora" de um pote ou da caixa de areia: um bloco grande com o estado atual,
 * no estilo do selo de status do Eyeson.
 */
export function DeviceNowCard({
	device,
	readings,
}: {
	device: Device;
	readings: Reading[];
}) {
	if (device.type === 'litterBox') {
		const last = readings.at(-1);
		const inside = last != null && last.value > 0;
		return (
			<NowBox
				tone={inside ? 'busy' : 'ok'}
				icon={inside ? PawPrint : CircleCheck}
				title={inside ? 'O gato está na caixa' : 'Caixa livre'}
				detail={
					inside
						? `Entrou ${formatRelativeTime(last.createdAt)}`
						: device.status.lastEventAt
							? `Última visita ${formatRelativeTime(device.status.lastEventAt)}`
							: 'Nenhuma visita registrada ainda'
				}
				aside={
					<Metric
						value={String(device.status.eventsToday)}
						caption={
							device.status.eventsToday === 1
								? 'visita hoje'
								: 'visitas hoje'
						}
					/>
				}
			/>
		);
	}

	// Potes de água e ração
	const level = device.status.level;
	const low = level != null && level < LOW_LEVEL_THRESHOLD;
	const unit = bowlCapacityUnit[device.type];
	const amount =
		level != null && device.capacity
			? `≈ ${Math.round((level / 100) * device.capacity)} ${unit} no pote`
			: null;

	return (
		<NowBox
			tone={low ? 'alert' : 'ok'}
			icon={low ? TriangleAlert : deviceTypes[device.type].icon}
			title={low ? 'Hora de reabastecer' : 'Pote com comida/água'}
			detail={[
				`Medido ${formatRelativeTime(device.status.lastReadingAt)}`,
				amount,
			]
				.filter(Boolean)
				.join(' · ')}
			aside={
				<Metric
					value={level != null ? `${level}%` : '—'}
					caption="do pote"
				/>
			}
			footer={level != null ? <LevelBar level={level} /> : null}
		/>
	);
}

const toneStyle = {
	ok: 'bg-g-100 text-g-700',
	busy: 'bg-y-100 text-y-700',
	alert: 'bg-r-100 text-r-700',
};

function NowBox({
	tone,
	icon: Icon,
	title,
	detail,
	aside,
	footer,
}: {
	tone: keyof typeof toneStyle;
	icon: React.ComponentType<{ className?: string }>;
	title: string;
	detail: string;
	aside: React.ReactNode;
	footer?: React.ReactNode;
}) {
	return (
		<section
			role="status"
			className={cn(
				'flex flex-col gap-4 rounded-2xl p-5',
				toneStyle[tone],
			)}
		>
			<div className="flex items-center gap-4">
				<Icon className="size-9 shrink-0" />
				<div className="min-w-0 flex-1">
					<p className="text-lg font-bold">{title}</p>
					<p className="text-sm opacity-80">{detail}</p>
				</div>
				{aside}
			</div>
			{footer}
		</section>
	);
}

function Metric({ value, caption }: { value: string; caption: string }) {
	return (
		<div className="shrink-0 text-right">
			<p className="text-4xl leading-none font-bold">{value}</p>
			<p className="mt-1 text-xs font-medium opacity-80">{caption}</p>
		</div>
	);
}
