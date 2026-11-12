import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from './data-table';
import type { ReactNode } from 'react';

const MAX_VISIBLE_PAGES = 5;

type DataTablePaginationProps = {
	meta: PaginationMeta;
	onPageChange: (page: number) => void;
};

function getVisiblePages(
	currentPage: number,
	totalPages: number,
	maxVisible = MAX_VISIBLE_PAGES,
) {
	if (totalPages <= maxVisible) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}

	let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
	let endPage = Math.min(totalPages, startPage + maxVisible - 1);
	startPage = Math.max(1, endPage - maxVisible + 1);

	return Array.from(
		{ length: endPage - startPage + 1 },
		(_, index) => startPage + index,
	);
}

function PaginationButton({
	children,
	active,
	onClick,
	disabled,
	className,
}: {
	children: ReactNode;
	active?: boolean;
	onClick?: () => void;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<Button
			type="button"
			variant="outline"
			size="icon"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				'font-semibold',
				active
					? 'border-g-400 bg-g-400 text-n-10 hover:bg-g-400'
					: 'text-n-500 hover:bg-n-20',
				className,
			)}
		>
			{children}
		</Button>
	);
}

export function DataTablePagination({
	meta,
	onPageChange,
}: DataTablePaginationProps) {
	const { page, totalPages } = meta;
	const visiblePages = getVisiblePages(page, totalPages);

	return (
		<div className="flex items-center gap-2">
			<div className="flex items-center gap-2 pr-1">
				<PaginationButton
					disabled={page <= 1}
					onClick={() => onPageChange(1)}
				>
					<ChevronsLeft className="size-4" />
				</PaginationButton>
				<PaginationButton
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
				>
					<ChevronLeft className="size-4" />
				</PaginationButton>
			</div>

			{visiblePages.map((pageNumber) => (
				<PaginationButton
					key={pageNumber}
					active={pageNumber === page}
					onClick={() => onPageChange(pageNumber)}
				>
					{pageNumber}
				</PaginationButton>
			))}

			<div className="flex items-center gap-2 pl-1">
				<PaginationButton
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
				>
					<ChevronRight className="size-4" />
				</PaginationButton>
				<PaginationButton
					disabled={page >= totalPages}
					onClick={() => onPageChange(totalPages)}
				>
					<ChevronsRight className="size-4" />
				</PaginationButton>
			</div>
		</div>
	);
}
