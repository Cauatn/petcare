import {
	distressKinds,
	vocalizationKindList,
} from '@/features/devices/constants/vocalizationTypes';
import type { VocalizationKind } from '@/features/devices/types/device';
import {
	ASSESSMENT_DAYS,
	DEFENSIVE_PER_DAY_ATTENTION,
	NIGHT_MIN_PER_DAY,
	NIGHT_SHARE_ATTENTION,
	VOCAL_KIND_TREND_ATTENTION,
	VOCAL_SENIOR_AGE_YEARS,
	VOCAL_TOTAL_TREND_DOWN,
	VOCAL_TOTAL_TREND_UP,
	YOWL_PER_DAY_ATTENTION,
	FOOD_ATTENTION_RATIO,
	FOOD_OK_RATIO,
	KITTEN_MAX_AGE_YEARS,
	LITTER_LONG_VISIT_SEC,
	LITTER_VISITS_HIGH,
	LITTER_VISITS_RANGE,
	MIN_BASELINE_DAYS,
	POLYDIPSIA_ML_PER_KG,
	RER_EXPONENT,
	RER_FACTOR,
	SENIOR_MIN_AGE_YEARS,
	TREND_DOWN_ATTENTION,
	TREND_UP_ATTENTION,
	defaultKcalPerKgByDiet,
	dietLabels,
	merFactors,
	tips,
	waterBowlRangeByDiet,
} from '../constants/healthReferences';
import type {
	AreaAssessment,
	CrossSignal,
	DailyCatStats,
	HealthArea,
	HealthAssessment,
	HealthStatus,
	Pet,
} from '../types/health';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const STATUS_WEIGHT: Record<HealthStatus, number> = {
	insufficient: 0,
	ok: 1,
	attention: 2,
	alert: 3,
};

/** O pior estado de uma lista (alerta > atenção > ok > insuficiente), começando de `start`. */
const worstStatus = (statuses: HealthStatus[], start: HealthStatus) =>
	statuses.reduce<HealthStatus>(
		(worst, status) =>
			STATUS_WEIGHT[status] > STATUS_WEIGHT[worst] ? status : worst,
		start,
	);
const ATTENTION_SCORE_CAP = 75;
const ALERT_SCORE_CAP = 35;

// ── Metas ───────────────────────────────────────────────────────────────

export function petAgeYears(pet: Pet, now = new Date()) {
	if (!pet.birthDate) return null;
	return (now.getTime() - new Date(pet.birthDate).getTime()) / MS_PER_YEAR;
}

/** Multiplicador da necessidade diária (MER) sobre o RER. */
export function merFactor(pet: Pet) {
	const age = petAgeYears(pet);
	if (age != null && age < KITTEN_MAX_AGE_YEARS) return merFactors.kitten;
	if (pet.bodyCondition === 'overweight') return merFactors.overweight;
	if (pet.bodyCondition === 'thin') return merFactors.thin;
	if (age != null && age >= SENIOR_MIN_AGE_YEARS) return merFactors.senior;
	return pet.neutered ? merFactors.neutered : merFactors.intact;
}

export function restingKcal(pet: Pet) {
	return RER_FACTOR * pet.weightKg ** RER_EXPONENT;
}

export function targetKcal(pet: Pet) {
	return restingKcal(pet) * merFactor(pet);
}

export function foodKcalPerKg(pet: Pet) {
	return pet.foodKcalPerKg ?? defaultKcalPerKgByDiet[pet.diet];
}

export function targetFoodGrams(pet: Pet) {
	return targetKcal(pet) / (foodKcalPerKg(pet) / 1000);
}

export function waterTargetMl(pet: Pet) {
	const range = waterBowlRangeByDiet[pet.diet];
	return { min: range.min * pet.weightKg, max: range.max * pet.weightKg };
}

// ── Utilitários ─────────────────────────────────────────────────────────

const mean = (values: number[]) =>
	values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

const round = (value: number | null, digits = 0) => {
	if (value == null) return null;
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
};

const formatPct = (ratio: number) => `${Math.round(Math.abs(ratio) * 100)}%`;

