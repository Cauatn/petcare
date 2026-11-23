import { cn } from '@/lib/utils';
import {
	CircleCheck,
	PawPrint,
	Sparkles,
	TriangleAlert,
	WifiOff,
	type LucideIcon,
} from 'lucide-react';
import type { HomeStatus, HomeStatusKind } from '../utils/homeStatus';

const STATUS_STYLE: Record<
	HomeStatusKind,
	{ box: string; icon: string; Icon: LucideIcon }
> = {
	ok: { box: 'bg-g-100 text-g-700', icon: 'text-g-600', Icon: CircleCheck },
	attention: {
		box: 'bg-y-100 text-y-700',
		icon: 'text-y-600',
		Icon: TriangleAlert,
	},
	offline: { box: 'bg-r-100 text-r-700', icon: 'text-r-500', Icon: WifiOff },
	empty: { box: 'bg-b-100 text-b-700', icon: 'text-b-600', Icon: Sparkles },
};

/**
 * Topo da tela inicial: quem é o gato e um selo grande dizendo se está tudo bem
 * (verde), se precisa de atenção (âmbar) ou se a placa sumiu (vermelho).
 */
export function HomeStatusHeader({
	petName,
	summary,
	status,
}: {
	petName: string | null;
	summary: string;
	status: HomeStatus;
}) {
	const { box, icon, Icon } = STATUS_STYLE[status.kind];

	return (
		<section className="flex flex-col gap-4 rounded-2xl border border-n-30 bg-n-0 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
			<div className="flex items-center gap-4">
				<span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-faint text-brand">
					<PawPrint className="size-7" />
				</span>
				<div className="min-w-0">
					<p className="truncate text-lg font-semibold text-ink-strong">
						{petName ?? 'Seu gato'}
					</p>
					<p className="text-sm text-ink-muted">{summary}</p>
				</div>
			</div>

			<div
				role="status"
				className={cn(
					'flex items-center gap-3 rounded-xl px-4 py-3 sm:max-w-sm',
					box,
				)}
			>
				<Icon className={cn('size-7 shrink-0', icon)} aria-hidden />
				<div className="min-w-0">
					<p className="text-base font-bold tracking-wide uppercase">
						{status.title}
					</p>
					<p className="text-xs opacity-80">{status.detail}</p>
				</div>
			</div>
		</section>
	);
}
