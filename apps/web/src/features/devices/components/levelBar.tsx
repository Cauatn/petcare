import { cn } from '@/lib/utils';
import { LOW_LEVEL_THRESHOLD } from '../constants/deviceTypes';

/** Acima disso o pote está tranquilo; entre o limite baixo e aqui, atenção. */
const COMFORT_LEVEL = 50;

export function levelTone(level: number) {
	if (level < LOW_LEVEL_THRESHOLD) return 'bg-r-500';
	if (level < COMFORT_LEVEL) return 'bg-y-400';
	return 'bg-g-400';
}

export function LevelBar({
	level,
	className,
}: {
	level: number | null;
	className?: string;
}) {
	const value = Math.min(100, Math.max(0, level ?? 0));

	return (
		<div
			role="meter"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={level ?? undefined}
			className={cn(
				'relative h-2 w-full overflow-hidden rounded-full bg-n-30',
				className,
			)}
		>
			{level != null ? (
				<div
					className={cn(
						'h-full rounded-full transition-[width] duration-500',
						levelTone(value),
					)}
					style={{ width: `${value}%` }}
				/>
			) : null}
		</div>
	);
}
