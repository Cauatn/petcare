import { Router } from 'express';
import { savePetSchema } from './pets.schemas.js';
import { getPet, savePet } from './pets.service.js';

export const petsRouter = Router();

/** Perfil do gato, ou `null` se ainda não foi cadastrado. */
petsRouter.get('/', async (_req, res) => {
	res.json((await getPet()) ?? null);
});

petsRouter.put('/', async (req, res) => {
	const payload = savePetSchema.parse(req.body);
	res.json(await savePet(payload));
});
