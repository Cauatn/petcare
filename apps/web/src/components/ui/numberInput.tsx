import * as React from 'react';

import { Input } from '@/components/ui/input';
import {
	formatNumericInput,
	parseFreeDecimalTyped,
	parsePastedNumber,
	parseTypedNumber,
} from '@/features/core/utils/numericInput';

type NumberInputProps = Omit<
	React.ComponentProps<typeof Input>,
	'value' | 'onChange' | 'type' | 'inputMode'
> & {
	value: number | undefined;
	onChange: (value: number | undefined) => void;
	decimals?: number;
	thousandsSeparator?: boolean;
	//digits: os dígitos digitados preenchem as casas decimais (km/horímetro); freeDecimal: a vírgula ou ponto digitado é o separador decimal (litros, quantidades)
	entryMode?: 'digits' | 'freeDecimal';
};

function NumberInput({
	value,
	onChange,
	decimals = 0,
	thousandsSeparator = true,
	entryMode = 'digits',
	onPaste,
	onBlur,
	...props
}: NumberInputProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const isFreeDecimal = entryMode === 'freeDecimal';
	const [typedText, setTypedText] = React.useState<string | null>(null);
	const formattedValue = formatNumericInput(value, {
		decimals: decimals,
		minimumDecimals: isFreeDecimal ? 0 : decimals,
		thousandsSeparator: isFreeDecimal ? false : thousandsSeparator,
	});
	const displayValue =
		isFreeDecimal &&
		typedText !== null &&
		parseFreeDecimalTyped(typedText, decimals).value === value
			? typedText
			: formattedValue;

	React.useLayoutEffect(() => {
		const input = inputRef.current;
		if (isFreeDecimal || !input || document.activeElement !== input) return;
		input.setSelectionRange(displayValue.length, displayValue.length);
	}, [displayValue, isFreeDecimal]);

	return (
		<Input
			{...props}
			ref={inputRef}
			type="text"
			inputMode={isFreeDecimal ? 'decimal' : 'numeric'}
			autoComplete="off"
			value={displayValue}
			onBlur={(event) => {
				setTypedText(null);
				onBlur?.(event);
			}}
			onChange={(event) => {
				if (isFreeDecimal) {
					const typed = parseFreeDecimalTyped(
						event.target.value,
						decimals,
					);
					setTypedText(typed.text);
					onChange(typed.value);
					return;
				}
				onChange(
					parseTypedNumber({
						typed: event.target.value,
						previous: displayValue,
						decimals: decimals,
						isDeleting: (
							event.nativeEvent as InputEvent
						).inputType?.startsWith('delete'),
					}),
				);
			}}
			onPaste={(event) => {
				onPaste?.(event);
				if (event.defaultPrevented) return;
				event.preventDefault();
				setTypedText(null);
				onChange(
					parsePastedNumber(
						event.clipboardData.getData('text'),
						decimals,
					),
				);
			}}
		/>
	);
}

export { NumberInput };
