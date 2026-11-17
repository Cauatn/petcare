import { Layout } from '@/components/Layout/Layout';
import { DashboardPage } from '@/features/dashboard/pages/dashboardPage';
import { DevicesPage } from '@/features/devices/pages/devicesPage';
import { HealthPage } from '@/features/health/pages/healthPage';
import { HomePage } from '@/features/home/pages/homePage';
import { ConfigPage } from '@/features/pairing/pages/configPage';
import { Navigate, Route, Routes } from 'react-router-dom';

export const AppRoutes = () => {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/home" element={<HomePage />} />
				<Route path="/dashboard" element={<DashboardPage />} />
				<Route path="/health" element={<HealthPage />} />
				<Route path="/devices" element={<DevicesPage />} />
				<Route path="/config" element={<ConfigPage />} />
				<Route path="*" element={<Navigate to="/home" replace />} />
			</Route>
		</Routes>
	);
};
