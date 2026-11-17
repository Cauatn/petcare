import type { HealthArea, HealthTip, PetDiet } from '../types/health';

/**
 * Faixas de referência usadas para estimar a saúde do gato.
 * São médias populacionais: a comparação com a própria linha de base do gato
 * pesa tanto quanto a faixa absoluta. Não substituem o veterinário.
 */

/** Dias completos mais recentes usados na avaliação. */
export const ASSESSMENT_DAYS = 3;
/** Dias extras pedidos à API para formar a linha de base. */
export const BASELINE_EXTRA_DAYS = 7;
/** Mínimo de dias na linha de base para falar em tendência. */
export const MIN_BASELINE_DAYS = 2;

export const periodOptions = [
	{ value: '7', label: '7 dias' },
	{ value: '14', label: '14 dias' },
	{ value: '30', label: '30 dias' },
] as const;

export const dietLabels: Record<PetDiet, string> = {
	dry: 'Ração seca',
	wet: 'Ração úmida (sachê/lata)',
	mixed: 'Mista (seca + úmida)',
};

export const bodyConditionLabels = {
	thin: 'Abaixo do peso',
	ideal: 'Peso ideal',
	overweight: 'Acima do peso',
} as const;

// ── Água ────────────────────────────────────────────────────────────────
/** Necessidade hídrica total de um gato adulto (água + umidade do alimento). */
export const WATER_TOTAL_ML_PER_KG = 50;
/**
 * Quanto se espera que o gato beba do POTE (ml/kg/dia), por dieta. A ração
 * úmida tem ~75–80% de água, então quem come sachê bebe bem menos.
 */
export const waterBowlRangeByDiet: Record<
	PetDiet,
	{ min: number; max: number }
> = {
	dry: { min: 40, max: 70 },
	mixed: { min: 20, max: 45 },
	wet: { min: 5, max: 25 },
};
/** Acima disso há polidipsia (sede excessiva). */
export const POLYDIPSIA_ML_PER_KG = 100;

// ── Ração ───────────────────────────────────────────────────────────────
/** Necessidade em repouso (RER) = 70 × peso^0,75 (NRC 2006). */
export const RER_FACTOR = 70;
export const RER_EXPONENT = 0.75;
/** Multiplicadores da necessidade diária (MER) sobre o RER. */
export const merFactors = {
	kitten: 2.5,
	neutered: 1.2,
	intact: 1.4,
	senior: 1.1,
	overweight: 0.8,
	thin: 1.4,
};
export const KITTEN_MAX_AGE_YEARS = 1;
export const SENIOR_MIN_AGE_YEARS = 11;
/** Densidade energética padrão (kcal/kg) quando o rótulo não é informado. */
export const defaultKcalPerKgByDiet: Record<PetDiet, number> = {
	dry: 3800,
	wet: 900,
	mixed: 2350,
};
/** Proporção da meta de ração considerada ok / atenção. */
export const FOOD_OK_RATIO = { min: 0.8, max: 1.2 };
export const FOOD_ATTENTION_RATIO = { min: 0.6, max: 1.4 };

// ── Caixa de areia ──────────────────────────────────────────────────────
/** 2–4 micções + 1–2 evacuações por dia. */
export const LITTER_VISITS_RANGE = { min: 3, max: 6 };
export const LITTER_VISITS_HIGH = 8;
/** Permanência média acima disso sugere esforço para urinar/evacuar. */
export const LITTER_LONG_VISIT_SEC = 180;

// ── Tendência contra a linha de base do gato ───────────────────────────
export const TREND_UP_ATTENTION = 0.5;
export const TREND_DOWN_ATTENTION = -0.35;

