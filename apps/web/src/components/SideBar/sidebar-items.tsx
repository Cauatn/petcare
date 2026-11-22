import { ChartLine, HeartPulse, PawPrint, Settings } from 'lucide-react';
import type { SidebarItem } from './SidebarGroup';

export const mainRoutes: SidebarItem[] = [
	{
		title: 'Início',
		url: '/inicio',
		icon: <PawPrint className="h-5 w-5 shrink-0" />,
	},
	{
		title: 'Resumo',
		url: '/dashboard',
		icon: <ChartLine className="h-5 w-5 shrink-0" />,
	},
	{
		title: 'Saúde do gato',
		url: '/health',
		icon: <HeartPulse className="h-5 w-5 shrink-0" />,
	},
];

export const secondaryRoutes: SidebarItem[] = [
	{
		title: 'Configurações',
		url: '/config',
		icon: <Settings className="h-5 w-5 shrink-0" />,
	},
];
