import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button, type buttonVariants } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import type { VariantProps } from 'class-variance-authority';

type IconButtonVariant = 'default' | 'danger';

const iconButtonConfig: Record<
	IconButtonVariant,
	{
		buttonVariant: NonNullable<
			VariantProps<typeof buttonVariants>['variant']
		>;
		iconClassName: string;
	}
> = {
	default: {
		buttonVariant: 'outline',
		iconClassName: 'text-n-600',
	},
	danger: {
		buttonVariant: 'outline-danger',
		iconClassName: 'text-r-500',
	},
};

interface IconButtonProps extends ComponentProps<'button'> {
	icon: LucideIcon;
	tooltipText: string;
	variant?: IconButtonVariant;
	iconClassName?: string;
}

export default function IconButton({
	icon: Icon,
	tooltipText,
	variant = 'default',
	className,
	iconClassName,
	...props
}: IconButtonProps) {
	const config = iconButtonConfig[variant];

	return (
		<Tooltip>
			{/* Sempre usamos asChild para evitar botões aninhados (erro de hidratação).
			    Envolvemos em um span para que o tooltip funcione mesmo quando o botão está desativado,
			    já que o botão desativado possui pointer-events-none. */}
			<TooltipTrigger asChild>
				<span
					className={cn(
						'inline-flex',
						props.disabled && 'cursor-not-allowed',
						className,
					)}
				>
					<Button
						type="button"
						variant={config.buttonVariant}
						size="icon"
						className="size-10 md:size-9"
						{...props}
					>
						<Icon
							className={cn(
								'size-4.5 md:size-4',
								config.iconClassName,
								iconClassName,
							)}
						/>
					</Button>
				</span>
			</TooltipTrigger>
			<TooltipContent>
				<span>{tooltipText}</span>
			</TooltipContent>
		</Tooltip>
	);
}