// ── Vocalização ─────────────────────────────────────────────────────────
/** Não há norma veterinária de quantidade: valem a mistura de tipos e a linha de base. */
export const YOWL_PER_DAY_ATTENTION = 3;
export const DEFENSIVE_PER_DAY_ATTENTION = 2;
/** Vocalização noturna: mais da metade dos sons e pelo menos 3 por noite. */
export const NIGHT_SHARE_ATTENTION = 0.5;
export const NIGHT_MIN_PER_DAY = 3;
/** Aumento de uivos/sibilos (vs. média) que merece atenção. */
export const VOCAL_KIND_TREND_ATTENTION = 1;
/** Variação do total de sons (vs. média) que merece atenção. */
export const VOCAL_TOTAL_TREND_UP = 0.5;
export const VOCAL_TOTAL_TREND_DOWN = -0.5;
/** Idade a partir da qual uivo noturno sugere doença da idade. */
export const VOCAL_SENIOR_AGE_YEARS = 10;

export const areaLabels: Record<HealthArea, string> = {
	water: 'Hidratação',
	food: 'Alimentação',
	litter: 'Caixa de areia',
	vocal: 'Vocalização',
};

// ── Dicas ───────────────────────────────────────────────────────────────
export const tips: Record<HealthArea | 'general', HealthTip[]> = {
	water: [
		{
			title: 'Ofereça água corrente',
			description:
				'Muitos gatos bebem mais em fontes com circulação. Lave o filtro e a bomba toda semana.',
		},
		{
			title: 'Potes largos e rasos',
			description:
				'Bigodes encostando na borda incomodam (“fadiga dos bigodes”). Prefira cerâmica, vidro ou inox, nunca plástico com cheiro.',
		},
		{
			title: 'Água longe da comida e da caixa',
			description:
				'Na natureza o gato evita beber perto de onde come ou faz as necessidades. Espalhe 2 ou mais pontos de água pela casa.',
		},
		{
			title: 'Troque a água todo dia',
			description:
				'Água fresca e pote limpo aumentam o consumo. Mantenha o pote sempre cheio até a borda.',
		},
		{
			title: 'Inclua ração úmida',
			description:
				'Sachês e patês têm ~80% de água e ajudam a prevenir cálculos urinários e doença renal, sobretudo em gatos que bebem pouco.',
		},
	],
	food: [
		{
			title: 'Pese a porção do dia',
			description:
				'Use uma balança de cozinha em vez do copo medidor. Pequenos excessos diários viram obesidade em poucos meses.',
		},
		{
			title: 'Divida em 3–4 refeições',
			description:
				'Gatos comem pequenas porções várias vezes ao dia. Refeições fracionadas reduzem vômito e ansiedade por comida.',
		},
		{
			title: 'Use comedouros interativos',
			description:
				'Bolas dispensadoras e tapetes de farejar estimulam o instinto de caça e desaceleram gatos que comem rápido demais.',
		},
		{
			title: 'Troque de ração aos poucos',
			description:
				'Faça a transição em 7–10 dias, misturando a nova com a antiga. Nunca faça dieta brusca: gato em jejum corre risco de lipidose hepática.',
		},
		{
			title: 'Acompanhe a condição corporal',
			description:
				'Você deve sentir as costelas sem vê-las, e enxergar a cintura de cima. Pese o gato uma vez por mês.',
		},
	],
	litter: [
		{
			title: 'Regra do n + 1',
			description:
				'Tenha uma caixa por gato mais uma extra, em cômodos diferentes, para ele sempre ter uma opção limpa e acessível.',
		},
		{
			title: 'Limpe todos os dias',
			description:
				'Retire os torrões ao menos uma vez por dia e troque toda a areia semanalmente. Caixa suja faz o gato segurar a urina.',
		},
		{
			title: 'Areia fina e sem perfume',
			description:
				'Gatos preferem areia fina, aglomerante e sem cheiro. Perfume forte afasta o gato da caixa.',
		},
		{
			title: 'Caixa grande em local calmo',
			description:
				'A caixa deve ter 1,5× o comprimento do gato, ficar longe de máquinas barulhentas e da comida, e ter borda baixa para gatos idosos.',
		},
	],
	vocal: [
		{
			title: 'Não recompense o miado de pedido',
			description:
				'Servir comida ou abrir a porta a cada miado ensina o gato a miar mais. Use horários fixos ou um alimentador automático e dê atenção quando ele estiver calmo.',
		},
		{
			title: 'Brinque antes de dormir',
			description:
				'10–15 minutos de brincadeira de caça seguidos de uma refeição à noite gastam energia e reduzem miados de madrugada.',
		},
		{
			title: 'Rotina e luz noturna para idosos',
			description:
				'Gatos idosos podem ficar desorientados à noite. Uma luz fraca, rotina previsível e acesso fácil à caixa e à água ajudam.',
		},
		{
			title: 'Esconderijos e lugares altos',
			description:
				'Sibilos e rosnados indicam medo ou conflito. Ofereça esconderijos, prateleiras altas e recursos separados para cada gato; difusores de feromônio podem ajudar.',
		},
		{
			title: 'Janela com vista',
			description:
				'Tagarelar para pássaros é instinto de caça e um ótimo enriquecimento. Uma janela segura com vista mantém o gato estimulado.',
		},
		{
			title: 'Uivo novo merece consulta',
			description:
				'Um gato adulto ou idoso que passa a uivar, sobretudo à noite, deve ser avaliado: hipertireoidismo, pressão alta, dor e disfunção cognitiva são causas comuns e tratáveis.',
		},
	],
	general: [
		{
			title: 'Check-up veterinário',
			description:
				'Consulta anual para adultos e semestral para gatos acima de 10 anos, com exames de sangue e urina para detectar doença renal cedo.',
		},
		{
			title: 'Enriquecimento ambiental',
			description:
				'Brincadeiras diárias, arranhadores e lugares altos reduzem o estresse, que afeta apetite, hidratação e o uso da caixa.',
		},
	],
};