const formatDecimal = (value: number) =>
	value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Separa os últimos dias completos (avaliados) da linha de base anterior. */
function splitWindows(
	stats: DailyCatStats[],
	hasData: (day: DailyCatStats) => boolean,
) {
	const complete = stats.filter((day) => day.complete && hasData(day));
	return {
		evaluated: complete.slice(-ASSESSMENT_DAYS),
		baseline: complete.slice(0, -ASSESSMENT_DAYS),
		today: stats.find((day) => !day.complete && hasData(day)) ?? null,
	};
}

function trendOf(evaluated: number | null, baseline: number[]) {
	const base = mean(baseline);
	if (evaluated == null || base == null || base <= 0) return null;
	if (baseline.length < MIN_BASELINE_DAYS) return null;
	return (evaluated - base) / base;
}

/** 100 dentro da faixa; cai proporcionalmente ao desvio fora dela. */
function scoreInRange(value: number, min: number, max: number) {
	if (value >= min && value <= max) return 100;
	const deviation = value < min ? (min - value) / min : (value - max) / max;
	return Math.max(0, Math.round(100 - deviation * 150));
}

function finalize(
	area: HealthArea,
	partial: Omit<AreaAssessment, 'area' | 'status' | 'tips'> & {
		flags: HealthStatus[];
	},
): AreaAssessment {
	const { flags, ...rest } = partial;
	// Sem dados, não há o que avaliar: "insuficiente" vence qualquer outro sinal.
	// (Antes ele perdia para o 'ok' inicial e a área aparecia como saudável sem dado nenhum.)
	const status = flags.includes('insufficient')
		? 'insufficient'
		: worstStatus(flags, 'ok');

	let score = rest.score;
	if (score != null && status === 'attention')
		score = Math.min(score, ATTENTION_SCORE_CAP);
	if (score != null && status === 'alert')
		score = Math.min(score, ALERT_SCORE_CAP);

	return {
		...rest,
		area,
		status,
		score,
		// Área saudável: só as duas dicas principais para manter o hábito
		tips: status === 'ok' ? tips[area].slice(0, 2) : tips[area],
	};
}

function insufficient(area: HealthArea, unit: string, reason: string) {
	return finalize(area, {
		score: null,
		value: null,
		unit,
		target: null,
		trendPct: null,
		today: null,
		reasons: [reason],
		flags: ['insufficient'],
	});
}

function applyTrend(
	trend: number | null,
	labels: { up: string; down: string },
	reasons: string[],
	flags: HealthStatus[],
) {
	if (trend == null) return 0;
	if (trend >= TREND_UP_ATTENTION) {
		reasons.push(
			`${formatPct(trend)} acima da média dos dias anteriores. ${labels.up}`,
		);
		flags.push('attention');
		return 20;
	}
	if (trend <= TREND_DOWN_ATTENTION) {
		reasons.push(
			`${formatPct(trend)} abaixo da média dos dias anteriores. ${labels.down}`,
		);
		flags.push('attention');
		return 20;
	}
	return 0;
}

// ── Áreas ───────────────────────────────────────────────────────────────

