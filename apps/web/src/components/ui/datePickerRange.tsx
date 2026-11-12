import { ptBR } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import { inputVariants } from '@/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { formatDate } from '@/features/core/utils/formatDate';
import { cn } from '@/lib/utils';

type DatePickerRangeProps = {
	value?: DateRange;
	onChange: (value: DateRange | undefined) => void;
	placeholder?: string;
	canClear?: boolean;
};

function formatPeriodLabel(period?: DateRange, placeholder = 'Selecione') {
	if (!period?.from) return placeholder;

	if (!period.to) {
		return formatDate(period.from);
	}

	return `${formatDate(period.from)} - ${formatDate(period.to)}`;
}

function resolveFieldValue(
	newValue: DateRange | undefined,
	oldValue: DateRange | undefined,
	canClear: boolean,
	onChange: (value: DateRange | undefined) => void,
) {
	if (canClear) {
		onChange(newValue);
		return;
	}

	if (newValue) {
		onChange({
			from: newValue.from,
			to: newValue.to,
		});
		return;
	}
	onChange({
		from: oldValue!.from,
		to: oldValue!.to,
	});
}

export function DatePickerRange({
	value,
	onChange,
	placeholder = 'Selecione',
	canClear = true,
}: DatePickerRangeProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						inputVariants({ variant: 'brand' }),
						'flex h-11 md:h-10 w-full cursor-pointer items-center gap-2 border-n-50 pl-3 text-left',
						!value?.from && 'text-n-300',
					)}
				>
					<CalendarDays className="size-4 shrink-0 text-n-400" />
					<span className="truncate">
						{formatPeriodLabel(value, placeholder)}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-0"
				align="start"
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<Calendar
					mode="range"
					defaultMonth={value?.from}
					selected={value}
					onSelect={(newValue) =>
						resolveFieldValue(newValue, value, canClear, onChange)
					}
					numberOfMonths={2}
					locale={ptBR}
				/>
			</PopoverContent>
		</Popover>
	);
}
