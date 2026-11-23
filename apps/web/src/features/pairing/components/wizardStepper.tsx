import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = ['Ligar', 'Conectar', 'Wi-Fi', 'Pronto'];

/** Indicador de progresso do assistente: `current` é o índice (0–3) do passo atual. */
export function WizardStepper({ current }: { current: number }) {
	return (
		<ol className="flex items-center gap-2">
			{STEPS.map((label, index) => {
				const done = index < current;
				const active = index === current;
				return (
					<li key={label} className="flex flex-1 items-center gap-2">
						<span
							className={cn(
								'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
								done && 'bg-g-100 text-g-700',
								active && 'bg-brand text-white',
								!done && !active && 'bg-n-30 text-n-800',
							)}
						>
							{done ? <Check className="size-4" /> : index + 1}
						</span>
						<span
							className={cn(
								'hidden text-sm sm:inline',
								active
									? 'font-semibold text-ink-strong'
									: 'text-ink-muted',
							)}
						>
							{label}
						</span>
						{index < STEPS.length - 1 ? (
							<span className="h-px flex-1 bg-rule" />
						) : null}
					</li>
				);
			})}
		</ol>
	);
}
