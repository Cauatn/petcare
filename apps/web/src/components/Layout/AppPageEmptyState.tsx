import { Heading } from '@/components/typography';
import { cn } from '@/lib/utils';

export type AppPageEmptyStateProps = {
	title: string;
	description: string;
	className?: string;
};

export function AppPageEmptyState({
	title,
	description,
	className,
}: AppPageEmptyStateProps) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center gap-7 py-8',
				className,
			)}
		>
			<img
				src="/images/empty-state.svg"
				alt="Ilustração de estado de pagina vazia"
				className="h-auto w-full max-w-[570px]"
			/>
			<div className="flex flex-col items-center gap-2 text-center">
				<Heading as="h2" size="h2" className="text-n-800">
					{title}
				</Heading>
				<p className="text-base leading-6 text-n-600">{description}</p>
			</div>
		</div>
	);
}
