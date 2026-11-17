import { Pet, type PetDocument } from './pet.model.js';
import type { SavePetInput } from './pets.schemas.js';

/** Há um único gato por instalação: o primeiro documento é o perfil. */
export function getPet() {
	return Pet.findOne().sort({ createdAt: 1 }).lean<PetDocument>();
}

export async function savePet(input: SavePetInput) {
	const current = await getPet();
	const payload = {
		...input,
		birthDate: input.birthDate ?? null,
		foodKcalPerKg: input.foodKcalPerKg ?? null,
	};

	if (!current) {
		const created = await Pet.create(payload);
		return created.toObject();
	}

	return Pet.findByIdAndUpdate(current._id, payload, {
		new: true,
		runValidators: true,
	}).lean<PetDocument>();
}