export function assessWater(stats: DailyCatStats[], pet: Pet | null) {
	const { evaluated, baseline, today } = splitWindows(
		stats,
		(d) => d.water.hasData,
	);
	const useMl =
		evaluated.length > 0 && evaluated.every((d) => d.water.ml != null);
	const unit = useMl ? 'ml/dia' : '% do pote/dia';
	const valueOf = (d: DailyCatStats) =>
		useMl ? (d.water.ml ?? 0) : d.water.pct;

	if (!evaluated.length) {
		return insufficient(
			'water',
			unit,
			stats.some((d) => d.water.binary)
				? 'O sensor do pote de água só detecta se há água ou não, então não dá para medir quanto o gato bebe.'
				: 'Ainda não há um dia completo de leituras do pote de água.',
		);
	}

	const value = mean(evaluated.map(valueOf))!;
	const trend = trendOf(value, baseline.map(valueOf));
	const target = useMl && pet ? waterTargetMl(pet) : null;
	const reasons: string[] = [];
	const flags: HealthStatus[] = [];
	let score = 85;

	const emptyDays = evaluated.filter((d) => valueOf(d) === 0).length;
	if (emptyDays) {
		reasons.push(
			`Nenhum consumo de água registrado em ${emptyDays} dia(s). Confira se o pote estava cheio e o sensor ligado.`,
		);
		flags.push('attention');
	}

	if (target && pet) {
		const perKg = value / pet.weightKg;
		score = scoreInRange(value, target.min, target.max);
		if (perKg > POLYDIPSIA_ML_PER_KG) {
			reasons.push(
				`Bebendo ${Math.round(perKg)} ml/kg/dia, acima de ${POLYDIPSIA_ML_PER_KG}: é sede excessiva (polidipsia), comum em doença renal, diabetes e hipertireoidismo. Procure o veterinário.`,
			);
			flags.push('alert');
		} else if (value > target.max) {
			reasons.push(
				`Bebendo mais que o esperado para ${dietLabels[pet.diet].toLowerCase()} (${Math.round(perKg)} ml/kg/dia). Observe se o volume continua subindo.`,
			);
			flags.push('attention');
		} else if (value < target.min) {
			reasons.push(
				`Bebendo menos que o esperado para ${dietLabels[pet.diet].toLowerCase()} (${Math.round(perKg)} ml/kg/dia). Pouca água aumenta o risco de cistite e cálculos urinários.`,
			);
			flags.push('attention');
		} else {
			reasons.push(
				`Consumo de ${Math.round(perKg)} ml/kg/dia, dentro do esperado para ${dietLabels[pet.diet].toLowerCase()}.`,
			);
		}
	}

	score -= applyTrend(
		trend,
		{
			up: 'Aumento de sede merece atenção se persistir.',
			down: 'Queda na ingestão pode indicar desidratação ou mal-estar.',
		},
		reasons,
		flags,
	);

	if (!flags.length && !target) {
		reasons.push('Consumo estável em relação aos dias anteriores.');
	}

	return finalize('water', {
		score: Math.max(0, score),
		value: round(value, useMl ? 0 : 1),
		unit,
		target: target && {
			min: Math.round(target.min),
			max: Math.round(target.max),
		},
		trendPct: round(trend, 2),
		today: today ? round(valueOf(today), useMl ? 0 : 1) : null,
		reasons,
		flags,
	});
}

