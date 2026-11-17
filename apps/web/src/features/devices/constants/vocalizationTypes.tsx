import {
	BellRing,
	Bird,
	Hand,
	Heart,
	Megaphone,
	ShieldAlert,
	type LucideIcon,
} from 'lucide-react';
import type { VocalizationKind } from '../types/device';

export type VocalizationTypeConfig = {
	label: string;
	/** O que o som costuma significar. */
	meaning: string;
	icon: LucideIcon;
	/** Cor do destaque no gráfico (variável CSS). */
	color: string;
	/** Classes do círculo/ficha (fundo claro + texto + borda). */
	tone: string;
	/** Como o som entra na leitura de saúde. */
	healthHint: string;
};

/**
 * Tipos de som que o módulo LM393 (saída analógica) consegue separar.
 * Ronronar fica de fora: grave e baixo demais para esse microfone.
 * Base: Schötz et al. "Melody matters"; Meowsic; PMC6912413.
 */
export const vocalizationTypes: Record<
	VocalizationKind,
	VocalizationTypeConfig
> = {
	greeting: {
		label: 'Miado curto',
		meaning: 'Cumprimento ou chamando atenção',
		icon: Hand,
		color: 'var(--g-400)',
		tone: 'bg-g-100 text-g-600 border-g-400',
		healthHint: 'Comunicação social normal com as pessoas da casa.',
	},
	demand: {
		label: 'Miado longo',
		meaning: 'Pedindo algo: comida, porta ou atenção',
		icon: BellRing,
		color: 'var(--o-400)',
		tone: 'bg-o-100 text-o-400 border-o-400',
		healthHint:
			'Aumento persistente, junto com mais fome, pode indicar hipertireoidismo ou diabetes.',
	},
	trill: {
		label: 'Trinado',
		meaning: 'Saudação amigável, gato contente',
		icon: Heart,
		color: 'var(--b-400)',
		tone: 'bg-b-100 text-b-600 border-(--color-b-400)',
		healthHint: 'Sinal de bem-estar e vínculo.',
	},
	yowl: {
		label: 'Uivo',
		meaning: 'Desconforto, dor, desorientação ou cio',
		icon: Megaphone,
		color: 'var(--p-500)',
		tone: 'bg-p-100 text-p-700 border-p-500',
		healthHint:
			'Uivos frequentes, sobretudo à noite em gatos idosos, pedem avaliação veterinária (tireoide, pressão, disfunção cognitiva, dor).',
	},
	defensive: {
		label: 'Sibilo / rosnado',
		meaning: 'Medo, defesa ou irritação',
		icon: ShieldAlert,
		color: 'var(--r-500)',
		tone: 'bg-r-100 text-r-600 border-(--color-r-500)',
		healthHint:
			'Aumento indica estresse, conflito com outros animais ou dor ao toque.',
	},
	chatter: {
		label: 'Tagarelar',
		meaning: 'Excitação de caça (pássaro na janela)',
		icon: Bird,
		color: 'var(--y-600)',
		tone: 'bg-y-100 text-y-700 border-(--color-y-600)',
		healthHint: 'Comportamento normal de caça, ótimo enriquecimento.',
	},
};

export const vocalizationKindList = Object.keys(
	vocalizationTypes,
) as VocalizationKind[];

/** Tipos que indicam desconforto/estresse na leitura de saúde. */
export const distressKinds: VocalizationKind[] = ['yowl', 'defensive'];

export function formatDuration(ms: number) {
	return ms < 1000
		? `${Math.round(ms)} ms`
		: `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
}
