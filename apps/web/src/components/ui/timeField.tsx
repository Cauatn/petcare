import { Clock } from 'lucide-react';
import { useState } from 'react';

import { inputVariants } from '@/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Trigger as RadixPopoverTrigger } from '@radix-ui/react-popover';

type TimeFieldProps = {
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
} & Omit<React.ComponentProps<typeof RadixPopoverTrigger>, 'onChange'>;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) =>
	String(i).padStart(2, '0'),
);

export function TimeField({
	value,
	onChange,
	placeholder = 'Selecione',
	...props
}: TimeFieldProps) {
	const [open, setOpen] = useState(false);
	const [hour, minute] = value ? value.split(':') : ['', ''];

	function handleHourChange(nextHour: string) {
		onChange(`${nextHour}:${minute || '00'}`);
	}

	function handleMinuteChange(nextMinute: string) {
		onChange(`${hour || '00'}:${nextMinute}`);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild {...props}>
				<button
					type="button"
					className={cn(
						inputVariants({ variant: 'brand' }),
						'flex w-full cursor-pointer items-center gap-2 border-n-50 pl-3 text-left',
						!value && 'text-n-300',
					)}
				>
					<Clock className="size-4 shrink-0 text-n-400" />
					<span className="truncate">{value || placeholder}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-3" align="start">
				<div className="flex flex-1 items-center justify-between gap-2">
					<Select value={hour} onValueChange={handleHourChange}>
						<SelectTrigger className="w-24">
							<SelectValue placeholder="HH" />
						</SelectTrigger>
						<SelectContent>
							{HOURS.map((h) => (
								<SelectItem key={h} value={h}>
									{h}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<span className="text-lg font-semibold text-n-500">:</span>
					<Select value={minute} onValueChange={handleMinuteChange}>
						<SelectTrigger className="w-24">
							<SelectValue placeholder="MM" />
						</SelectTrigger>
						<SelectContent>
							{MINUTES.map((m) => (
								<SelectItem key={m} value={m}>
									{m}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</PopoverContent>
		</Popover>
	);
}
