import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/numberInput';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import {
	DeviceStatusBadge,
	deviceMetricLabel,
} from '@/features/devices/components/deviceMetric';
import { LevelBar } from '@/features/devices/components/levelBar';
import {
	bowlCapacityUnit,
	deviceTypes,
} from '@/features/devices/constants/deviceTypes';
import { useDeleteDevice } from '@/features/devices/composables/useDeleteDevice';
import { useUpdateDevice } from '@/features/devices/composables/useUpdateDevice';
import type { Device } from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { ChartLine, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';

function DeviceSettingsForm({
	device,
	onDone,
}: {
	device: Device;
	onDone: () => void;
}) {
	const [name, setName] = React.useState(device.name);
	const [sensorKey, setSensorKey] = React.useState(device.sensorKey);
	const [capacity, setCapacity] = React.useState<number | undefined>(
		device.capacity ?? undefined,
	);
	const { mutate: updateDevice, isPending } = useUpdateDevice();
	const capacityUnit = bowlCapacityUnit[device.type];
	const changed =
		name !== device.name ||
		sensorKey !== device.sensorKey ||
		(capacity ?? null) !== (device.capacity ?? null);

	return (
		<form
			id="device-settings-form"
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				updateDevice(
					{
						id: device._id,
						payload: {
							name: name,
							sensorKey: sensorKey,
							...(capacityUnit
								? { capacity: capacity ?? null }
								: {}),
						},
					},
					{ onSuccess: onDone },
				);
			}}
		>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="device-name">Nome</Label>
				<Input
					id="device-name"
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
			</div>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor="device-sensor-key">
					Identificador do sensor
				</Label>
				<Input
					id="device-sensor-key"
					value={sensorKey}
					onChange={(event) => setSensorKey(event.target.value)}
				/>
				<span className="text-xs text-n-500">
					Valor de <code>sensorKey</code> que o ESP32 envia em{' '}
					<code>POST /api/readings</code>.
				</span>
			</div>
			{capacityUnit ? (
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="device-capacity">
						Capacidade ({capacityUnit})
					</Label>
					<NumberInput
						id="device-capacity"
						value={capacity}
						onChange={setCapacity}
						placeholder={
							device.type === 'waterBowl'
								? 'Ex.: 500'
								: 'Ex.: 300'
						}
					/>
					<span className="text-xs text-n-500">
						Quanto cabe no pote cheio. Converte o nível em consumo
						na aba “Saúde do gato”.
					</span>
				</div>
			) : null}
			<Button
				type="submit"
				size="brand-sm"
				disabled={!changed}
				isLoading={isPending}
				className="self-end"
			>
				Salvar
			</Button>
		</form>
	);
}

type DeviceSettingsSheetProps = {
	device: Device | null;
	onClose: () => void;
};

/** Configuração do item posicionado no plano. Os dados ficam no Dashboard. */
export function DeviceSettingsSheet({
	device,
	onClose,
}: DeviceSettingsSheetProps) {
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();

	return (
		<Sheet
			open={device != null}
			onOpenChange={(open) => !open && onClose()}
		>
			<SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-sm">
				{device ? (
					<>
						<SheetHeader className="border-b border-n-30 p-5">
							<div className="flex items-center gap-3">
								{React.createElement(
									deviceTypes[device.type].icon,
									{
										className: cn(
											'size-10 shrink-0 rounded-xl border p-2',
											deviceTypes[device.type].tone,
										),
									},
								)}
								<div className="min-w-0 flex-1">
									<SheetTitle className="truncate text-lg">
										{device.name}
									</SheetTitle>
									<SheetDescription>
										{deviceTypes[device.type].sensor}
									</SheetDescription>
								</div>
							</div>
						</SheetHeader>

						<div className="flex flex-col gap-6 p-5">
							<div className="flex flex-col gap-2.5 rounded-item bg-n-20 px-3 py-2.5 text-sm text-n-700">
								<div className="flex items-center justify-between gap-3">
									<span className="truncate">
										{deviceMetricLabel(device)}
									</span>
									<DeviceStatusBadge device={device} />
								</div>
								{device.status.level != null ? (
									<LevelBar level={device.status.level} />
								) : null}
							</div>
							<DeviceSettingsForm
								key={device._id}
								device={device}
								onDone={onClose}
							/>
						</div>

						<SheetFooter className="mt-auto flex-col gap-2 border-t border-n-30 p-5">
							<Button
								variant="outline"
								size="brand-sm"
								className="w-full"
								asChild
							>
								<Link to={`/dashboard?device=${device._id}`}>
									<ChartLine />
									Ver no dashboard
								</Link>
							</Button>
							<Button
								variant="outline-danger"
								size="brand-sm"
								className="w-full text-danger"
								isLoading={isDeleting}
								onClick={() =>
									deleteDevice(device._id, {
										onSuccess: onClose,
									})
								}
							>
								<Trash2 />
								Remover do plano
							</Button>
						</SheetFooter>
					</>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
