import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { ExternalLink } from 'lucide-react';
import {
	ASSESSMENT_DAYS,
	LITTER_LONG_VISIT_SEC,
	LITTER_VISITS_HIGH,
	LITTER_VISITS_RANGE,
	POLYDIPSIA_ML_PER_KG,
	healthSources,
	waterBowlRangeByDiet,
} from '../constants/healthReferences';
import type { Pet } from '../types/health';
import {
	foodKcalPerKg,
	merFactor,
	restingKcal,
	targetFoodGrams,
	targetKcal,
	waterTargetMl,
} from '../utils/assessHealth';

function PetTargets({ pet }: { pet: Pet }) {
	const water = waterTargetMl(pet);
	return (
		<div className="grid gap-2 rounded-item bg-n-20 p-3 text-n-700 sm:grid-cols-3">
			<div className="flex flex-col">
				<span className="text-xs text-n-500">Água do pote</span>
				<span className="font-semibold">
					{Math.round(water.min)}–{Math.round(water.max)} ml/dia
				</span>
			</div>
			<div className="flex flex-col">
				<span className="text-xs text-n-500">Energia</span>
				<span className="font-semibold">
					{Math.round(targetKcal(pet))} kcal/dia
				</span>
				<span className="text-xs text-n-500">
					RER {Math.round(restingKcal(pet))} × {merFactor(pet)}
				</span>
			</div>
			<div className="flex flex-col">
				<span className="text-xs text-n-500">Ração</span>
				<span className="font-semibold">
					~{Math.round(targetFoodGrams(pet))} g/dia
				</span>
				<span className="text-xs text-n-500">
					a {foodKcalPerKg(pet).toLocaleString('pt-BR')} kcal/kg
				</span>
			</div>
		</div>
	);
}

export function HowWeCalculate({ pet }: { pet: Pet | null | undefined }) {
	return (
		<div className="flex flex-col gap-2 rounded-xl border border-n-30 bg-n-0 px-5 py-3 shadow-xs">
			<Accordion type="single" collapsible>
				<AccordionItem value="method" className="border-n-30">
					<AccordionTrigger className="text-base font-semibold text-n-700">
						Como calculamos
					</AccordionTrigger>
					<AccordionContent className="flex flex-col gap-4 text-n-600">
						{pet ? <PetTargets pet={pet} /> : null}
						<p>
							<strong className="text-n-700">Consumo.</strong> Os
							potes informam o nível em %. Somamos cada queda do
							nível e ignoramos as subidas (reabastecimento); a
							capacidade do pote converte % em ml ou g. Evaporação
							e comida derrubada entram na conta, então trate como
							estimativa.
						</p>
						<p>
							<strong className="text-n-700">Avaliação.</strong>{' '}
							Usamos a média dos últimos {ASSESSMENT_DAYS} dias
							completos e comparamos com (1) faixas veterinárias e
							(2) a média do próprio gato nos dias anteriores.
							Mudanças bruscas em relação ao padrão do gato
							costumam ser o sinal mais precoce.
						</p>
						<ul className="flex list-disc flex-col gap-1.5 pl-5">
							<li>
								<strong className="text-n-700">Água:</strong>{' '}
								gatos precisam de ~50 ml/kg/dia somando água e
								alimento. Do pote, esperamos{' '}
								{waterBowlRangeByDiet.dry.min}–
								{waterBowlRangeByDiet.dry.max} ml/kg com ração
								seca, {waterBowlRangeByDiet.mixed.min}–
								{waterBowlRangeByDiet.mixed.max} com dieta mista
								e {waterBowlRangeByDiet.wet.min}–
								{waterBowlRangeByDiet.wet.max} com úmida (~80%
								de água). Acima de {POLYDIPSIA_ML_PER_KG}{' '}
								ml/kg/dia é sede excessiva.
							</li>
							<li>
								<strong className="text-n-700">Ração:</strong>{' '}
								energia de repouso RER = 70 × peso
								<sup>0,75</sup>, multiplicada por 1,2
								(castrado), 1,4 (não castrado), 2,5 (filhote),
								1,1 (idoso) ou 0,8 (acima do peso). Gramas =
								kcal ÷ densidade da ração. Ok entre 80% e 120%
								da meta; um dia inteiro sem comer é alerta.
							</li>
							<li>
								<strong className="text-n-700">
									Caixa de areia:
								</strong>{' '}
								{LITTER_VISITS_RANGE.min}–
								{LITTER_VISITS_RANGE.max} visitas por dia é o
								habitual (2–4 de urina, 1–2 de fezes). Acima de{' '}
								{LITTER_VISITS_HIGH}, permanência média acima de{' '}
								{LITTER_LONG_VISIT_SEC / 60} min ou um dia sem
								visitas merecem atenção.
							</li>
							<li>
								<strong className="text-n-700">
									Vocalização:
								</strong>{' '}
								o ESP32 mede duração, tom, se o tom sobe ou
								desce, se o som é tonal ou chiado e quantas
								rajadas tem; a API classifica em miado curto,
								miado longo, trinado, uivo, sibilo/rosnado ou
								tagarelar. Não há norma de quantidade: avaliamos
								a proporção de uivos e sibilos, os sons de
								madrugada e mudanças em relação ao padrão do
								gato. O microfone (módulo LM393) mede volume
								relativo, alcança ~1 m e não capta ronronar.
							</li>
						</ul>
						<div className="flex flex-col gap-1.5">
							<span className="font-semibold text-n-700">
								Fontes
							</span>
							<ul className="flex flex-col gap-1">
								{healthSources.map((source) => (
									<li key={source.url}>
										<a
											href={source.url}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-start gap-1 text-b-600 hover:underline"
										>
											{source.label}
											<ExternalLink className="mt-1 size-3 shrink-0" />
										</a>
									</li>
								))}
							</ul>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
			<p className="pb-2 text-xs text-n-500">
				Estimativa baseada nos sensores: não substitui a avaliação de um
				médico-veterinário. Em caso de dúvida, leve o gato ao
				veterinário.
			</p>
		</div>
	);
}
