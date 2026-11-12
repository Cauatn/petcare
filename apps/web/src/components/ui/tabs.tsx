import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type TabItem<T extends string> = {
	value: T;
	label: string;
	content: ReactNode;
};

type TabsProps<T extends string> = {
	items: TabItem<T>[];
	value: T;
	onValueChange: (value: T) => void;
	className?: string;
};

//filtragem (ex.: por capability) é responsabilidade de quem chama; se a aba ativa não estiver na lista, cai na primeira
export function Tabs<T extends string>({
	items,
	value,
	onValueChange,
	className,
}: TabsProps<T>) {
	const activeItem = items.find((item) => item.value === value) ?? items[0];

	if (!activeItem) {
		return null;
	}

	return (
		<div className={cn('space-y-8', className)}>
			<div role="tablist" className="flex gap-1">
				{items.map((item) => (
					<button
						key={item.value}
						type="button"
						role="tab"
						aria-selected={item.value === activeItem.value}
						onClick={() => onValueChange(item.value)}
						className={cn(
							'cursor-pointer border-b-2 px-3 py-1.5 text-base transition-colors',
							item.value === activeItem.value
								? 'border-g-500 font-semibold text-g-500'
								: 'border-transparent text-n-500 hover:text-n-700',
						)}
					>
						{item.label}
					</button>
				))}
			</div>
			<div role="tabpanel">{activeItem.content}</div>
		</div>
	);
}
