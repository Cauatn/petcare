import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
	useSidebar,
} from '@/components/ui/sidebar';
import { useGetHealth } from '@/features/core/composables/useGetHealth';
import { cn } from '@/lib/utils';
import { Cat, PanelLeft, PanelLeftClose } from 'lucide-react';
import { NavMain } from '../SideBar/SidebarGroup';
import { mainRoutes, secondaryRoutes } from './sidebar-items';

function SidebarCollapseTrigger() {
	const { state, toggleSidebar } = useSidebar();
	const collapsed = state === 'collapsed';

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="size-11 md:size-8 shrink-0 text-n-700 hover:bg-n-20"
			onClick={toggleSidebar}
			aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
		>
			{collapsed ? (
				<PanelLeft className="size-6 md:size-5" />
			) : (
				<PanelLeftClose className="size-6 md:size-5" />
			)}
		</Button>
	);
}

function SidebarFooterConnection() {
	const { data, isError } = useGetHealth();
	const online = !isError && data?.status === 'ok';
	const label = data?.mock
		? 'Modo simulação'
		: online
			? 'API conectada'
			: 'API offline';

	return (
		<div className="flex items-center gap-3 px-3 pb-3 group-data-[collapsible=icon]:justify-center">
			<span
				className={cn(
					'size-2.5 shrink-0 rounded-full',
					data?.mock ? 'bg-y-400' : online ? 'bg-g-400' : 'bg-r-500',
				)}
				aria-hidden
			/>
			<span className="truncate text-xs tracking-wide text-n-500 group-data-[collapsible=icon]:hidden">
				{label}
			</span>
		</div>
	);
}

export function BrandMark({ className }: { className?: string }) {
	return (
		<div className={cn('flex min-w-0 items-center gap-2.5', className)}>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-g-300 to-g-500 text-n-0 shadow-sm shadow-g-500/30">
				<Cat className="size-5" />
			</span>
			<span className="flex min-w-0 flex-col leading-tight">
				<span className="truncate text-lg font-bold tracking-tight text-n-800">
					PetCare
				</span>
				<span className="truncate text-[11px] font-medium uppercase tracking-wider text-n-400">
					Monitor felino
				</span>
			</span>
		</div>
	);
}

export function SidebarMain() {
	return (
		<Sidebar
			collapsible="icon"
			className="border-r border-n-40 **:data-[sidebar=sidebar]:border-0"
		>
			<SidebarHeader className="gap-0 border-b border-n-30 p-4">
				<div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
					<BrandMark className="group-data-[collapsible=icon]:hidden" />
					<SidebarCollapseTrigger />
				</div>
			</SidebarHeader>
			<SidebarContent className="gap-0 px-3 py-4 group-data-[collapsible=icon]:px-0">
				<NavMain items={mainRoutes} />
			</SidebarContent>
			<SidebarFooter>
				<NavMain
					items={secondaryRoutes}
					className="px-5 group-data-[collapsible=icon]:px-4"
				/>
				<Separator className="my-1 bg-n-30" />
				<SidebarFooterConnection />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
