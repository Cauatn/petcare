import {
	type ColumnDef,
	type RowData,
	type TableMeta,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { LayoutList, Search, Table as TableIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { PaginationMeta } from '@/types/pagination';
import { toast } from 'react-toastify';
import { AppPageEmptyState } from '../Layout/AppPageEmptyState';
import { DataTablePagination } from './data-table-pagination';

declare module '@tanstack/react-table' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura exigida pelo merge de interface do tanstack
	interface ColumnMeta<TData extends RowData, TValue> {
		className?: string;
		headerClassName?: string;
	}
}

type DataTableView = 'table' | 'list';

export const DEFAULT_PAGE_SIZE = 25;

export type { PaginationMeta };

export type IDataProps<T> = {
	data: T[];
	meta?: PaginationMeta;
};

function isPaginatedData<T>(
	data: IDataProps<T> | T[] | undefined,
): data is IDataProps<T> {
	return data != null && !Array.isArray(data);
}

interface DataTableProviderProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: IDataProps<TData> | TData[] | undefined;
	isLoading?: boolean;
	withSearch?: boolean;
	action?: (params: {
		search: string;
		page: number;
		limit: number;
	}) => Promise<unknown>;
	emptyStateTitle?: string;
	emptyStateDescription?: string;
	meta?: TableMeta<TData>;
	onFetch?: (params: { page: number; limit: number }) => void;
	renderListItem?: (row: TData) => ReactNode;
}

interface DataTableProps<TData, TValue> extends DataTableProviderProps<
	TData,
	TValue
