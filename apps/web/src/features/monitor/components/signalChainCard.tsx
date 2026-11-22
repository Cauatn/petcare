import { DashboardCard } from '@/components/ui/dashboard-card';
import type { MicFrame } from '../types/monitor';

type Step = { title: string; detail: string; live?: string };

function buildSteps(frame: MicFrame | null): Step[] {
	return [
		{
			title: 'Microfone + LM393 (AO)',
			detail: 'Saída analógica sem amplificador, alimentada em 3,3 V.',
		},
		{
			title: 'ADC de 12 bits (GPIO34)',
			detail: 'Amostra o sinal a 20 kHz (0 a 4095 contagens).',
			live: frame
				? `${frame.rawMin} a ${frame.rawMax} contagens`
				: undefined,
		},
		{
			title: 'Decimação 2:1',
			detail: 'Média de pares de amostras: 10 kHz, quadros de 256 amostras (25,6 ms).',
		},
		{
			title: 'Filtro de nível DC',
			detail: 'Média móvel (~1,6 Hz) subtrai o nível médio e centra a onda em zero.',
			live: frame
				? `pico a pico: ${frame.rawMax - frame.rawMin} contagens`
				: undefined,
		},
		{
			title: 'Volume (RMS em dB)',
			detail: '20·log10 da energia do quadro. Escala relativa, sem calibração.',
			live: frame ? `${frame.rmsDb.toFixed(1)} dB` : undefined,
		},
		{
			title: 'Limite de disparo',
			detail: 'Ruído de fundo (média adaptativa) + 12 dB, ou o DO do módulo pulsando.',
			live: frame ? `${frame.thresholdDb.toFixed(1)} dB` : undefined,
		},
		{
			title: 'Evento de som',
			detail: 'Vale se durar 150 ms ou mais. Só então a leitura vai para o banco.',
			live: frame ? (frame.loud ? 'som agora' : 'silêncio') : undefined,
		},
	];
}

/** Explica, passo a passo, o caminho do sinal e mostra o valor de cada etapa agora. */
export function SignalChainCard({ frame }: { frame: MicFrame | null }) {
	const steps = buildSteps(frame);

	return (
		<DashboardCard
			title="Caminho do sinal"
			subtitle="O que o firmware faz com o som até virar uma leitura."
			contentClassName="items-stretch"
		>
			<ol className="space-y-3">
				{steps.map((step, index) => (
					<li key={step.title} className="flex gap-3">
						<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-b-100 text-xs font-bold text-b-600">
							{index + 1}
						</span>
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold text-ink-strong">
								{step.title}
								{step.live ? (
									<span className="ml-2 rounded-md bg-n-20 px-1.5 py-0.5 text-xs font-medium text-ink-secondary">
										{step.live}
									</span>
								) : null}
							</p>
							<p className="text-xs text-ink-muted">
								{step.detail}
							</p>
						</div>
					</li>
				))}
			</ol>
		</DashboardCard>
	);
}
