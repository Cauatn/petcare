import { AppPage } from '@/components/Layout/AppPage';
import { DataTable } from '@/components/ui/data-table';
import { devicesTableColumns } from '../components/devicesTableColumns';
import { useGetDevices } from '../composables/useGetDevices';

export function DevicesPage() {
	const { data, isLoading, error } = useGetDevices();

	return (
		<AppPage
			title="Dispositivos"
			description="Sensores conectados ao ESP32 e a última leitura de cada um."
		>
			<DataTable
				columns={devicesTableColumns}
				data={data}
				isLoading={isLoading}
				error={error}
				emptyStateDescription="Adicione dispositivos pelo plano em “Minha casa”."
			/>
		</AppPage>
	);
}
