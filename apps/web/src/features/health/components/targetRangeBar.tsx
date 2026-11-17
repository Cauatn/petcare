import { cn } from '@/lib/utils';

type TargetRangeBarProps = {
	value: number;
	target: { min: number; max: number };
	unit: string;
	className?: string;
};

/**
 * Barra com a faixa-alvo destacada e um marcador no valor atual.
 * A escala vai de 0 a 1,6× o máximo da faixa (ou ao valor, se maior).
 */
export function TargetRangeBar({
	value,
	target,
	unit,
	className,
}: TargetRangeBarProps) {
	const scaleMax = Math.max(target.max * 1.6, value * 1.1, 1);
	const toPct = (n: number) =>
		Math.min(100, Math.max(0, (n / scaleMax) * 100));
	const inRange = value >= target.min && value <= target.max;

	return (
		<div className={cn('flex w-full flex-col gap-1.5', className)}>
			<div className="relative h-2.5 w-full rounded-full bg-n-30">
				<div
					className="absolute inset-y-0 rounded-full bg-g-200"
					style={{
						left: `${toPct(target.min)}%`,
						width: `${toPct(target.max) - toPct(target.min)}%`,
					}}
				/>
				<div
					className={cn(
						'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-n-0 shadow-sm',
						inRange ? 'bg-g-500' : 'bg-y-600',
					)}
					style={{ left: `${toPct(value)}%` }}
					aria-hidden
				/>
			</div>
			<span className="text-xs text-n-500">
				Meta: {target.min}–{target.max} {unit}
			</span>
		</div>
	);
}