export function assessFood(stats: DailyCatStats[], pet: Pet | null) {
	const { evaluated, baseline, today } = splitWindows(
		stats,
		(d) => d.food.hasData,
	);
	const useGrams =
		evaluated.length > 0 && evaluated.every((d) => d.food.g != null);
	const unit = useGrams ? 'g/dia' : '% do pote/dia';
	const valueOf = (d: DailyCatStats) =>
		useGrams ? (d.food.g ?? 0) : d.food.pct;

	if (!evaluated.length) {
		return insufficient(
			'food',
			unit,
			stats.some((d) => d.food.binary)
				? 'O sensor do pote de ração só detecta se há ração ou não, então não dá para medir quanto o gato come.'
				: 'Ainda não há um dia completo de leituras do pote de ração.',
		);
	}

	const value = mean(evaluated.map(valueOf))!;
	const trend = trendOf(value, baseline.map(valueOf));
	const goal = useGrams && pet ? targetFoodGrams(pet) : null;
	const target = goal
		? { min: goal * FOOD_OK_RATIO.min, max: goal * FOOD_OK_RATIO.max }
		: null;
	const reasons: string[] = [];
	const flags: HealthStatus[] = [];
	let score = 85;

	const fastingDays = evaluated.filter((d) => valueOf(d) === 0).length;
	if (fastingDays) {
		reasons.push(
			`${fastingDays} dia(s) inteiro(s) sem consumo de ração. Gatos não podem ficar em jejum: mais de 24 h sem comer já exige o veterinário (risco de lipidose hepática). Confira também se o pote não ficou vazio.`,
		);
		flags.push('alert');
	}

	if (goal && target) {
		const ratio = value / goal;
		score = scoreInRange(value, target.min, target.max);
		if (ratio < FOOD_ATTENTION_RATIO.min) {
			reasons.push(
				`Comendo ${formatPct(ratio)} da meta diária (~${Math.round(goal)} g). Perda de apetite costuma ser o primeiro sinal de doença em gatos.`,
			);
			flags.push('attention');
		} else if (ratio > FOOD_ATTENTION_RATIO.max) {
			reasons.push(
				`Comendo ${formatPct(ratio)} da meta diária (~${Math.round(goal)} g). Excesso leva a obesidade, diabetes e artrose. Considere porções medidas.`,
			);
			flags.push('attention');
		} else if (ratio < FOOD_OK_RATIO.min || ratio > FOOD_OK_RATIO.max) {
			reasons.push(
				`Comendo ${formatPct(ratio)} da meta diária (~${Math.round(goal)} g), um pouco fora da faixa ideal.`,
			);
		} else {
			reasons.push(
				`Comendo ${formatPct(ratio)} da meta diária (~${Math.round(goal)} g).`,
			);
		}
	}

	score -= applyTrend(
		trend,
		{
			up: 'Fome aumentada pode indicar hipertireoidismo ou diabetes se vier com perda de peso.',
			down: 'Apetite em queda é sinal precoce de dor, estresse ou doença.',
		},
		reasons,
		flags,
	);

	if (!flags.length && !goal) {
		reasons.push('Apetite estável em relação aos dias anteriores.');
	}

	return finalize('food', {
		score: Math.max(0, score),
		value: round(value, useGrams ? 0 : 1),
		unit,
		target: target && {
			min: Math.round(target.min),
			max: Math.round(target.max),
		},
		trendPct: round(trend, 2),
		today: today ? round(valueOf(today), useGrams ? 0 : 1) : null,
		reasons,
		flags,
	});
}

export function assessLitter(stats: DailyCatStats[]) {
	const { evaluated, baseline, today } = splitWindows(
		stats,
		(d) => d.litter.hasData,
	);
	const unit = 'visitas/dia';

	if (!evaluated.length) {
		return insufficient(
			'litter',
			unit,
			'Ainda não há um dia completo com o sensor da caixa de areia.',
		);
	}

	const visits = evaluated.map((d) => d.litter.visits);
	const value = mean(visits)!;
	const trend = trendOf(
		value,
		baseline.map((d) => d.litter.visits),
	);
	const durations = evaluated
		.map((d) => d.litter.avgDurationSec)
		.filter((v): v is number => v != null);
	const avgDuration = mean(durations);
	const reasons: string[] = [];
	const flags: HealthStatus[] = [];
	let score = scoreInRange(
		value,
		LITTER_VISITS_RANGE.min,
		LITTER_VISITS_RANGE.max,
	);

	const emptyDays = visits.filter((v) => v === 0).length;
	if (emptyDays) {
		reasons.push(
			`Nenhuma visita registrada em ${emptyDays} dia(s) inteiro(s). Se o sensor estava ligado, é emergência: pode ser obstrução urinária (principalmente em machos). Procure o veterinário imediatamente.`,
		);
		flags.push('alert');
	}

	if (value > LITTER_VISITS_HIGH) {
		reasons.push(
			`Média de ${formatDecimal(value)} visitas/dia, acima de ${LITTER_VISITS_HIGH}: pode ser cistite, infecção urinária ou aumento do volume de urina.`,
		);
		flags.push('attention');
	} else if (value > LITTER_VISITS_RANGE.max) {
		reasons.push(
			`Média de ${formatDecimal(value)} visitas/dia, um pouco acima do habitual (3–6).`,
		);
	} else if (value > 0 && value < LITTER_VISITS_RANGE.min) {
		reasons.push(
			`Média de ${formatDecimal(value)} visitas/dia, abaixo do habitual (3–6). Pode estar segurando (caixa suja, estresse) ou bebendo pouco.`,
		);
		flags.push('attention');
	} else if (value > 0) {
		reasons.push(
			`Média de ${formatDecimal(value)} visitas/dia, dentro do habitual (3–6).`,
		);
	}

	if (avgDuration != null && avgDuration > LITTER_LONG_VISIT_SEC) {
		reasons.push(
			`Permanência média de ${Math.round(avgDuration / 60)} min por visita: pode indicar esforço para urinar ou evacuar (constipação, cistite). Observe se ele chora ou sai sem fazer.`,
		);
		flags.push('attention');
		score -= 15;
	}

	score -= applyTrend(
		trend,
		{
			up: 'Mais idas à caixa, junto com mais sede, sugerem aumento de urina.',
			down: 'Menos idas podem indicar desidratação ou que ele está evitando a caixa.',
		},
		reasons,
		flags,
	);

	return finalize('litter', {
		score: Math.max(0, score),
		value: round(value, 1),
		unit,
		target: LITTER_VISITS_RANGE,
		trendPct: round(trend, 2),
		today: today ? today.litter.visits : null,
		reasons,
		flags,
	});
}

