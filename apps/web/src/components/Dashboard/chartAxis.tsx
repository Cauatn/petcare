const DEFAULT_FONT = '10px Manrope, sans-serif';
const MAX_Y_AXIS_WIDTH = 220;
const LABEL_SUBLABEL_PATTERN = /^(.*) \(([^()]*)\)$/;

let measurementCanvasContext: CanvasRenderingContext2D | null | undefined;

export function measureTextWidth(text: string, font = DEFAULT_FONT): number {
	if (measurementCanvasContext === undefined) {
		measurementCanvasContext =
			typeof document !== 'undefined'
				? document.createElement('canvas').getContext('2d')
				: null;
	}

	if (!measurementCanvasContext) {
		return text.length * 6;
	}

	measurementCanvasContext.font = font;
	return measurementCanvasContext.measureText(text).width;
}

export function splitLabel(
	label: string,
): [main: string, sublabel: string | undefined] {
	const match = LABEL_SUBLABEL_PATTERN.exec(label);
	return match ? [match[1], `(${match[2]})`] : [label, undefined];
}

export function measureLabelWidth(label: string, font = DEFAULT_FONT): number {
	const [main, sublabel] = splitLabel(label);
	return Math.max(
		measureTextWidth(main, font),
		sublabel ? measureTextWidth(sublabel, font) : 0,
	);
}

export function calculateYAxisWidth<T>(
	data: T[] | undefined,
	dataKey: keyof T,
	font = DEFAULT_FONT,
	padding = 16,
	minWidth = 48,
	maxWidth = MAX_Y_AXIS_WIDTH,
): number {
	if (!data || data.length === 0) {
		return minWidth;
	}
	const longestLabelWidth = Math.max(
		0,
		...data.map((entry) => {
			const value = entry[dataKey];
			return typeof value === 'string'
				? measureLabelWidth(value, font)
				: 0;
		}),
	);
	return Math.min(maxWidth, Math.max(minWidth, longestLabelWidth + padding));
}

export function truncateText(
	text: string,
	maxWidth: number,
	font = DEFAULT_FONT,
): string {
	if (measureTextWidth(text, font) <= maxWidth) {
		return text;
	}
	let truncated = text;
	while (
		truncated.length > 0 &&
		measureTextWidth(truncated + '...', font) > maxWidth
	) {
		truncated = truncated.slice(0, -1);
	}
	return truncated + '...';
}

export type CategoryTickProps = {
	x?: number;
	y?: number;
	payload?: { value: string };
	maxWidth?: number;
	font?: string;
};

export function CategoryTick({
	x = 0,
	y = 0,
	payload,
	maxWidth = 204, // Margem padrão (220 - 16)
	font = DEFAULT_FONT,
}: CategoryTickProps) {
	const labelValue = payload?.value ?? '';
	const [main, sublabel] = splitLabel(labelValue);
	const truncatedMain = truncateText(main, maxWidth, font);

	if (!sublabel) {
		return (
			<text
				x={x}
				y={y}
				dy={4}
				textAnchor="end"
				fontSize={10}
				fill="var(--n-600)"
			>
				{truncatedMain}
			</text>
		);
	}

	const truncatedSublabel = truncateText(sublabel, maxWidth, font);

	return (
		<text x={x} y={y} textAnchor="end" fontSize={10} fill="var(--n-600)">
			<tspan x={x} dy={-2}>
				{truncatedMain}
			</tspan>
			<tspan x={x} dy={12}>
				{truncatedSublabel}
			</tspan>
		</text>
	);
}
