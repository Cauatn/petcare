const MAX_DIGITS = 15;

type FormatNumericInputOptions = {
	decimals: number;
	minimumDecimals?: number;
	thousandsSeparator?: boolean;
};

export function formatNumericInput(
	value: number | undefined,
	{
		decimals,
		minimumDecimals = decimals,
		thousandsSeparator = true,
	}: FormatNumericInputOptions,
): string {
	if (value === undefined || !Number.isFinite(value)) return '';
	return value.toLocaleString('pt-BR', {
		minimumFractionDigits: minimumDecimals,
		maximumFractionDigits: decimals,
		useGrouping: thousandsSeparator,
	});
}

function digitsToNumber(digits: string, decimals: number): number | undefined {
	if (!digits) return undefined;
	return Number(digits) / 10 ** decimals;
}

type ParseTypedNumberOptions = {
	typed: string;
	previous: string;
	decimals: number;
	isDeleting?: boolean;
};

export function parseTypedNumber({
	typed,
	previous,
	decimals,
	isDeleting = typed.length < previous.length,
}: ParseTypedNumberOptions): number | undefined {
	const previousDigits = previous.replace(/\D/g, '');
	let digits = typed.replace(/\D/g, '');

	if (isDeleting && digits === previousDigits) digits = digits.slice(0, -1);

	digits = digits.replace(/^0+(?=\d)/, '');
	if (isDeleting && /^0*$/.test(digits)) return undefined;
	if (digits.length > MAX_DIGITS) digits = previousDigits;

	return digitsToNumber(digits, decimals);
}

function resolveDecimalSeparatorIndex(text: string): number {
	const lastComma = text.lastIndexOf(',');
	const lastDot = text.lastIndexOf('.');

	if (lastComma >= 0 && lastDot >= 0) return Math.max(lastComma, lastDot);
	if (lastComma >= 0) return text.indexOf(',') === lastComma ? lastComma : -1;
	if (lastDot < 0 || text.indexOf('.') !== lastDot) return -1;

	const digitsAfterDot = text.length - lastDot - 1;
	return digitsAfterDot === 3 ? -1 : lastDot;
}

export function parsePastedNumber(
	text: string,
	decimals: number,
): number | undefined {
	const cleaned = text.replace(/[^\d.,]/g, '');
	if (!/\d/.test(cleaned)) return undefined;

	const separatorIndex = resolveDecimalSeparatorIndex(cleaned);
	const integerDigits = (
		separatorIndex >= 0 ? cleaned.slice(0, separatorIndex) : cleaned
	).replace(/\D/g, '');
	const fractionDigits =
		separatorIndex >= 0
			? cleaned.slice(separatorIndex + 1).replace(/\D/g, '')
			: '';

	const keptFraction = fractionDigits
		.slice(0, decimals)
		.padEnd(decimals, '0');
	const roundsUp = Number(fractionDigits.charAt(decimals) || '0') >= 5;
	const scaled =
		Number(`${integerDigits}${keptFraction}`) + (roundsUp ? 1 : 0);
	return scaled / 10 ** decimals;
}

export type FreeDecimalInput = {
	text: string;
	value: number | undefined;
};

export function parseFreeDecimalTyped(
	typed: string,
	decimals: number,
): FreeDecimalInput {
	const cleaned = typed.replace(/[^\d.,]/g, '');
	if (!/\d|[.,]/.test(cleaned)) return { text: '', value: undefined };

	const separatorIndex = cleaned.search(/[.,]/);
	const hasSeparator = separatorIndex >= 0 && decimals > 0;
	const integerPart = (
		separatorIndex >= 0 ? cleaned.slice(0, separatorIndex) : cleaned
	)
		.replace(/\D/g, '')
		.replace(/^0+(?=\d)/, '')
		.slice(0, MAX_DIGITS);
	const fractionPart = hasSeparator
		? cleaned
				.slice(separatorIndex + 1)
				.replace(/\D/g, '')
				.slice(0, decimals)
		: '';
	const integerText = integerPart || '0';

	return {
		text: hasSeparator ? `${integerText},${fractionPart}` : integerText,
		value: Number(`${integerText}.${fractionPart || '0'}`),
	};
}
