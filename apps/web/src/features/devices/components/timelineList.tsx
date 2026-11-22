import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { deviceTypes } from '../constants/deviceTypes';
import type { TimelineEvent } from '../utils/timeline';

const PAGE_SIZE = 20;

/** Lista de acontecimentos com horário, do mais recente para o mais antigo. */
export function TimelineList({
	events,
	showDevice = false,
	emptyText,
}: {
	events: TimelineEvent[];
	/** Mostra de qual sensor veio cada acontecimento (resumo da casa toda). */
	showDevice?: boolean;
	emptyText: string;
}) {
	const [visible, setVisible] = React.useState(PAGE_SIZE);

	if (events.length === 0) {
		return (
			<p className="w-full rounded-lg border border-dashed border-n-40 px-4 py-6 text-center text-sm text-ink-muted">
				{emptyText}
			</p>
		);
	}

	return (
		<div className="w-full space-y-3">
			<ol className="divide-y divide-n-30">
				{events.slice(0, visible).map((event) => {
					const config = deviceTypes[event.device.type];
					const Icon = config.icon;
					return (
						<li
							key={event.id}
							className="flex items-start gap-3 py-2.5"
						>
							<span className="w-11 shrink-0 pt-0.5 text-sm font-semibold text-ink-secondary tabular-nums">
								{format(new Date(event.at), 'HH:mm')}
							</span>
							<span
								className={cn(
									'flex size-7 shrink-0 items-center justify-center rounded-lg border',
									event.tone === 'warn'
										? 'border-(--r-500) bg-r-100 text-r-600'
										: config.tone,
								)}
							>
								<Icon className="size-3.5" />
							</span>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium text-ink-strong">
									{event.title}
								</p>
								<p className="text-xs text-ink-muted">
									{showDevice ? (
										<Link
											to={`/devices/${event.device._id}`}
											className="font-medium text-b-600 hover:underline"
										>
											{event.device.name}
										</Link>
									) : null}
									{showDevice && event.detail ? ' · ' : null}
									{event.detail}
								</p>
							</div>
						</li>
					);
				})}
			</ol>
			{events.length > visible ? (
				<Button
					variant="outline"
					size="sm"
					onClick={() => setVisible((v) => v + PAGE_SIZE)}
				>
					Mostrar mais ({events.length - visible})
				</Button>
			) : null}
		</div>
	);
}