> {
	error?: Error | null;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	isLoading,
	error,
	withSearch,
	action,
	emptyStateTitle = 'Ops, não foi possível encontrar nada.',
	emptyStateDescription = 'Verifique os filtros para encontrar resultados.',
	meta,
	onFetch,
	renderListItem,
}: DataTableProps<TData, TValue>) {
	const [searchValue, setSearchValue] = useState('');
	const [view, setView] = useState<DataTableView>(() =>
		renderListItem && window.innerWidth < 768 ? 'list' : 'table',
	);

	const { rows, paginationMeta } = useMemo(() => {
		if (isPaginatedData(data)) {
			return { rows: data.data, paginationMeta: data.meta };
		}
		return { rows: data ?? [], paginationMeta: undefined };
	}, [data]);

	const limit = paginationMeta?.limit ?? DEFAULT_PAGE_SIZE;

	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
		meta,
	});

	if (error) {
		toast.error(
			'Houve um erro ao buscar os dados. Caso o erro persista, entre em contato com o suporte.',
		);
	}

	if (!data || isLoading || error) {
		return <DataTableSkeleton columns={columns} view={view} />;
	}

	const showPagination = !!paginationMeta?.total && onFetch != null;

	const handlePageChange = (page: number) => {
		onFetch?.({ page, limit });
	};

	const handleSearch = (search: string) => {
		onFetch?.({ page: 1, limit });
		action?.({ search, page: 1, limit });
	};

	return (
		<div className="flex min-w-0 w-full flex-1 flex-col justify-between gap-8">
			<div className="min-w-0 space-y-3">
				{(withSearch && action) || renderListItem ? (
					<div className="flex items-center gap-2">
						{withSearch && action && (
							<div className="relative flex-1">
								<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-n-400" />
								<Input
									type="search"
									placeholder="Buscar..."
									value={searchValue}
									className="pl-9"
									onChange={({ target }) =>
										setSearchValue(target.value)
									}
									onKeyDown={({ code }) =>
										code === 'Enter' &&
										handleSearch(searchValue.trim())
									}
								/>
							</div>
						)}
						{withSearch && action && (
							<Button
								onClick={() => handleSearch(searchValue.trim())}
							>
								Buscar
							</Button>
						)}
						{renderListItem && (
							<div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-n-30 p-1">
								<button
									type="button"
									aria-label="Visualizar em tabela"
									aria-pressed={view === 'table'}
									onClick={() => setView('table')}
									className={cn(
										'flex size-9 items-center justify-center rounded-md text-n-500 transition-colors cursor-pointer',
										view === 'table' &&
											'bg-n-20 text-n-800',
									)}
								>
									<TableIcon className="size-4" />
								</button>
								<button
									type="button"
									aria-label="Visualizar em lista"
									aria-pressed={view === 'list'}
									onClick={() => setView('list')}
									className={cn(
										'flex size-9 items-center justify-center rounded-md text-n-500 transition-colors cursor-pointer',
										view === 'list' && 'bg-n-20 text-n-800',
									)}
								>
									<LayoutList className="size-4" />
								</button>
							</div>
						)}
					</div>
				) : null}

				{!table.getRowModel().rows?.length ? (
					<AppPageEmptyState
						title={emptyStateTitle}
						description={emptyStateDescription}
					/>
				) : view === 'list' && renderListItem ? (
					<div className="space-y-3">
						{table.getRowModel().rows.map((row) => (
							<div key={row.id}>
								{renderListItem(row.original)}
							</div>
						))}
					</div>
				) : (
					<div className="max-h-[calc(100dvh-16rem)] w-full min-w-0 overflow-auto rounded-xl border border-n-30 bg-n-0 shadow-xs [&>[data-slot=table-container]]:overflow-visible">
						<Table className="min-w-max">
							<TableHeader className="sticky top-0 z-10 bg-n-20">
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow
										key={headerGroup.id}
										className="hover:bg-transparent"
									>
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												className={cn(
													header.id === 'actions'
														? 'whitespace-nowrap px-4 py-3 font-semibold text-n-700'
														: 'px-4 py-3 font-semibold text-n-700',
													header.column.columnDef.meta
														?.headerClassName,
												)}
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column
																.columnDef
																.header,
															header.getContext(),
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>

							<TableBody>
								{table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										className="hover:bg-n-20"
										data-state={
											row.getIsSelected()
												? 'selected'
												: undefined
										}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className={cn(
													cell.column.id === 'actions'
														? 'whitespace-nowrap px-2 py-3 text-right'
														: 'px-4 py-3',
													cell.column.columnDef.meta
														?.className,
												)}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			{showPagination && (
				<div className="flex justify-center">
					<DataTablePagination
						meta={paginationMeta}
						onPageChange={handlePageChange}
					/>
				</div>
			)}
		</div>
	);
}

function DataTableSkeleton<TData, TValue>({
	columns,
	view = 'table',
}: Pick<DataTableProps<TData, TValue>, 'columns'> & { view?: DataTableView }) {
	const table = useReactTable({
		data: [],
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	if (view === 'list') {
		return (
			<div className="space-y-3">
				{Array.from({ length: 4 }).map((_, index) => (
					<div
						key={index}
						className="space-y-3 rounded-xl border border-n-30 bg-n-0 p-4"
					>
						<Skeleton className="h-4 w-1/3" />
						<Skeleton className="h-3 w-2/3" />
						<Skeleton className="h-3 w-1/2" />
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="max-h-[calc(100dvh-16rem)] w-full min-w-0 overflow-auto rounded-xl border border-n-30 bg-n-0 shadow-xs [&>[data-slot=table-container]]:overflow-visible">
			<Table className="min-w-max">
				<TableHeader className="sticky top-0 z-10 bg-n-20">
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							className="hover:bg-transparent"
						>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									className={
										header.id === 'actions'
											? 'whitespace-nowrap px-4 py-3 font-semibold text-n-400'
											: 'px-4 py-3 font-semibold text-n-400'
									}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>

				<TableBody>
					{Array.from({ length: 5 }).map((_, rowIndex) => (
						<TableRow key={rowIndex}>
							{columns.map((_, colIndex) => (
								<TableCell
									key={colIndex}
									className={
										colIndex === columns.length - 1
											? 'w-px whitespace-nowrap px-2 py-3'
											: 'px-4 py-3'
									}
								>
									<Skeleton
										className={
											colIndex === columns.length - 1
												? 'h-4 w-24'
												: 'h-4 w-full'
										}
									/>
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