export function assessVocal(stats: DailyCatStats[], pet: Pet | null) {
	const { evaluated, baseline, today } = splitWindows(
		stats,
		(d) => d.vocal.hasData,
	);
	const unit = 'sons/dia';

	if (!evaluated.length) {
		return insufficient(
			'vocal',
			unit,
			'Ainda não há um dia completo de dados do microfone.',
		);
	}

	const avgKind = (days: DailyCatStats[], kind: VocalizationKind) =>
		mean(days.map((d) => d.vocal.byKind[kind])) ?? 0;
	const byKind = Object.fromEntries(
		vocalizationKindList.map((kind) => [
			kind,
			round(avgKind(evaluated, kind), 1),
		]),
	) as Record<VocalizationKind, number>;
	const kindTrend = Object.fromEntries(
		vocalizationKindList.map((kind) => [
			kind,
			round(
				trendOf(
					avgKind(evaluated, kind),
					baseline.map((d) => d.vocal.byKind[kind]),
				),
				2,
			),
		]),
	) as Record<VocalizationKind, number | null>;

	const value = mean(evaluated.map((d) => d.vocal.total))!;
	const night = mean(evaluated.map((d) => d.vocal.night))!;
	const trend = trendOf(
		value,
		baseline.map((d) => d.vocal.total),
	);
	const nightTrend = trendOf(
		night,
		baseline.map((d) => d.vocal.night),
	);
	const age = pet ? petAgeYears(pet) : null;
	const reasons: string[] = [];
	const flags: HealthStatus[] = [];

	const distress = distressKinds.reduce((sum, kind) => sum + byKind[kind], 0);
	let score = value > 0 ? Math.round(100 - (distress / value) * 150) : 85;

	if (value === 0) {
		reasons.push(
			'Nenhum som registrado nos últimos dias. Confira se o microfone está ligado e perto de onde o gato costuma ficar.',
		);
	}

	// Uivos
	const yowlTrend = kindTrend.yowl;
	if (
		byKind.yowl >= YOWL_PER_DAY_ATTENTION ||
		(yowlTrend != null &&
			yowlTrend >= VOCAL_KIND_TREND_ATTENTION &&
			byKind.yowl >= 1)
	) {
		let context = 'Pode indicar dor, desconforto ou estresse.';
		if (age != null && age >= VOCAL_SENIOR_AGE_YEARS) {
			context =
				'Em gato idoso, hipertireoidismo, pressão alta e disfunção cognitiva são causas comuns e tratáveis: vale uma consulta.';
		} else if (pet && !pet.neutered) {
			context = 'Como o gato não é castrado, pode ser cio.';
		}
		reasons.push(
			`Média de ${formatDecimal(byKind.yowl)} uivo(s)/dia${yowlTrend != null && yowlTrend > 0 ? ` (${formatPct(yowlTrend)} acima do normal)` : ''}. ${context}`,
		);
		flags.push('attention');
	}

	// Madrugada
	if (
		night >= NIGHT_MIN_PER_DAY &&
		value > 0 &&
		night / value >= NIGHT_SHARE_ATTENTION
	) {
		reasons.push(
			`${formatPct(night / value)} dos sons acontecem de madrugada (22h–6h). Vocalização noturna é comum em gatos idosos com disfunção cognitiva ou hipertireoidismo, e em gatos entediados.`,
		);
		flags.push('attention');
	}

	// Sibilos / rosnados
	const defensiveTrend = kindTrend.defensive;
	if (
		byKind.defensive >= DEFENSIVE_PER_DAY_ATTENTION ||
		(defensiveTrend != null &&
			defensiveTrend >= VOCAL_KIND_TREND_ATTENTION &&
			byKind.defensive >= 1)
	) {
		reasons.push(
			`Média de ${formatDecimal(byKind.defensive)} sibilo(s)/rosnado(s) por dia: sinal de medo, conflito com outros animais ou dor ao ser tocado.`,
		);
		flags.push('attention');
	}

	// Total contra a linha de base
	if (trend != null && trend >= VOCAL_TOTAL_TREND_UP) {
		reasons.push(
			`Vocalizando ${formatPct(trend)} mais que o normal. Mudança brusca de comportamento merece observação.`,
		);
		flags.push('attention');
		score -= 20;
	} else if (trend != null && trend <= VOCAL_TOTAL_TREND_DOWN) {
		reasons.push(
			`Bem mais quieto que o normal (${formatPct(trend)} a menos). Gatos com dor ou doentes costumam se isolar e ficar calados.`,
		);
		flags.push('attention');
		score -= 20;
	}

	// Pontos positivos e observações
	if (value > 0 && (byKind.greeting + byKind.trill) / value >= 0.5) {
		reasons.push(
			'A maioria dos sons é social (miados curtos e trinados): bom sinal de bem-estar e vínculo.',
		);
	}
	if (value > 0 && byKind.demand / value >= 0.4) {
		reasons.push(
			'Muitos miados de pedido. Horários fixos de refeição ajudam a reduzir.',
		);
	}
	if (!reasons.length) {
		reasons.push('Vocalização dentro do padrão do gato.');
	}

	return finalize('vocal', {
		score: Math.max(0, Math.min(100, score)),
		value: round(value, 1),
		unit,
		target: null,
		trendPct: round(trend, 2),
		today: today ? today.vocal.total : null,
		reasons,
		flags,
		breakdown: {
			byKind,
			night: round(night, 1)!,
			kindTrend,
			nightTrend: round(nightTrend, 2),
		},
	});
}

