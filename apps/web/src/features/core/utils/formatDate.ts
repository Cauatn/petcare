import { format } from 'date-fns';

export function toDateInput(date: Date) {
	return format(date, 'yyyy-MM-dd');
}

export function toTimeInput(date: Date) {
	return format(date, 'HH:mm');
}

export function parseDateInput(value: string) {
	return new Date(`${value}T00:00:00`);
}

export function combineDateAndTime(date: string, time: string) {
	const [hours, minutes] = time.split(':').map(Number);
	const combined = parseDateInput(date);
	combined.setHours(hours, minutes, 0, 0);
	return combined.toISOString();
}

export function formatDate(date: Date | string) {
	let parsedDate = date;

	if (typeof date === 'string') {
		parsedDate = parseDateInput(date);
	}

	return format(parsedDate, 'dd/MM/yyyy');
}

export function formatDateWithTime(date: Date | string) {
	let parsedDate = date;

	if (typeof date === 'string') {
		parsedDate = new Date(date);
	}

	return format(parsedDate, "dd/MM/yyyy à's' H:mm");
}
