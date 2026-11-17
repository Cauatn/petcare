import { AppPage } from '@/components/Layout/AppPage';
import { Button } from '@/components/ui/button';
import { deviceTypes } from '@/features/devices/constants/deviceTypes';
import { useCreateDevice } from '@/features/devices/composables/useCreateDevice';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { useUpdateDevice } from '@/features/devices/composables/useUpdateDevice';
import type {
	DevicePosition,
	DeviceType,
} from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { Check, PencilRuler } from 'lucide-react';
import { useQueryState } from 'nuqs';
import * as React from 'react';
import { DeviceSettingsSheet } from '../components/deviceSettingsSheet';
import { DevicePalette } from '../components/devicePalette';
import { DeviceStatusList } from '../components/deviceStatusList';
import { FloorPlan } from '../components/floorPlan';

const PLAN_CENTER: DevicePosition = { x: 50, y: 50 };

export function HomePage() {
	const { data: devices } = useGetDevices();
	const { mutate: createDevice } = useCreateDevice();
	const { mutate: updateDevice } = useUpdateDevice();
	const [isEditing, setIsEditing] = React.useState(false);
	const [selectedId, setSelectedId] = useQueryState('device');

	const selectedDevice =
		devices?.find((device) => device._id === selectedId) ?? null;

	function addDevice(type: DeviceType, position: DevicePosition) {
		const sameType =
			devices?.filter((device) => device.type === type).length ?? 0;
		const config = deviceTypes[type];

		createDevice({
			type: type,
			name: sameType ? `${config.label} ${sameType + 1}` : config.label,
			sensorKey: `esp32-01:${config.defaultSensorSuffix}${sameType ? `-${sameType + 1}` : ''}`,
			position: position,
		});
	}

	return (
		<AppPage
			title="Minha casa"
			description="Posicione os sensores no plano da casa. Toque em um item para configurá-lo."
			headerActions={
				<Button
					variant={isEditing ? 'brand' : 'outline'}
					size="brand-md"
					onClick={() => setIsEditing((value) => !value)}
				>
					{isEditing ? <Check /> : <PencilRuler />}
					{isEditing ? 'Concluir edição' : 'Editar layout'}
				</Button>
			}
		>
			<div className="flex flex-col gap-section">
				<div
					className={cn(
						'grid gap-4',
						isEditing && 'lg:grid-cols-[minmax(0,1fr)_16rem]',
					)}
				>
					<FloorPlan
						devices={devices ?? []}
						isEditing={isEditing}
						selectedId={selectedId}
						onSelect={(id) => void setSelectedId(id)}
						onMove={(id, position) =>
							updateDevice({
								id: id,
								payload: { position: position },
							})
						}
						onDropNew={addDevice}
					/>
					{isEditing ? (
						<DevicePalette
							onAdd={(type) => addDevice(type, PLAN_CENTER)}
						/>
					) : null}
				</div>
				{isEditing ? null : (
					<DeviceStatusList
						devices={devices}
						selectedId={selectedId}
						onSelect={(id) => void setSelectedId(id)}
					/>
				)}
			</div>

			<DeviceSettingsSheet
				device={selectedDevice}
				onClose={() => void setSelectedId(null)}
			/>
		</AppPage>
	);
}
