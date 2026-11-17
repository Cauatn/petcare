/**
 * Classificação dos sons do gato a partir das medidas que o ESP32 extrai do
 * microfone (módulo LM393 com saída analógica). Regras heurísticas baseadas
 * na literatura de acústica felina (Schötz et al., "Melody matters"; projeto
 * Meowsic; PMC6912413): duração, tom (f0), contorno do tom, tonalidade e
 * pulsos. Ajuste os limites aqui sem precisar regravar o firmware.
 */

export const vocalizationKinds = [
	'greeting',
	'demand',
	'trill',
	'yowl',
	'defensive',
	'chatter',
] as const;

export type VocalizationKind = (typeof vocalizationKinds)[number];

export type VocalizationFeatures = {
	/** Tom médio (frequência fundamental) nos trechos tonais, em Hz. */
	f0Hz?: number | null;
	f0StartHz?: number | null;
	f0EndHz?: number | null;
	/** Fração dos quadros com som tonal (0–1). Baixa = chiado/ruído. */
	voicedRatio?: number | null;
	/** Taxa de cruzamentos por zero por amostra (0–1), a 10 kHz. */
	zcr?: number | null;
	/** Quantidade de rajadas separadas por pausas curtas. */
	bursts?: number | null;
};

export type VocalizationInput = {
	durationMs: number;
	/** Volume relativo (20·log10 do RMS em contagens do ADC). */
	value: number;
	features?: VocalizationFeatures | null;
};

/** Sibilo: pouco tonal e cheio de agudos (ruído de banda larga). */
const NOISY_MAX_VOICED_RATIO = 0.3;
const NOISY_MIN_ZCR = 0.25;
/** Rosnado: tonal, grave e longo. */
const GROWL_MAX_F0_HZ = 250;
const GROWL_MIN_MS = 800;
/** Tagarelar: rajadas curtas em sequência. */
const CHATTER_MIN_BURSTS = 3;
const CHATTER_MAX_BURST_MS = 200;
/** Trinado: curto com o tom subindo. */
const TRILL_MAX_MS = 600;
const TRILL_MIN_SLOPE_HZ_PER_S = 300;
/** Uivo: longo e alto, ou com o tom variando muito. */
const YOWL_MIN_MS = 1500;
const YOWL_MIN_VOLUME = 50;
const YOWL_MIN_F0_RANGE_HZ = 250;
/** Miado longo (pedido). Abaixo disso é miado curto (cumprimento). */
const DEMAND_MIN_MS = 800;

const isNumber = (value: number | null | undefined): value is number =>
	typeof value === 'number' && Number.isFinite(value);

export function classifyVocalization({
	durationMs,
	value,
	features,
}: VocalizationInput): VocalizationKind {
	const f = features ?? {};
	const hasPitch = isNumber(f.voicedRatio) || isNumber(f.f0Hz);

	// 1) Sibilo / rosnado
	if (
		isNumber(f.voicedRatio) &&
		f.voicedRatio < NOISY_MAX_VOICED_RATIO &&
		isNumber(f.zcr) &&
		f.zcr >= NOISY_MIN_ZCR
	) {
		return 'defensive';
	}
	if (
		isNumber(f.f0Hz) &&
		f.f0Hz < GROWL_MAX_F0_HZ &&
		durationMs > GROWL_MIN_MS
	) {
		return 'defensive';
	}

	// 2) Tagarelar
	if (
		isNumber(f.bursts) &&
		f.bursts >= CHATTER_MIN_BURSTS &&
		durationMs / f.bursts < CHATTER_MAX_BURST_MS
	) {
		return 'chatter';
	}

	// 3) Trinado (precisa do contorno do tom)
	if (
		durationMs < TRILL_MAX_MS &&
		isNumber(f.f0StartHz) &&
		isNumber(f.f0EndHz)
	) {
		const slope = (f.f0EndHz - f.f0StartHz) / (durationMs / 1000);
		if (slope > TRILL_MIN_SLOPE_HZ_PER_S) return 'trill';
	}

	// 4) Uivo
	if (durationMs >= YOWL_MIN_MS) {
		// Só a saída digital (sem tom/volume confiável): a duração decide
		if (!hasPitch) return 'yowl';
		const f0Range =
			isNumber(f.f0StartHz) && isNumber(f.f0EndHz)
				? Math.abs(f.f0EndHz - f.f0StartHz)
				: 0;
		if (value >= YOWL_MIN_VOLUME || f0Range >= YOWL_MIN_F0_RANGE_HZ) {
			return 'yowl';
		}
	}

	// 5) Miado longo / 6) curto
	return durationMs >= DEMAND_MIN_MS ? 'demand' : 'greeting';
}
