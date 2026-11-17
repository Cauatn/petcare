import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Abaixo disso "há 3 segundos" vira só "agora mesmo". */
const JUST_NOW_MS = 30_000;

export function formatRelativeTime(date: string | null) {
	if (!date) return '—';

	const value = new Date(date);
	if (Math.abs(Date.now() - value.getTime()) < JUST_NOW_MS)
		return 'agora mesmo';

	return formatDistanceToNowStrict(value, {
		addSuffix: true,
		locale: ptBR,
	});
}
