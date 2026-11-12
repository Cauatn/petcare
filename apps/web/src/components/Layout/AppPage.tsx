import * as React from 'react';

import {
	Description,
	Heading,
	type HeadingProps,
} from '@/components/typography';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { AppPageEmptyState } from './AppPageEmptyState';

export type AppPageProps = {
	title: React.ReactNode;
	description?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	headingSize?: HeadingProps['size'];
	withButton?: boolean;
	buttonText?: string;
	buttonProps?: React.ComponentProps<'button'>;
	headerActions?: React.ReactNode;
	isEmpty?: boolean;
	emptyStateDescription?: string;
};

export function AppPage({
	title,
	description,
	children,
	className,
	headingSize = 'page',
	withButton = false,
	buttonText = 'Criar',
	buttonProps = {},
	headerActions,
	isEmpty = false,
	emptyStateDescription,
}: AppPageProps) {
	const showEmptyState = isEmpty && emptyStateDescription;

	return (
		<div className={cn('min-w-0 space-y-12', className)}>
			<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center sm:gap-0">
				<div className="space-y-2">
					<Heading size={headingSize}>{title}</Heading>
					{description ? (
						<Description>{description}</Description>
					) : null}
				</div>
				{headerActions ??
					(withButton ? (
						<Button {...buttonProps}>{buttonText}</Button>
					) : null)}
			</div>
			{showEmptyState ? (
				<AppPageEmptyState
					title="Ops, não foi possível encontrar nada."
					description={emptyStateDescription}
				/>
			) : (
				children
			)}
		</div>
	);
}