// ── Sinais cruzados ─────────────────────────────────────────────────────

const CROSS_TREND = 0.3;

export function assessCrossSignals(
	areas: Record<HealthArea, AreaAssessment>,
): CrossSignal[] {
	const signals: CrossSignal[] = [];
	const { water, food, litter, vocal } = areas;

	const drinksMore =
		(water.trendPct != null && water.trendPct >= CROSS_TREND) ||
		(water.target != null &&
			water.value != null &&
			water.value > water.target.max);
	const peesMore =
		(litter.trendPct != null && litter.trendPct >= CROSS_TREND) ||
		(litter.value != null && litter.value > LITTER_VISITS_RANGE.max);

	if (drinksMore && peesMore) {
		signals.push({
			status: 'alert',
			title: 'Bebendo e urinando mais',
			description:
				'Sede e idas à caixa aumentaram juntas (poliúria + polidipsia). É o sinal clássico de doença renal crônica, diabetes ou hipertireoidismo, comuns em gatos acima de 7 anos. Peça ao veterinário exames de sangue e urina.',
		});
	}

	const eatsLess = food.trendPct != null && food.trendPct <= -CROSS_TREND;
	const drinksLess = water.trendPct != null && water.trendPct <= -CROSS_TREND;
	if (eatsLess && drinksLess) {
		signals.push({
			status: 'attention',
			title: 'Comendo e bebendo menos',
			description:
				'Apetite e sede caíram ao mesmo tempo. Pode ser dor, febre, problema dentário ou estresse. Se durar mais de 1–2 dias, leve ao veterinário.',
		});
	}

	const vocalTrend = vocal.breakdown?.kindTrend;
	const eatsMore =
		(food.trendPct != null && food.trendPct >= CROSS_TREND) ||
		(food.target != null &&
			food.value != null &&
			food.value > food.target.max);
	if (vocalTrend?.demand != null && vocalTrend.demand >= 0.5 && eatsMore) {
		signals.push({
			status: 'attention',
			title: 'Pedindo e comendo mais',
			description:
				'Os miados de pedido e o consumo de ração aumentaram juntos. Fome exagerada, principalmente com perda de peso, é sinal de hipertireoidismo ou diabetes. Pese o gato e converse com o veterinário.',
		});
	}

	const yowlsMore =
		vocal.breakdown != null &&
		vocal.breakdown.byKind.yowl >= 1 &&
		((vocalTrend?.yowl != null && vocalTrend.yowl >= 0.5) ||
			(vocal.breakdown.nightTrend != null &&
				vocal.breakdown.nightTrend >= 0.5));
	if (yowlsMore && drinksMore) {
		signals.push({
			status: 'attention',
			title: 'Uivando e bebendo mais',
			description:
				'Uivos (sobretudo noturnos) e sede aumentaram juntos. A combinação aparece no hipertireoidismo, na pressão alta e na doença renal, comuns em gatos idosos. Peça exames de sangue, tireoide e pressão.',
		});
	}

	const quieter =
		vocal.trendPct != null && vocal.trendPct <= VOCAL_TOTAL_TREND_DOWN;
	if (quieter && eatsLess) {
		signals.push({
			status: 'attention',
			title: 'Mais quieto e comendo menos',
			description:
				'O gato está vocalizando bem menos e comendo menos. Isolamento e falta de apetite são sinais comuns de dor ou doença. Se durar mais de 1–2 dias, leve ao veterinário.',
		});
	}

	return signals;
}

