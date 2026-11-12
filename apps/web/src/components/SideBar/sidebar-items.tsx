import { ChartLine, Cpu, House, Settings } from 'lucide-react';
import type { SidebarItem } from './SidebarGroup';

export const mainRoutes: SidebarItem[] = [
	{
		title: 'Minha casa',
		url: '/home',
		icon: <House className="h-5 w-5 shrink-0" />,
	},
	{
		title: 'Dashboard',
		url: '/dashboard',
		icon: <ChartLine className="h-5 w-5 shrink-0" />,
	},
	{
		title: 'Dispositivos',
		url: '/devices',
		icon: <Cpu className="h-5 w-5 shrink-0" />,
	},
];

export const secondaryRoutes: SidebarItem[] = [
	{
		title: 'Configurações',
		url: '/config',
		icon: <Settings className="h-5 w-5 shrink-0" />,
	},
];
