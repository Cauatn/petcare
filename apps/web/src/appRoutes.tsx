import { Layout } from '@/components/Layout/Layout';
import { DashboardPage } from '@/features/dashboard/pages/dashboardPage';
import { DeviceDetailPage } from '@/features/devices/pages/deviceDetailPage';
import { HealthPage } from '@/features/health/pages/healthPage';
import { MicMonitorPage } from '@/features/monitor/pages/micMonitorPage';
import { OverviewPage } from '@/features/overview/pages/overviewPage';
import { AddDevicePage } from '@/features/pairing/pages/addDevicePage';
import { ConfigPage } from '@/features/pairing/pages/configPage';
import { Navigate, Route, Routes } from 'react-router-dom';

export const AppRoutes = () => {
	return (
		<Routes>
			<Route element={<Layout />}>
				<Route path="/inicio" element={<OverviewPage />} />
				<Route path="/dashboard" element={<DashboardPage />} />
				<Route path="/health" element={<HealthPage />} />
				<Route
					path="/devices/:deviceId"
					element={<DeviceDetailPage />}
				/>
				<Route path="/add-device" element={<AddDevicePage />} />
				<Route path="/config" element={<ConfigPage />} />
				{/* Endereços antigos */}
				<Route
					path="/home"
					element={<Navigate to="/inicio" replace />}
				/>
				<Route
					path="/devices"
					element={<Navigate to="/config#sensores" replace />}
				/>
				<Route path="/monitor/:deviceId" element={<MicMonitorPage />} />
				<Route path="*" element={<Navigate to="/inicio" replace />} />
			</Route>
		</Routes>
	);
};