// ── Fontes ──────────────────────────────────────────────────────────────
export const healthSources = [
	{
		label: 'Schötz et al. (2019) — Melody matters: miados em seis contextos e quatro estados mentais',
		url: 'https://www.researchgate.net/publication/335482937_Melody_matters_An_acoustic_study_of_domestic_cat_meows_in_six_contexts_and_four_mental_states',
	},
	{
		label: 'Only When It Feels Good — vocalizações de gatos além do miado (Animals, 2020)',
		url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6912413/',
	},
	{
		label: 'Petplan — Por que meu gato idoso uiva?',
		url: 'https://www.petplan.co.uk/pet-information/cat/advice/older-cat-language/',
	},
	{
		label: 'MSPCA — Por que meu gato mia tanto?',
		url: 'https://www.mspca.org/clinical/why-is-my-cat-meowing-so-much/',
	},
	{
		label: 'Royal Canin Academy — Necessidade hídrica e hábitos de ingestão de água em gatos',
		url: 'https://academy.royalcanin.com/en/veterinary/the-water-requirements-and-drinking-habits-of-cats',
	},
	{
		label: 'Zanghi et al. (2018), AJVR — Ingestão de água em gatos saudáveis: dieta seca × úmida',
		url: 'https://vetcenter.purina.com.tr/sites/default/files/2025-01/Zanghi_2018_NEW_healthy%20cats.pdf',
	},
	{
		label: 'Pet Nutrition Alliance — Cálculo de calorias (RER/MER, NRC 2006)',
		url: 'https://petnutritionalliance.org/wp-content/uploads/2023/03/MER.RER_.PNA_.pdf',
	},
	{
		label: 'PetMD — Por que meu gato está urinando muito?',
		url: 'https://petmd.com/cat/symptoms/why-is-my-cat-peeing-a-lot',
	},
	{
		label: 'PetMD — Lipidose hepática em gatos',
		url: 'https://www.petmd.com/cat/conditions/digestive/c_ct_hepatic_lipidosis',
	},
	{
		label: 'WebVet — Mudanças nos hábitos da caixa de areia que indicam problema',
		url: 'https://www.webvet.com/when-changes-in-litter-box-habits-signal-a-medical-problem/',
	},
];
