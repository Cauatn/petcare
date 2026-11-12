import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from '@/components/ui/sidebar';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarMain } from '../SideBar/SidebarMain';

function CloseMobileSidebarOnNavigate() {
	const { pathname } = useLocation();
	const { isMobile, setOpenMobile } = useSidebar();

	React.useEffect(() => {
		if (isMobile) setOpenMobile(false);
	}, [pathname, isMobile, setOpenMobile]);

	return null;
}

export function Layout() {
	return (
		<SidebarProvider
			defaultOpen={true}
			style={
				{
					'--sidebar-width': '15rem',
				} as React.CSSProperties
			}
		>
			<CloseMobileSidebarOnNavigate />
			<SidebarMain />
			<SidebarInset>
				<header className="flex h-14 shrink-0 items-center gap-2 border-b border-n-30 bg-n-0 px-4 md:hidden">
					<SidebarTrigger className="text-n-700" />
				</header>
				<div className="min-w-0 flex-1 overflow-auto p-page">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