// ── Avaliação completa ──────────────────────────────────────────────────

/**
 * `activeAreas`: áreas que têm sensor cadastrado. As outras são calculadas (ficam
 * "insuficientes"), mas não entram no status nem na nota geral.
 */
export function assessHealth(
	stats: DailyCatStats[],
	pet: Pet | null,
	activeAreas: HealthArea[],
): HealthAssessment {
	const areas = {
		water: assessWater(stats, pet),
		food: assessFood(stats, pet),
		litter: assessLitter(stats),
		vocal: assessVocal(stats, pet),
	};
	const crossSignals = assessCrossSignals(areas);

	const active = activeAreas.map((area) => areas[area]);
	const evaluated = active.filter((a) => a.status !== 'insufficient');
	// Nenhuma área com dados: o geral também é "coletando dados"
	const worst =
		evaluated.length === 0
			? 'insufficient'
			: worstStatus(
					[
						...evaluated.map((a) => a.status),
						...crossSignals.map((s) => s.status),
					],
					'ok',
				);

	const scores = active
		.map((a) => a.score)
		.filter((s): s is number => s != null);
	let score = scores.length ? Math.round(mean(scores)!) : null;
	if (score != null && worst === 'attention')
		score = Math.min(score, ATTENTION_SCORE_CAP);
	if (score != null && worst === 'alert') score = Math.min(score, 40);

	const missing: string[] = [];
	if (!pet) {
		missing.push(
			'Cadastre o gato (peso, idade e dieta) para comparar o consumo com as metas veterinárias.',
		);
	}
	const lastDays = stats.filter((d) => d.complete).slice(-ASSESSMENT_DAYS);
	if (lastDays.some((d) => d.water.hasData && d.water.ml == null)) {
		missing.push(
			'Informe a capacidade do pote de água (em ml) para medir o consumo em mililitros.',
		);
	}
	if (lastDays.some((d) => d.food.hasData && d.food.g == null)) {
		missing.push(
			'Informe a capacidade do pote de ração (em g) para medir o consumo em gramas.',
		);
	}

	return { overall: { status: worst, score }, areas, crossSignals, missing };
}
