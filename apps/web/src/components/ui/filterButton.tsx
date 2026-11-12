import type { ComponentProps } from 'react';

import { Button } from './button';

interface FilterButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
	activeFilters: unknown[];
}

function FilterButton({ activeFilters, ...props }: FilterButtonProps) {
	const activeFiltersCount = activeFilters.filter(Boolean).length;

	return (
		<Button variant="brand" {...props}>
			Filtros
			{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
		</Button>
	);
}

export default FilterButton;
