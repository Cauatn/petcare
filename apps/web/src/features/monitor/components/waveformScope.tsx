import { cn } from '@/lib/utils';

const WIDTH = 640;
const HEIGHT = 180;
const PAD_LEFT = 44;
const PAD_RIGHT = 8;
const PAD_Y = 10;

type WaveformScopeProps = {
	values: number[];
	/** Eixo vertical fixo. Em modo automático, ele só serve de referência. */
	fixedRange: [number, number];
	auto: boolean;
	/** Menor amplitude (em contagens) que a escala automática mostra, para o ruído não virar "onda". */
	minSpan: number;
	zeroLine?: boolean;
	strokeClass: string;
	emptyText?: string;
};

function niceRange(values: number[], minSpan: number): [number, number] {
	const min = Math.min(...values);
	const max = Math.max(...values);
	const mid = (min + max) / 2;
	const half = Math.max((max - min) / 2, minSpan / 2) * 1.15;
	return [mid - half, mid + half];
}

/** Osciloscópio simples em SVG: uma onda, grade e rótulos de amplitude. */
export function WaveformScope({
	values,
	fixedRange,
	auto,
	minSpan,
	zeroLine = false,
	strokeClass,
	emptyText = 'Aguardando dados da placa…',
}: WaveformScopeProps) {
	const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
	const plotH = HEIGHT - PAD_Y * 2;

	if (values.length < 2) {
		return (
			<div className="flex h-45 items-center justify-center rounded-lg border border-dashed border-n-40 text-sm text-ink-muted">
				{emptyText}
			</div>
		);
	}

	const [lo, hi] = auto ? niceRange(values, minSpan) : fixedRange;
	const toX = (i: number) => PAD_LEFT + (i / (values.length - 1)) * plotW;
	const toY = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo || 1)) * plotH;

	const points = values
		.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
		.join(' ');

	const gridValues = [lo, (lo + hi) / 2, hi];

	return (
		<svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			className="h-auto w-full rounded-lg border border-n-30 bg-n-10"
			role="img"
			aria-label="Forma de onda do sinal"
		>
			{gridValues.map((g) => (
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
						{Math.round(g)}
					</text>
				</g>
			))}
			{zeroLine && lo < 0 && hi > 0 ? (
				<line
					x1={PAD_LEFT}
					x2={WIDTH - PAD_RIGHT}
					y1={toY(0)}
					y2={toY(0)}
					className="stroke-n-500"
					strokeWidth={1}
				/>
			) : null}
			<polyline
				points={points}
				fill="none"
				strokeWidth={1.8}
				strokeLinejoin="round"
				className={cn(strokeClass)}
			/>
		</svg>
	);
}
