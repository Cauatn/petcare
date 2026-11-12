import { cn } from '@/lib/utils';

type LegendItem = {
	label: string;
	color: string;
};

type ChartLegendProps = {
	items: LegendItem[];
	className?: string;
};

export function ChartLegend({ items, className }: ChartLegendProps) {
	return (
		<div
			className={cn('flex flex-wrap items-center gap-2 py-1', className)}
		>
			{items.map((item) => (
				<div
					key={item.label}
					className="flex items-center gap-1 text-[11px] text-n-700"
				>
					<span
						className="size-2 shrink-0 rounded-full"
						style={{ backgroundColor: item.color }}
					/>
					{item.label}
				</div>
			))}
		</div>
	);
}
