import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Último cartão da grade: atalho para parear mais uma placa. */
export function AddDeviceTile() {
	return (
		<Link to="/add-device" className="group block">
			<article className="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-n-40 p-4 text-center transition-colors group-hover:border-brand group-hover:bg-brand-faint">
				<span className="flex size-12 items-center justify-center rounded-full bg-n-20 text-n-600 group-hover:bg-brand group-hover:text-white">
					<Plus className="size-6" />
				</span>
				<div>
					<p className="text-base font-semibold text-ink-secondary">
						Adicionar dispositivo
					</p>
					<p className="mt-1 text-sm text-n-600">
						Conecte uma nova placa em poucos passos.
					</p>
				</div>
			</article>
		</Link>
	);
}
