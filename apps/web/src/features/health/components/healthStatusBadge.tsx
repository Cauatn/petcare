import { Badge } from '@/components/ui/badge';
import {
	CircleCheck,
	CircleHelp,
	Siren,
	TriangleAlert,
	type LucideIcon,
} from 'lucide-react';
import type { HealthStatus } from '../types/health';

export const healthStatusMeta: Record<
	HealthStatus,
	{
		label: string;
		badge: 'green' | 'warning' | 'critical' | 'neutral';
		icon: LucideIcon;
		/** Cor de destaque (anel da nota, ícones). */
		color: string;
		text: string;
	}
> = {
	ok: {
		label: 'Saudável',
		badge: 'green',
		icon: CircleCheck,
		color: 'var(--g-400)',
		text: 'text-g-600',
	},
	attention: {
		label: 'Atenção',
		badge: 'warning',
		icon: TriangleAlert,
		color: 'var(--y-400)',
		text: 'text-y-700',
	},
	alert: {
		label: 'Procure o veterinário',
		badge: 'critical',
		icon: Siren,
		color: 'var(--r-500)',
		text: 'text-r-600',
	},
	insufficient: {
		label: 'Dados insuficientes',
		badge: 'neutral',
		icon: CircleHelp,
		color: 'var(--n-200)',
		text: 'text-n-500',
	},
};

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
	const meta = healthStatusMeta[status];
	const Icon = meta.icon;
	return (
		<Badge variant={meta.badge} className="gap-1">
			<Icon className="size-3" />
			{meta.label}
		</Badge>
	);
}
