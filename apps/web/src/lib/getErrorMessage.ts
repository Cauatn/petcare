import { isAxiosError } from 'axios';

export function getErrorMessage(error: unknown, fallback: string) {
	if (isAxiosError(error)) {
		const message = error.response?.data?.message;
		if (typeof message === 'string') return message;
		if (Array.isArray(message)) {
			return message
				.map((item) =>
					typeof item === 'string' ? item : (item?.message ?? ''),
				)
				.filter(Boolean)
				.join(', ');
		}
	}
	return fallback;
}
