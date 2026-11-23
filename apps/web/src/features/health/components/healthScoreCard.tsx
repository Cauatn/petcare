import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Cat, Info, Pencil } from 'lucide-react';
import { bodyConditionLabels, dietLabels } from '../constants/healthReferences';
import { areaLabels } from '../constants/healthReferences';
import type { HealthArea, HealthAssessment, Pet } from '../types/health';
import { petAgeYears } from '../utils/assessHealth';
import { HealthStatusBadge, healthStatusMeta } from './healthStatusBadge';

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const overallSummary = {
	ok: 'Tudo o que já dá para avaliar está dentro do esperado.',
	attention:
		'Algum hábito saiu do padrão. Veja os detalhes abaixo e observe nos próximos dias.',
	alert: 'Há um sinal que merece avaliação veterinária. Veja os detalhes abaixo.',
	insufficient:
		'Ainda coletando dados. A avaliação aparece após o primeiro dia completo de leituras.',
} as const;

function ScoreRing({ score, color }: { score: number | null; color: string }) {
	const progress = score == null ? 0 : score / 100;
	return (
		<div className="relative size-32 shrink-0">
			<svg viewBox="0 0 120 120" className="size-full -rotate-90">
				<circle
					cx="60"
					cy="60"
					r={RING_RADIUS}
					fill="none"
					stroke="var(--n-30)"
					strokeWidth="10"
				/>
				<circle
					cx="60"
					cy="60"
					r={RING_RADIUS}
					fill="none"
					stroke={color}
					strokeWidth="10"
					strokeLinecap="round"
					strokeDasharray={RING_CIRCUMFERENCE}
					strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
					className="transition-[stroke-dashoffset] duration-500"
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className="text-3xl font-bold text-n-800">
					{score ?? '—'}
				</span>
				<span className="text-xs text-n-500">de 100</span>
			</div>
		</div>
	);
}

function formatAge(pet: Pet) {
	const age = petAgeYears(pet);
	if (age == null) return null;
	if (age < 1) return `${Math.max(1, Math.round(age * 12))} meses`;
	const years = Math.floor(age);
	return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

type HealthScoreCardProps = {
	assessment: HealthAssessment | undefined;
	pet: Pet | null | undefined;
	/** Áreas com sensor: mostra quantas já têm dados para avaliar. */
	activeAreas: HealthArea[];
	onEditPet: () => void;
};

export function HealthScoreCard({
	assessment,
	pet,
	activeAreas,
	onEditPet,
}: HealthScoreCardProps) {
	if (!assessment || pet === undefined) {
		return <Skeleton className="h-48 w-full rounded-lg" />;
	}

	const { overall, crossSignals, missing } = assessment;
	const evaluated = activeAreas.filter(
		(area) => assessment.areas[area].status !== 'insufficient',
	);
	const collecting = activeAreas.filter(
		(area) => assessment.areas[area].status === 'insufficient',
	);
	const meta = healthStatusMeta[overall.status];
	const petDetails = pet
		? [
				`${pet.weightKg.toLocaleString('pt-BR')} kg`,
				formatAge(pet),
				pet.neutered ? 'Castrado' : 'Não castrado',
				dietLabels[pet.diet],
				bodyConditionLabels[pet.bodyCondition],
			].filter(Boolean)
		: [];

	return (
		<div
			className="flex flex-col gap-5 rounded-xl border border-n-30 bg-n-0 p-5 shadow-xs"
			style={{
				// Brilho suave na cor do status, saindo de trás do anel
				backgroundImage: `radial-gradient(circle at 4rem 50%, color-mix(in oklab, ${meta.color} 14%, transparent), transparent 22rem)`,
			}}
		>
			<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
				<ScoreRing score={overall.score} color={meta.color} />
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-lg font-semibold text-n-800">
							{pet ? `Saúde de ${pet.name}` : 'Saúde do gato'}
						</span>
						<HealthStatusBadge status={overall.status} />
					</div>
					<p className="text-sm text-n-600">
						{overallSummary[overall.status]}
					</p>
					{evaluated.length > 0 && collecting.length > 0 ? (
						<p className="text-xs text-n-500">
							Avaliado:{' '}
							{evaluated.map((a) => areaLabels[a]).join(', ')}.
							Ainda coletando:{' '}
							{collecting.map((a) => areaLabels[a]).join(', ')}.
						</p>
					) : null}
					{pet ? (
						<div className="flex flex-wrap items-center gap-1.5 text-xs text-n-600">
							<Cat className="mr-0.5 size-4 text-n-400" />
							{petDetails.map((detail) => (
								<span
									key={detail}
									className="rounded-full border border-n-30 bg-n-0/80 px-2 py-0.5"
								>
									{detail}
								</span>
							))}
						</div>
					) : null}
				</div>
				<Button
					variant="outline"
					size="brand-sm"
					onClick={onEditPet}
					className="self-start"
				>
					<Pencil />
					{pet ? 'Editar perfil' : 'Cadastrar gato'}
				</Button>
			</div>

			{crossSignals.map((signal) => {
				const signalMeta = healthStatusMeta[signal.status];
				const Icon = signalMeta.icon;
				return (
					<div
						key={signal.title}
						className={cn(
							'flex gap-3 rounded-item p-3',
							signal.status === 'alert' ? 'bg-r-100' : 'bg-y-100',
						)}
					>
						<Icon
							className={cn(
								'mt-0.5 size-5 shrink-0',
								signalMeta.text,
							)}
						/>
						<div className="flex flex-col gap-0.5">
							<span
								className={cn(
									'text-sm font-semibold',
									signalMeta.text,
								)}
							>
								{signal.title}
							</span>
							<span className="text-sm text-n-700">
								{signal.description}
							</span>
						</div>
					</div>
				);
			})}

			{missing.length ? (
				<div className="flex gap-3 rounded-item bg-b-100 p-3">
					<Info className="mt-0.5 size-5 shrink-0 text-b-600" />
					<ul className="flex flex-col gap-1 text-sm text-b-600">
						{missing.map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}
