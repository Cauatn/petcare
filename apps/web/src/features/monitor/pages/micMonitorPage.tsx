import { Navigate, useParams } from 'react-router-dom';

/** Endereço antigo do monitor: o sinal ao vivo agora fica na página do sensor. */
export function MicMonitorPage() {
	const { deviceId } = useParams<{ deviceId: string }>();
	return <Navigate to={`/devices/${deviceId}`} replace />;
}
