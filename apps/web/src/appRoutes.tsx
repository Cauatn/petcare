import { Layout } from '@/components/Layout/Layout';
import { AppPage } from '@/components/Layout/AppPage';
import { DashboardPage } from '@/features/dashboard/pages/dashboardPage';
import { DevicesPage } from '@/features/devices/pages/devicesPage';
import { HomePage } from '@/features/home/pages/homePage';
import { Navigate, Route, Routes } from 'react-router-dom';

export const AppRoutes = () => {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/home" element={<HomePage />} />
				<Route path="/dashboard" element={<DashboardPage />} />
				<Route path="/devices" element={<DevicesPage />} />
				<Route
					path="/config"
					element={
						<AppPage
							title="Configurações"
							description="Em breve."
						/>
					}
				/>
				<Route path="*" element={<Navigate to="/home" replace />} />
			</Route>
		</Routes>
	);
};
