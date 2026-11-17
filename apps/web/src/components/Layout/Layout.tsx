import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from '@/components/ui/sidebar';
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BrandMark, SidebarMain } from '../SideBar/SidebarMain';

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
				<header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-n-30 bg-n-0/90 px-4 backdrop-blur md:hidden">
					<SidebarTrigger className="text-n-700" />
					<BrandMark />
				</header>
				<div className="min-w-0 flex-1 overflow-auto bg-n-20 p-4 sm:p-page">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
