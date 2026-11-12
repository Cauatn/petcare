import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const textareaVariants = cva(
	'min-h-16 w-full min-w-0 resize-y transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
	{
		variants: {
			variant: {
				brand: 'rounded-lg border border-border-default bg-surface px-3 py-2 text-base md:text-sm text-ink-secondary shadow-xs selection:bg-primary selection:text-primary-foreground placeholder:text-ink-faint focus-visible:border-accent-mint focus-visible:ring-[3px] focus-visible:ring-accent-mint/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
				shadcn: 'rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground md:text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
			},
		},
		defaultVariants: {
			variant: 'brand',
		},
	},
);

function Textarea({
	className,
	variant,
	...props
}: React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(textareaVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Textarea, textareaVariants };
