import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	deviceMetricLabel,
	deviceShortValue,
	isDeviceAlerting,
} from '@/features/devices/components/deviceMetric';
import { deviceTypes } from '@/features/devices/constants/deviceTypes';
import type { Device, DevicePosition } from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import * as React from 'react';

/** Distância (px) a partir da qual o gesto deixa de ser clique e vira arraste. */
const DRAG_THRESHOLD_PX = 4;

const clamp = (value: number) => Math.min(97, Math.max(3, value));

type DeviceMarkerProps = {
	device: Device;
	isEditing: boolean;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onMove: (id: string, position: DevicePosition) => void;
};

export function DeviceMarker({
	device,
	isEditing,
	isSelected,
	onSelect,
	onMove,
}: DeviceMarkerProps) {
	const config = deviceTypes[device.type];
	const Icon = config.icon;
	const alerting = isDeviceAlerting(device);
	const [dragPosition, setDragPosition] =
		React.useState<DevicePosition | null>(null);
	const gesture = React.useRef<{
		startX: number;
		startY: number;
		dragging: boolean;
		rect: DOMRect;
	} | null>(null);

	const position = dragPosition ?? device.position;

	function toPlanPosition(event: React.PointerEvent, rect: DOMRect) {
		return {
			x: clamp(((event.clientX - rect.left) / rect.width) * 100),
			y: clamp(((event.clientY - rect.top) / rect.height) * 100),
		};
	}

	function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
		const plan = event.currentTarget.closest('[data-floor-plan]');
		if (!plan) return;

		event.currentTarget.setPointerCapture(event.pointerId);
		gesture.current = {
			startX: event.clientX,
			startY: event.clientY,
			dragging: false,
			rect: plan.getBoundingClientRect(),
		};
	}

	function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
		const current = gesture.current;
		if (!current || !isEditing) return;

		const distance = Math.hypot(
			event.clientX - current.startX,
			event.clientY - current.startY,
		);
		if (!current.dragging && distance < DRAG_THRESHOLD_PX) return;

		current.dragging = true;
		setDragPosition(toPlanPosition(event, current.rect));
	}

	function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
		const current = gesture.current;
		gesture.current = null;
		if (!current) return;

		if (current.dragging) {
			onMove(device._id, toPlanPosition(event, current.rect));
			setDragPosition(null);
			return;
		}
		onSelect(device._id);
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					aria-label={`${device.name}: ${deviceMetricLabel(device)}`}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={() => {
						gesture.current = null;
						setDragPosition(null);
					}}
					className={cn(
						'group absolute flex -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center gap-1 outline-none select-none',
						isEditing
							? 'cursor-grab active:cursor-grabbing'
							: 'cursor-pointer',
						dragPosition
							? 'z-20'
							: 'z-10 transition-[left,top] duration-200',
					)}
					style={{ left: `${position.x}%`, top: `${position.y}%` }}
				>
					<span className="relative">
						{alerting ? (
							<span className="absolute inset-0 animate-ping rounded-full bg-r-500/40" />
						) : null}
						<span
							className={cn(
								'relative flex size-12 items-center justify-center rounded-full border-2 shadow-md transition-transform group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-accent-mint/30',
								config.tone,
								alerting && 'border-r-500',
								isSelected &&
									'scale-110 ring-4 ring-accent-mint/40',
								isEditing && 'border-dashed',
							)}
						>
							<Icon className="size-5" />
						</span>
					</span>
					<span
						className={cn(
							'rounded-full px-2 py-0.5 text-xs font-bold shadow-sm',
							alerting
								? 'bg-r-500 text-n-0'
								: 'bg-n-0 text-n-700',
						)}
					>
						{deviceShortValue(device)}
					</span>
				</button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<p className="font-semibold">{device.name}</p>
				<p className="text-xs opacity-80">
					{deviceMetricLabel(device)}
				</p>
			</TooltipContent>
		</Tooltip>
	);
}
