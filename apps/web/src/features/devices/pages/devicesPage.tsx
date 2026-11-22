import { AppPage } from '@/components/Layout/AppPage';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { devicesTableColumns } from '../components/devicesTableColumns';
import { useGetDevices } from '../composables/useGetDevices';

export function DevicesPage() {
	const { data, isLoading, error } = useGetDevices();

	return (
		<AppPage
			title="Dispositivos"
			description="Sensores conectados ao ESP32 e a última leitura de cada um."
			headerActions={
				<Button asChild>
					<Link to="/add-device">
						<Plus className="size-4" />
						Adicionar dispositivo
					</Link>
				</Button>
			}
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
