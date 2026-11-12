import { Progress as ProgressPrimitive } from 'radix-ui';
import * as React from 'react';

import { toPercentage } from '@/features/core/utils/toPercentage';
import { cn } from '@/lib/utils';

interface ExtendedProgressProps extends React.ComponentProps<
	typeof ProgressPrimitive.Root
> {
	target: number;
	withLabel?: boolean;
	asPercentage?: boolean;
}

function Progress({
	className,
	value,
	target,
	withLabel = false,
	asPercentage = false,
	...props
}: ExtendedProgressProps) {
	const percentage = toPercentage(value || 0, target, 0);

	return (
		<div className="flex flex-col items-end gap-1 max-w-80 w-full">
			{withLabel && (
				<span className="text-xs">
					{asPercentage ? `${percentage}%` : `${value}/${target}`}
				</span>
			)}
			<ProgressPrimitive.Root
				data-slot="progress"
				className={cn(
					'relative h-2 w-full overflow-hidden rounded-full bg-n-30',
					className,
				)}
				{...props}
			>
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					className="h-full w-full flex-1 bg-g-400 transition-all"
					style={{ transform: `translateX(-${100 - percentage}%)` }}
				/>
			</ProgressPrimitive.Root>
		</div>
	);
}

export { Progress };
