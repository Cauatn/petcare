import type { MicHistoryPoint } from '../types/monitor';

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_Y = 12;

/**
 * Volume (dB) ao longo do tempo, com o ruído de fundo e o limite que o firmware usa
 * para decidir que algo é um som. As faixas azuis mostram quando ele decidiu que era som.
 */
export function LevelHistoryChart({ history }: { history: MicHistoryPoint[] }) {
	if (history.length < 2) {
		return (
			<div className="flex h-50 items-center justify-center rounded-lg border border-dashed border-n-40 text-sm text-ink-muted">
				Aguardando dados da placa…
			</div>
		);
	}

	const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
	const plotH = HEIGHT - PAD_Y * 2;
	const t0 = history[0].t;
	const t1 = history[history.length - 1].t;
	const span = Math.max(t1 - t0, 1);

	const all = history.flatMap((p) => [p.rmsDb, p.noiseDb, p.thresholdDb]);
	const lo = Math.floor(Math.min(...all) - 3);
	const hi = Math.max(Math.ceil(Math.max(...all) + 3), lo + 20);

	const toX = (t: number) => PAD_LEFT + ((t - t0) / span) * plotW;
	const toY = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * plotH;
	const line = (pick: (p: MicHistoryPoint) => number) =>
		history
			.map((p) => `${toX(p.t).toFixed(1)},${toY(pick(p)).toFixed(1)}`)
			.join(' ');

	// Faixas onde o firmware decidiu "som"
	const bands: { x: number; w: number }[] = [];
	let start: number | null = null;
	history.forEach((p, i) => {
		if (p.loud && start === null) start = p.t;
		const next = history[i + 1];
		if (start !== null && (!p.loud || !next)) {
			bands.push({
				x: toX(start),
				w: Math.max(toX(p.t) - toX(start), 2),
			});
			start = null;
		}
	});

	const seconds = Math.round(span / 1000);

	return (
		<div className="w-full space-y-2">
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="h-auto w-full rounded-lg border border-n-30 bg-n-10"
				role="img"
				aria-label="Volume ao longo do tempo"
			>
				{[lo, (lo + hi) / 2, hi].map((g) => (
					<g key={g}>
						<line
							x1={PAD_LEFT}
							x2={WIDTH - PAD_RIGHT}
							y1={toY(g)}
							y2={toY(g)}
							className="stroke-n-40"
							strokeDasharray="3 4"
						/>
						<text
							x={PAD_LEFT - 6}
							y={toY(g) + 4}
							textAnchor="end"
							className="fill-ink-muted text-[11px]"
						>
							{Math.round(g)} dB
						</text>
					</g>
				))}
				{bands.map((b) => (
					<rect
						key={b.x}
						x={b.x}
						y={PAD_Y}
						width={b.w}
						height={plotH}
						className="fill-b-100"
						opacity={0.8}
					/>
				))}
				<polyline
					points={line((p) => p.thresholdDb)}
					fill="none"
					strokeWidth={1.4}
					strokeDasharray="5 4"
					className="stroke-r-500"
				/>
				<polyline
					points={line((p) => p.noiseDb)}
					fill="none"
					strokeWidth={1.4}
					strokeDasharray="2 3"
					className="stroke-n-500"
				/>
				<polyline
					points={line((p) => p.rmsDb)}
					fill="none"
					strokeWidth={1.8}
					strokeLinejoin="round"
					className="stroke-g-600"
				/>
			</svg>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
				<span className="flex items-center gap-1.5">
					<span className="h-0.5 w-4 bg-g-600" /> Volume
				</span>
				<span className="flex items-center gap-1.5">
					<span className="h-0.5 w-4 border-t-2 border-dashed border-(--r-500)" />{' '}
					Limite de disparo
				</span>
				<span className="flex items-center gap-1.5">
					<span className="h-0.5 w-4 border-t-2 border-dotted border-(--n-500)" />{' '}
					Ruído de fundo
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-3 rounded-sm bg-b-100" /> Som
					detectado
				</span>
				<span className="ml-auto">Últimos ~{seconds} s</span>
			</div>
		</div>
	);
}
