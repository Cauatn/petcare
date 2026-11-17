import type {
	Device,
	DevicePosition,
	DeviceType,
} from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import * as React from 'react';
import { PLAN_HEIGHT, PLAN_WIDTH } from '../constants/rooms';
import { DeviceMarker } from './deviceMarker';
import { DEVICE_DRAG_MIME } from './devicePalette';
import { HouseLayout } from './houseLayout';

type FloorPlanProps = {
	devices: Device[];
	isEditing: boolean;
	selectedId: string | null;
	onSelect: (id: string) => void;
	onMove: (id: string, position: DevicePosition) => void;
	onDropNew: (type: DeviceType, position: DevicePosition) => void;
};

export function FloorPlan({
	devices,
	isEditing,
	selectedId,
	onSelect,
	onMove,
	onDropNew,
}: FloorPlanProps) {
	const [isDragOver, setIsDragOver] = React.useState(false);

	function handleDrop(event: React.DragEvent<HTMLDivElement>) {
		event.preventDefault();
		setIsDragOver(false);

		const type = event.dataTransfer.getData(DEVICE_DRAG_MIME) as DeviceType;
		if (!type) return;

		const rect = event.currentTarget.getBoundingClientRect();
		onDropNew(type, {
			x: ((event.clientX - rect.left) / rect.width) * 100,
			y: ((event.clientY - rect.top) / rect.height) * 100,
		});
	}

	return (
		<div className="overflow-x-auto rounded-card border border-n-30 bg-n-0 p-3 shadow-xs sm:p-5">
			<div
				data-floor-plan
				className={cn(
					'relative mx-auto w-full min-w-[640px] max-w-5xl transition-shadow',
					isDragOver && 'rounded-lg ring-4 ring-accent-mint/40',
				)}
				style={{ aspectRatio: `${PLAN_WIDTH} / ${PLAN_HEIGHT}` }}
				onDragOver={(event) => {
					if (!isEditing) return;
					event.preventDefault();
					setIsDragOver(true);
				}}
				onDragLeave={() => setIsDragOver(false)}
				onDrop={handleDrop}
			>
				<HouseLayout />
				{devices.map((device) => (
					<DeviceMarker
						key={device._id}
						device={device}
						isEditing={isEditing}
						isSelected={device._id === selectedId}
						onSelect={onSelect}
						onMove={onMove}
					/>
				))}
			</div>
		</div>
	);
}
