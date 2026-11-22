import { AppPage } from '@/components/Layout/AppPage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardCard } from '@/components/ui/dashboard-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { LevelHistoryChart } from '../components/levelHistoryChart';
import { SignalChainCard } from '../components/signalChainCard';
import { WaveformScope } from '../components/waveformScope';
import { useGetMicMonitor } from '../composables/useGetMicMonitor';
import type { MicFrame } from '../types/monitor';

/** Frase curta dizendo o que o sinal indica (ajuda a achar problema de ligação ou ganho). */
function diagnose(frame: MicFrame | null, online: boolean) {
	if (!online || !frame) {
		return {
			tone: 'warning' as const,
			text: 'A placa ainda não mandou dados do sinal. Na primeira vez leva uns 3 segundos; se não aparecer, confira se ela está online e com o firmware que tem o monitor.',
		};
	}
	const span = frame.rawMax - frame.rawMin;
	if (frame.rawMax >= 4090 || frame.rawMin <= 5) {
		return {
			tone: 'warning' as const,
			text: 'O sinal está saturando o ADC (encostando em 0 ou 4095). O som está forte demais para essa entrada ou há algo errado na ligação.',
		};
	}
	if (span < 6) {
		return {
			tone: 'warning' as const,
			text: `Quase nenhuma variação no ADC (${span} contagens de pico a pico). O pino AO pode estar solto ou fora do GPIO34, ou o módulo está sem alimentação.`,
		};
	}
	if (frame.loud) {
		return {
			tone: 'good' as const,
			text: 'Som detectado agora. Se durar 150 ms ou mais, vira uma leitura.',
		};
	}
	const margin = frame.thresholdDb - frame.rmsDb;
	return {
		tone: 'neutral' as const,
		text: `Silêncio. Para contar como som, o volume precisa subir mais ${margin.toFixed(1)} dB (hoje ${frame.rmsDb.toFixed(1)} dB; o limite é ${frame.thresholdDb.toFixed(1)} dB).`,
	};
}

const toneClass = {
	good: 'border-g-300 bg-g-50 text-g-700',
	warning: 'border-(--y-400) bg-y-100 text-y-700',
	neutral: 'border-n-40 bg-n-10 text-ink-secondary',
};

export function MicMonitorPage() {
	const { deviceId } = useParams<{ deviceId: string }>();
	const { data: devices, isLoading } = useGetDevices();
	const device = devices?.find((d) => d._id === deviceId) ?? null;
	const [paused, setPaused] = React.useState(false);
	const [auto, setAuto] = React.useState(true);

	const { data: monitor } = useGetMicMonitor({
		sensorKey: device?.type === 'microphone' ? device.sensorKey : null,
		paused,
	});

	if (isLoading) {
		return (
			<AppPage title="Monitor do microfone">
				<Skeleton className="h-64 w-full" />
			</AppPage>
		);
	}

	if (!device || device.type !== 'microphone') {
		return (
			<AppPage
				title="Monitor do microfone"
				description="Esse sensor não existe ou não é um microfone."
				headerActions={<BackLink />}
			/>
		);
	}

	const frame = monitor?.latest ?? null;
	const online = monitor?.online ?? false;
	const diagnosis = diagnose(frame, online);

	return (
		<AppPage
			title="Monitor do microfone"
			description={`${device.name} · ${device.sensorKey}. Sinal ao vivo vindo da placa, antes e depois dos filtros.`}
			headerActions={
				<div className="flex items-center gap-2">
					<BackLink />
					<Button
						variant="outline"
						size="default"
						onClick={() => setPaused((p) => !p)}
					>
						{paused ? (
							<Play className="size-4" />
						) : (
							<Pause className="size-4" />
						)}
						{paused ? 'Continuar' : 'Pausar'}
					</Button>
				</div>
			}
		>
			<div className="flex flex-col gap-section">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={online ? 'green' : 'neutral'}>
						{paused ? 'Pausado' : online ? 'Ao vivo' : 'Sem sinal'}
					</Badge>
					<Badge variant={frame?.loud ? 'blue' : 'neutral'}>
						{frame?.loud ? 'Som detectado' : 'Silêncio'}
					</Badge>
					<Badge variant={frame?.doActive ? 'yellow' : 'outline'}>
						DO {frame?.doActive ? 'ativo' : 'inativo'}
					</Badge>
					<Badge variant="outline">
						{frame?.voiced && frame.f0Hz
							? `Tom ~${Math.round(frame.f0Hz)} Hz`
							: 'Sem tom'}
					</Badge>
					<label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
						<input
							type="checkbox"
							checked={auto}
							onChange={(e) => setAuto(e.target.checked)}
						/>
						Escala automática
					</label>
				</div>

				<p
					className={`rounded-lg border px-4 py-3 text-sm ${toneClass[diagnosis.tone]}`}
				>
					{diagnosis.text}
				</p>

				<div className="grid gap-4 xl:grid-cols-2">
					<DashboardCard
						title="Sinal bruto (ADC)"
						subtitle="Contagens do ADC antes do filtro. Janela de 25,6 ms (um quadro)."
						contentClassName="items-stretch"
					>
						<WaveformScope
							values={frame?.raw ?? []}
							fixedRange={[0, 4095]}
							auto={auto}
							minSpan={80}
							strokeClass="stroke-b-600"
						/>
					</DashboardCard>
					<DashboardCard
						title="Depois do filtro (sem nível DC)"
						subtitle="Mesmo trecho com o nível médio retirado: a onda centrada em zero."
						contentClassName="items-stretch"
					>
						<WaveformScope
							values={frame?.filtered ?? []}
							fixedRange={[-2048, 2048]}
							auto={auto}
							minSpan={60}
							zeroLine
							strokeClass="stroke-g-600"
						/>
					</DashboardCard>
				</div>

				<div className="grid gap-4 xl:grid-cols-2">
					<DashboardCard
						title="Volume × limite de disparo"
						subtitle="O som só vira leitura quando o volume passa do limite."
						contentClassName="items-stretch"
					>
						<LevelHistoryChart history={monitor?.history ?? []} />
					</DashboardCard>
					<SignalChainCard frame={frame} />
				</div>
			</div>
		</AppPage>
	);
}

function BackLink() {
	return (
		<Button variant="outline" asChild>
			<Link to="/dashboard">
				<ArrowLeft className="size-4" />
				Dashboard
			</Link>
		</Button>
	);
}
