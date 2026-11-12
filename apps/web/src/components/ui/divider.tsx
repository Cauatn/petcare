import { Separator } from './separator';

interface DividerProps {
	text: string;
}

export default function Divider({ text }: DividerProps) {
	return (
		<div className="flex items-center text-xs gap-2 w-full min-w-0 text-n-400 font-semibold">
			<span className="truncate min-w-0">{text}</span>
			<Separator className="flex-1" />
		</div>
	);
}
