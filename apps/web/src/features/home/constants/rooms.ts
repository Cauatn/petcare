/** Planta baixa genérica, em unidades do viewBox (1000 x 620). */
export const PLAN_WIDTH = 1000;
export const PLAN_HEIGHT = 620;

export type Room = {
	id: string;
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

export const rooms: Room[] = [
	{ id: 'living', name: 'Sala', x: 20, y: 20, width: 400, height: 300 },
	{ id: 'kitchen', name: 'Cozinha', x: 420, y: 20, width: 300, height: 300 },
	{
		id: 'laundry',
		name: 'Lavanderia',
		x: 720,
		y: 20,
		width: 260,
		height: 300,
	},
	{ id: 'bedroom', name: 'Quarto', x: 20, y: 320, width: 360, height: 280 },
	{ id: 'hall', name: 'Corredor', x: 380, y: 320, width: 240, height: 280 },
	{
		id: 'bathroom',
		name: 'Banheiro',
		x: 620,
		y: 320,
		width: 160,
		height: 280,
	},
	{ id: 'balcony', name: 'Varanda', x: 780, y: 320, width: 200, height: 280 },
];
