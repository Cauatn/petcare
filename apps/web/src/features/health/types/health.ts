import type { VocalizationKind } from '@/features/devices/types/device';

export type PetDiet = 'dry' | 'wet' | 'mixed';
export type PetBodyCondition = 'thin' | 'ideal' | 'overweight';

/** Perfil do gato: peso, idade e dieta definem as metas de água e ração. */
export type Pet = {
	_id: string;
	name: string;
	weightKg: number;
	birthDate: string | null;
	neutered: boolean;
	diet: PetDiet;
	/** Energia da ração (rótulo da embalagem). `null` usa o padrão da dieta. */
	foodKcalPerKg: number | null;
	bodyCondition: PetBodyCondition;
	createdAt: string;
	updatedAt: string;
};

export type SavePetPayload = Omit<Pet, '_id' | 'createdAt' | 'updatedAt'>;

/** Consumo e visitas agregados por dia local (`GET /insights/daily`). */
export type DailyCatStats = {
	/** YYYY-MM-DD */
	date: string;
	/** `false` para hoje, que ainda está em andamento. */
	complete: boolean;
	water: { pct: number; ml: number | null; hasData: boolean };
	food: { pct: number; g: number | null; hasData: boolean };
	litter: {
		visits: number;
		avgDurationSec: number | null;
		maxDurationSec: number | null;
		hasData: boolean;
	};
	vocal: {
		total: number;
		byKind: Record<VocalizationKind, number>;
		/** Sons entre 22h e 6h. */
		night: number;
		avgDurationMs: number | null;
		hasData: boolean;
	};
};

export type DailyStatsParams = { days: number };

export type HealthArea = 'water' | 'food' | 'litter' | 'vocal';

export type HealthStatus = 'ok' | 'attention' | 'alert' | 'insufficient';

export type HealthTip = { title: string; description: string };

export type AreaAssessment = {
	area: HealthArea;
	status: HealthStatus;
	/** 0–100; `null` quando não há dados suficientes. */
	score: number | null;
	/** Média diária do período avaliado. */
	value: number | null;
	unit: string;
	/** Faixa-alvo; `null` sem perfil/capacidade. */
	target: { min: number; max: number } | null;
	/** Variação (%) contra a média do próprio gato nos dias anteriores. */
	trendPct: number | null;
	/** Valor parcial de hoje. */
	today: number | null;
	reasons: string[];
	tips: HealthTip[];
	/** Vocalização: média diária de cada tipo e de sons noturnos. */
	breakdown?: {
		byKind: Record<VocalizationKind, number>;
		night: number;
		/** Variação de cada tipo contra a média anterior. */
		kindTrend: Record<VocalizationKind, number | null>;
		nightTrend: number | null;
	};
};

export type CrossSignal = {
	status: Exclude<HealthStatus, 'ok' | 'insufficient'>;
	title: string;
	description: string;
};

export type HealthAssessment = {
	overall: { status: HealthStatus; score: number | null };
	areas: Record<HealthArea, AreaAssessment>;
	crossSignals: CrossSignal[];
	/** Avisos sobre dados faltando (perfil, capacidade). */
	missing: string[];
};
