'use client';

import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group';
import { usePortalContainer } from '@/components/ui/portalContainer';
import { cn } from '@/lib/utils';

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
	return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({
	className,
	children,
	...props
}: ComboboxPrimitive.Trigger.Props) {
	return (
		<ComboboxPrimitive.Trigger
			data-slot="combobox-trigger"
			className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
			{...props}
		>
			{children}
			<ChevronDownIcon
				data-slot="combobox-trigger-icon"
				className="pointer-events-none size-4 opacity-50"
			/>
		</ComboboxPrimitive.Trigger>
	);
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
	return (
		<ComboboxPrimitive.Clear
			data-slot="combobox-clear"
			render={<InputGroupButton variant="ghost" size="icon-xs" />}
			className={cn(className)}
			{...props}
		>
			<XIcon className="pointer-events-none" />
		</ComboboxPrimitive.Clear>
	);
}

function ComboboxInput({
	className,
	children,
	disabled = false,
	showTrigger = true,
	showClear = false,
	...props
}: ComboboxPrimitive.Input.Props & {
	showTrigger?: boolean;
	showClear?: boolean;
}) {
	return (
		<InputGroup
			data-disabled={disabled}
			className={cn(
				'w-auto bg-transparent dark:bg-transparent h-11 md:h-10 border-border-default',
				'data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
				className,
			)}
		>
			<ComboboxPrimitive.Input
				render={<InputGroupInput disabled={disabled} />}
				{...props}
			/>
			<InputGroupAddon align="inline-end">
				{showTrigger && (
					<InputGroupButton
						size="icon-xs"
						variant="ghost"
						asChild
						data-slot="input-group-button"
						className="group-has-data-[slot=combobox-clear]/input-group:hidden"
						disabled={disabled}
					>
						<ComboboxTrigger className="dark:hover:bg-transparent" />
					</InputGroupButton>
				)}
				{showClear && <ComboboxClear disabled={disabled} />}
			</InputGroupAddon>
			{children}
		</InputGroup>
	);
}

function ComboboxContent({
	className,
	side = 'bottom',
	sideOffset = 6,
	align = 'start',
	alignOffset = 0,
	anchor,
	...props
}: ComboboxPrimitive.Popup.Props &
	Pick<
		ComboboxPrimitive.Positioner.Props,
		'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
	>) {
	const container = usePortalContainer();

	return (
		<ComboboxPrimitive.Portal container={container}>
			<ComboboxPrimitive.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className="isolate z-50 pointer-events-auto"
			>
				<ComboboxPrimitive.Popup
					data-slot="combobox-content"
					data-chips={!!anchor}
					className={cn(
						'group/combobox-content relative max-h-96 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
						className,
					)}
					{...props}
				/>
			</ComboboxPrimitive.Positioner>
		</ComboboxPrimitive.Portal>
	);
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
	return (
		<ComboboxPrimitive.List
			data-slot="combobox-list"
			className={cn(
				'max-h-[min(calc(--spacing(96)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0',
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxItem({
	className,
	children,
	childrenLeft,
	...props
}: ComboboxPrimitive.Item.Props & { childrenLeft?: React.ReactNode }) {
	return (
		<ComboboxPrimitive.Item
			data-slot="combobox-item"
			className={cn(
				"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm pointer-coarse:py-3 pointer-coarse:text-base outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		>
			<div className="flex gap-2 items-center">
				<span className="min-w-0 flex-1 truncate">{children}</span>
				{childrenLeft}
			</div>
			<ComboboxPrimitive.ItemIndicator
				data-slot="combobox-item-indicator"
				render={
					<span className="pointer-events-none absolute top-1/2 right-2 flex size-4 -translate-y-1/2 items-center justify-center" />
				}
			>
				<CheckIcon className="pointer-events-none size-4 pointer-coarse:size-5" />
			</ComboboxPrimitive.ItemIndicator>
		</ComboboxPrimitive.Item>
	);
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
	return (
		<ComboboxPrimitive.Group
			data-slot="combobox-group"
			className={cn(className)}
			{...props}
		/>
	);
}

function ComboboxLabel({
	className,
	...props
}: ComboboxPrimitive.GroupLabel.Props) {
	return (
		<ComboboxPrimitive.GroupLabel
			data-slot="combobox-label"
			className={cn(
				'px-2 py-1.5 text-xs text-muted-foreground pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm',
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
	return (
		<ComboboxPrimitive.Collection
			data-slot="combobox-collection"
			{...props}
		/>
	);
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
	return (
		<ComboboxPrimitive.Empty
			data-slot="combobox-empty"
			className={cn(
				'hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex',
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxSeparator({
	className,
	...props
}: ComboboxPrimitive.Separator.Props) {
	return (
		<ComboboxPrimitive.Separator
			data-slot="combobox-separator"
			className={cn('-mx-1 my-1 h-px bg-border', className)}
			{...props}
		/>
	);
}

function ComboboxChips({
	className,
	...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
	ComboboxPrimitive.Chips.Props) {
	return (
		<ComboboxPrimitive.Chips
			data-slot="combobox-chips"
			className={cn(
				'flex min-h-11 md:min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border-default bg-surface bg-clip-padding px-3 py-1 text-base md:text-sm text-ink-secondary shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-[3px] has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40',
				className,
			)}
			{...props}
		/>
	);
}

function ComboboxChip({
	className,
	children,
	showRemove = true,
	...props
}: ComboboxPrimitive.Chip.Props & {
	showRemove?: boolean;
}) {
	return (
		<ComboboxPrimitive.Chip
			data-slot="combobox-chip"
			className={cn(
				'flex h-7 md:h-[calc(--spacing(5.5))] min-w-0 max-w-full items-center justify-center gap-1 rounded-md bg-n-20 px-3 py-1.5 md:px-2 md:py-0.5 text-sm md:text-xs font-semibold text-n-600 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0',
				className,
			)}
			{...props}
		>
			<span className="min-w-0 truncate">{children}</span>
			{showRemove && (
				<ComboboxPrimitive.ChipRemove
					render={<Button variant="ghost" size="icon-sm" />}
					className="-ml-1 opacity-50 hover:opacity-100"
					data-slot="combobox-chip-remove"
				>
					<XIcon className="pointer-events-none text-n-600 size-3 md:size-4.5" />
				</ComboboxPrimitive.ChipRemove>
			)}
		</ComboboxPrimitive.Chip>
	);
}

function ComboboxChipsInput({
	className,
	children,
	...props
}: ComboboxPrimitive.Input.Props) {
	return (
		<ComboboxPrimitive.Input
			data-slot="combobox-chip-input"
			className={cn('min-w-16 flex-1 outline-none', className)}
			{...props}
		/>
	);
}

function useComboboxAnchor() {
	return React.useRef<HTMLDivElement | null>(null);
}

export {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxTrigger,
	ComboboxValue,
	useComboboxAnchor,
};
