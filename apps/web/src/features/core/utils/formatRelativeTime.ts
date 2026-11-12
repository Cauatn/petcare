import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatRelativeTime(date: string | null) {
	if (!date) return '—';

	return formatDistanceToNowStrict(new Date(date), {
		addSuffix: true,
		locale: ptBR,
	});
}
