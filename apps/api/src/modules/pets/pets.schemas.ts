import { z } from 'zod';
import { petBodyConditions, petDiets } from './pet.model.js';

export const savePetSchema = z.object({
	name: z.string().trim().min(1).max(60),
	weightKg: z.number().min(0.3).max(15),
	birthDate: z.coerce.date().nullable().optional(),
	neutered: z.boolean(),
	diet: z.enum(petDiets),
	foodKcalPerKg: z.number().min(100).max(6000).nullable().optional(),
	bodyCondition: z.enum(petBodyConditions).default('ideal'),
});

export type SavePetInput = z.infer<typeof savePetSchema>;
