import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Lightbulb } from 'lucide-react';
import { healthAreaList } from '../constants/healthAreas';
import { areaLabels, tips } from '../constants/healthReferences';
import type {
	HealthAssessment,
	HealthStatus,
	HealthTip,
} from '../types/health';
import { HealthStatusBadge } from './healthStatusBadge';

const SEVERITY: Record<HealthStatus, number> = {
	alert: 0,
	attention: 1,
	insufficient: 2,
	ok: 3,
};

function TipList({ items }: { items: HealthTip[] }) {
	return (
		<ul className="flex flex-col gap-3">
			{items.map((tip) => (
				<li key={tip.title} className="flex gap-3">
					<Lightbulb className="mt-0.5 size-4 shrink-0 text-y-600" />
					<div className="flex flex-col gap-0.5">
						<span className="font-semibold text-n-700">
							{tip.title}
						</span>
						<span className="text-n-600">{tip.description}</span>
					</div>
				</li>
			))}
		</ul>
	);
}

/** Dicas por área, com as áreas que precisam de atenção primeiro e já abertas. */
export function HealthTips({ assessment }: { assessment: HealthAssessment }) {
	const ordered = [...healthAreaList].sort(
		(a, b) =>
			SEVERITY[assessment.areas[a].status] -
			SEVERITY[assessment.areas[b].status],
	);
	const openByDefault = ordered.filter((area) => {
		const status = assessment.areas[area].status;
		return status === 'alert' || status === 'attention';
	});

	return (
		<div className="flex flex-col gap-2 rounded-lg border border-n-30 bg-n-0 px-5 py-3">
			<span className="pt-2 text-base font-semibold text-n-700">
				Como melhorar
			</span>
			<Accordion type="multiple" defaultValue={openByDefault}>
				{ordered.map((area) => {
					const areaAssessment = assessment.areas[area];
					return (
						<AccordionItem
							key={area}
							value={area}
							className="border-n-30"
						>
							<AccordionTrigger className="items-center">
								<span className="flex flex-1 items-center gap-2">
									{areaLabels[area]}
									<HealthStatusBadge
										status={areaAssessment.status}
									/>
								</span>
							</AccordionTrigger>
							<AccordionContent>
								<TipList
									items={
										areaAssessment.status === 'insufficient'
											? tips[area]
											: areaAssessment.tips
									}
								/>
							</AccordionContent>
						</AccordionItem>
					);
				})}
				<AccordionItem value="general" className="border-n-30">
					<AccordionTrigger>Cuidados gerais</AccordionTrigger>
					<AccordionContent>
						<TipList items={tips.general} />
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
