import { PLAN_HEIGHT, PLAN_WIDTH, rooms } from '../constants/rooms';

/** Desenho da planta. Só visual — os marcadores ficam por cima, em HTML. */
export function HouseLayout() {
	return (
		<svg
			viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}
			className="absolute inset-0 size-full"
			aria-hidden
		>
			<defs>
				<pattern
					id="floor-tiles"
					width="40"
					height="40"
					patternUnits="userSpaceOnUse"
				>
					<path
						d="M40 0H0V40"
						fill="none"
						stroke="var(--n-30)"
						strokeWidth="1"
					/>
				</pattern>
			</defs>

			{rooms.map((room) => (
				<g key={room.id}>
					<rect
						x={room.x}
						y={room.y}
						width={room.width}
						height={room.height}
						fill={
							room.id === 'kitchen' ||
							room.id === 'bathroom' ||
							room.id === 'laundry'
								? 'url(#floor-tiles)'
								: 'var(--n-10)'
						}
						stroke="var(--n-600)"
						strokeWidth="6"
					/>
					<text
						x={room.x + 16}
						y={room.y + 30}
						fill="var(--n-500)"
						fontSize="18"
						fontWeight="600"
					>
						{room.name}
					</text>
				</g>
			))}

			{/* Portas: aberturas nas paredes internas */}
			<g stroke="var(--n-10)" strokeWidth="8">
				<line x1="420" y1="140" x2="420" y2="220" />
				<line x1="720" y1="200" x2="720" y2="280" />
				<line x1="460" y1="320" x2="540" y2="320" />
				<line x1="380" y1="420" x2="380" y2="500" />
				<line x1="620" y1="420" x2="620" y2="490" />
				<line x1="780" y1="420" x2="780" y2="500" />
			</g>

			{/* Móveis de referência */}
			<g fill="var(--n-30)" stroke="var(--n-100)" strokeWidth="2">
				<rect x="60" y="230" width="220" height="60" rx="12" />
				<rect x="120" y="140" width="110" height="60" rx="8" />
				<rect x="440" y="60" width="260" height="40" rx="4" />
				<rect x="60" y="400" width="180" height="160" rx="10" />
				<rect x="740" y="60" width="90" height="90" rx="8" />
				<rect x="650" y="520" width="100" height="60" rx="20" />
			</g>
		</svg>
	);
}
