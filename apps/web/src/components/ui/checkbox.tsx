import { cn } from '@/lib/utils';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import * as React from 'react';

interface CheckboxProps extends React.ComponentProps<
	typeof CheckboxPrimitive.Root
> {
	boxed?: boolean;
	label?: string;
}

function Checkbox({
	checked,
	style,
	className,
	boxed = false,
	label = 'Selecione',
	...props
}: CheckboxProps) {
	if (boxed) {
		return <BoxedCheckbox checked={checked} label={label} {...props} />;
	}

	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			checked={checked}
			className={cn('size-5 md:size-4 shrink-0', className)}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: 3,
				border: `1.5px solid ${checked ? 'var(--color-g-400)' : 'var(--color-n-50)'}`,
				backgroundColor: checked
					? 'var(--color-g-400)'
					: 'var(--color-n-0)',
				color: 'var(--color-n-0)',
				outline: 'none',
				cursor: props.disabled ? 'not-allowed' : 'pointer',
				transition: 'background-color 0.15s, border-color 0.15s',
				...style,
			}}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Check className="size-3.5 md:size-2.5" strokeWidth={2.5} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

function BoxedCheckbox({ checked, label, ...props }: CheckboxProps) {
	const { disabled } = props;

	function buildContainerClasses() {
		const classes = {
			checked: {
				base: 'font-semibold',
				default: 'border-g-400 bg-g-100 text-n-700',
				disabled: 'border-g-200 bg-g-50 text-n-400',
			},
			unchecked: {
				base: 'font-normal',
				default: 'border-n-200 text-n-700 hover:bg-n-20',
				disabled: 'border-n-100 text-n-400',
			},
		};
		const state = checked ? classes['checked'] : classes['unchecked'];

		return [
			state.base,
			`${disabled ? `${state.disabled} cursor-not-allowed` : state.default}`,
		].join(' ');
	}
	return (
		<label
			className={cn(
				`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-3 md:py-2.5 text-base md:text-sm transition-all`,
				buildContainerClasses(),
			)}
		>
			<Checkbox checked={checked} {...props} />
			{label}
		</label>
	);
}

export { Checkbox };
