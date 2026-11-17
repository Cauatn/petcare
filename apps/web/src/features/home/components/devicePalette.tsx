import {
	deviceTypeList,
	deviceTypes,
} from '@/features/devices/constants/deviceTypes';
import type { DeviceType } from '@/features/devices/types/device';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export const DEVICE_DRAG_MIME = 'application/x-petcare-device';

type DevicePaletteProps = {
	onAdd: (type: DeviceType) => void;
};

/** Itens que podem ser arrastados para o plano (ou clicados, no celular). */
export function DevicePalette({ onAdd }: DevicePaletteProps) {
	return (
		<aside className="flex flex-col gap-3 rounded-card border border-n-30 bg-n-0 p-4">
			<div>
				<p className="text-base font-semibold text-n-700">Adicionar</p>
				<p className="text-caption text-n-500">
					Arraste para o cômodo ou clique para adicionar no centro.
				</p>
			</div>
			<ul className="flex flex-col gap-2">
				{deviceTypeList.map((type) => {
					const config = deviceTypes[type];
					const Icon = config.icon;

					return (
						<li key={type}>
							<button
								type="button"
								draggable
								onDragStart={(event) => {
									event.dataTransfer.setData(
										DEVICE_DRAG_MIME,
										type,
									);
									event.dataTransfer.effectAllowed = 'copy';
								}}
								onClick={() => onAdd(type)}
								className="flex w-full cursor-grab items-center gap-3 rounded-item border border-n-30 bg-n-0 p-2 text-left transition-colors hover:bg-n-10 active:cursor-grabbing"
							>
								<span
									className={cn(
										'flex size-9 shrink-0 items-center justify-center rounded-xl border',
										config.tone,
									)}
								>
									<Icon className="size-4" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm font-semibold text-n-700">
										{config.label}
									</span>
									<span className="block truncate text-xs text-n-500">
										{config.sensor}
									</span>
								</span>
								<Plus className="size-4 text-n-400" />
							</button>
						</li>
					);
				})}
			</ul>
		</aside>
	);
}
