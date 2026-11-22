import { Button } from '@/components/ui/button';
import Divider from '@/components/ui/divider';
import { deviceTypes } from '@/features/devices/constants/deviceTypes';
import { useCreateDevice } from '@/features/devices/composables/useCreateDevice';
import { useUpdateDevice } from '@/features/devices/composables/useUpdateDevice';
import type {
	Device,
	DevicePosition,
	DeviceType,
} from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { Check, PencilRuler } from 'lucide-react';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DevicePalette } from './devicePalette';
import { DeviceSettingsSheet } from './deviceSettingsSheet';
import { FloorPlan } from './floorPlan';

const PLAN_CENTER: DevicePosition = { x: 50, y: 50 };

/**
 * Planta baixa da casa. Tocar num sensor abre a página dele; em "Editar planta" dá para
 * arrastar, adicionar pela paleta e tocar para renomear/remover.
 */
export function HousePlanSection({
	devices,
	showHeading = true,
}: {
	devices: Device[];
	/** Linha "Casa" acima da planta (desligue quando a planta já está numa aba). */
	showHeading?: boolean;
}) {
	const navigate = useNavigate();
	const { mutate: createDevice } = useCreateDevice();
	const { mutate: updateDevice } = useUpdateDevice();
	const [isEditing, setIsEditing] = React.useState(false);
	const [selectedId, setSelectedId] = React.useState<string | null>(null);

	const selectedDevice =
		devices.find((device) => device._id === selectedId) ?? null;

	function addDevice(type: DeviceType, position: DevicePosition) {
		const sameType = devices.filter(
			(device) => device.type === type,
		).length;
		const config = deviceTypes[type];

		createDevice({
			type: type,
			name: sameType ? `${config.label} ${sameType + 1}` : config.label,
			sensorKey: `esp32-01:${config.defaultSensorSuffix}${sameType ? `-${sameType + 1}` : ''}`,
			position: position,
		});
	}

	return (
		<section className="space-y-4">
			<div className="flex items-center gap-3">
				<div className="min-w-0 flex-1">
					{showHeading ? (
						<Divider text="Casa" />
					) : (
						<p className="text-sm text-ink-muted">
							Toque num sensor para ver os detalhes dele.
						</p>
					)}
				</div>
				<Button
					variant={isEditing ? 'brand' : 'outline'}
					size="sm"
					onClick={() => {
						setIsEditing((value) => !value);
						setSelectedId(null);
					}}
				>
					{isEditing ? (
						<Check className="size-4" />
					) : (
						<PencilRuler className="size-4" />
					)}
					{isEditing ? 'Concluir' : 'Editar planta'}
				</Button>
			</div>
			{isEditing ? (
				<p className="text-sm text-ink-muted">
					Arraste os sensores para o lugar certo. Toque num sensor
					para renomear ou remover.
				</p>
			) : null}

			<div
				className={cn(
					'grid gap-4',
					isEditing && 'lg:grid-cols-[minmax(0,1fr)_16rem]',
				)}
			>
				<FloorPlan
					devices={devices}
					isEditing={isEditing}
					selectedId={isEditing ? selectedId : null}
					onSelect={(id) =>
						isEditing
							? setSelectedId(id)
							: navigate(`/devices/${id}`)
					}
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

			<DeviceSettingsSheet
				device={isEditing ? selectedDevice : null}
				onClose={() => setSelectedId(null)}
			/>
		</section>
	);
}
