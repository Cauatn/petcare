import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { inputVariants } from '@/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Trigger as RadixPopoverTrigger } from '@radix-ui/react-popover';

type DateFieldProps = {
	value?: string;
	onChange: (value: string) => void;
	placeholder?: string;
} & Omit<React.ComponentProps<typeof RadixPopoverTrigger>, 'onChange'>;

export function DateField({
	value,
	onChange,
	placeholder = 'Selecione',
	...props
}: DateFieldProps) {
	const [open, setOpen] = useState(false);
	const selectedDate = value ? new Date(`${value}T00:00:00`) : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild {...props}>
				<button
					type="button"
					className={cn(
						inputVariants({ variant: 'brand' }),
						'flex h-11 md:h-10 w-full cursor-pointer items-center gap-2 border-n-50 pl-3 text-left',
						!value && 'text-n-300',
					)}
				>
					<CalendarDays className="size-4 shrink-0 text-n-400" />
					<span className="truncate">
						{selectedDate
							? format(selectedDate, 'dd/MM/yyyy', {
									locale: ptBR,
								})
							: placeholder}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-0"
				align="start"
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<Calendar
					mode="single"
					selected={selectedDate}
					onSelect={(date) => {
						if (date) {
							onChange(format(date, 'yyyy-MM-dd'));
							setOpen(false);
						}
					}}
					locale={ptBR}
					defaultMonth={selectedDate}
				/>
			</PopoverContent>
		</Popover>
	);
}
