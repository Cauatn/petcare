import { ChevronRight } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export type SidebarItem = {
	title: string;
	url: string;
	icon?: React.ReactNode;
	items?: SidebarItem[];
	hidden?: boolean;
	activeMatchers?: string[];
	activeStyle?: 'default' | 'text';
	size?: 'default' | 'lg';
	badge?: React.ReactNode;
};

type NavMainProps = {
	title?: string;
	items: SidebarItem[];
	className?: string;
};

function pathMatches(url: string, currentPath: string): boolean {
	return currentPath === url || currentPath.startsWith(`${url}/`);
}

function itemIsActive(item: SidebarItem, currentPath: string): boolean {
	if (pathMatches(item.url, currentPath)) return true;

	return (
		item.activeMatchers?.some((matcher) =>
			pathMatches(matcher, currentPath),
		) ?? false
	);
}

function resolveActiveSubItemUrl(
	subItems: SidebarItem[],
	currentPath: string,
): string | null {
	let bestMatchUrl: string | null = null;
	let bestMatchLength = -1;

	for (const subItem of subItems) {
		const candidates = [subItem.url, ...(subItem.activeMatchers ?? [])];
		const matches = candidates.some((candidate) =>
			pathMatches(candidate, currentPath),
		);

		if (matches && subItem.url.length > bestMatchLength) {
			bestMatchUrl = subItem.url;
			bestMatchLength = subItem.url.length;
		}
	}

	return bestMatchUrl;
}

function NavItemLabel({ children }: { children: React.ReactNode }) {
	return (
		<span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
			{children}
		</span>
	);
}

function NavItemIcon({ children }: { children: React.ReactNode }) {
	if (!children) return null;

	return (
		<span className="flex size-5 shrink-0 items-center justify-center">
			{children}
		</span>
	);
}

function NavCollapsibleItem({
	item,
	currentPath,
}: {
	item: SidebarItem;
	currentPath: string;
}) {
	const location = useLocation();
	const subItems = item.items!;
	const isActive = itemIsActive(item, currentPath);
	const activeSubItemUrl = resolveActiveSubItemUrl(subItems, currentPath);
	const hasActiveSubItem = activeSubItemUrl != null;
	const routeWantsOpen = isActive || hasActiveSubItem;
	const groupHref = subItems[0]?.url ?? item.url;
	const [open, setOpen] = React.useState(routeWantsOpen);
	const { state } = useSidebar();

	React.useEffect(() => {
		setOpen(routeWantsOpen);
	}, [location.pathname, routeWantsOpen]);

	const menuButton = (
		<SidebarMenuButton
			asChild
			isActive={isActive}
			tooltip={item.title}
			size={item.size ?? 'lg'}
			className={cn(
				'sidebar-nav-item-icon min-w-0 rounded-lg px-3',
				isActive
					? item.activeStyle === 'text'
						? 'sidebar-nav-btn-active-text'
						: 'sidebar-nav-btn-active'
					: 'sidebar-nav-btn-idle',
			)}
		>
			<Link to={groupHref} onClick={() => setOpen(true)}>
				<NavItemIcon>{item.icon}</NavItemIcon>
				<NavItemLabel>{item.title}</NavItemLabel>
				{item.badge && (
					<div className="group-data-[collapsible=icon]:hidden ml-auto">
						{item.badge}
					</div>
				)}
				{state === 'expanded' && (
					<ChevronRight
						className={cn(
							'transition-all duration-300',
							open && `rotate-90`,
						)}
					/>
				)}
			</Link>
		</SidebarMenuButton>
	);

	return (
		<Collapsible open={open} onOpenChange={setOpen} asChild>
			<SidebarMenuItem>
				<CollapsibleTrigger asChild>{menuButton}</CollapsibleTrigger>
				<CollapsibleContent className="overflow-hidden">
					<SidebarMenuSub>
						{subItems.map((subItem) => {
							const isSubActive =
								subItem.url === activeSubItemUrl;

							return (
								<SidebarMenuSubItem key={subItem.url}>
									<SidebarMenuSubButton
										asChild
										isActive={isSubActive}
										className={cn(
											'min-w-0 rounded-lg',
											isSubActive
												? 'sidebar-nav-sub-btn-active'
												: 'sidebar-nav-sub-btn-idle',
										)}
									>
										<Link to={subItem.url}>
											<NavItemIcon>
												{subItem.icon}
											</NavItemIcon>
											<NavItemLabel>
												{subItem.title}
											</NavItemLabel>
										</Link>
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							);
						})}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}

export function NavMain({ title, items, className }: NavMainProps) {
	const location = useLocation();
	const currentPath = location.pathname;
	const visibleItems = items.filter(
		(item) =>
			item.hidden !== true && (!item.items || item.items.length > 0),
	);

	return (
		<SidebarGroup
			className={cn(
				'group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-4',
				className,
			)}
		>
			{title ? (
				<SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
					{title}
				</SidebarGroupLabel>
			) : null}
			<SidebarMenu>
				{visibleItems.map((item) => {
					const isActive = itemIsActive(item, currentPath);
					const subItems = item.items;
					const hasSubItems = Boolean(subItems?.length);

					const menuButton = (
						<SidebarMenuButton
							asChild
							isActive={isActive}
							tooltip={item.title}
							size="lg"
							className={cn(
								'sidebar-nav-item-icon min-w-0 rounded-lg px-3',
								isActive
									? 'sidebar-nav-btn-active'
									: 'sidebar-nav-btn-idle',
							)}
						>
							<Link to={item.url} className="relative">
								<NavItemIcon>{item.icon}</NavItemIcon>
								<NavItemLabel>{item.title}</NavItemLabel>
								{item.badge && (
									<div className="group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:right-1 group-data-[collapsible=icon]:top-1 ml-auto">
										{item.badge}
									</div>
								)}
							</Link>
						</SidebarMenuButton>
					);

					if (!hasSubItems) {
						return (
							<SidebarMenuItem key={item.title}>
								{menuButton}
							</SidebarMenuItem>
						);
					}

					return (
						<NavCollapsibleItem
							key={item.title}
							item={item}
							currentPath={currentPath}
						/>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
