import { type InferSchemaType, Schema, model } from 'mongoose';

export const petDiets = ['dry', 'wet', 'mixed'] as const;
export const petBodyConditions = ['thin', 'ideal', 'overweight'] as const;

/**
 * Perfil do gato (único por instalação). Peso, idade e dieta definem as metas
 * de água e ração usadas na aba "Saúde do gato".
 */
const petSchema = new Schema(
	{
		name: { type: String, required: true, trim: true },
		weightKg: { type: Number, required: true, min: 0.3, max: 15 },
		birthDate: { type: Date, default: null },
		neutered: { type: Boolean, required: true, default: true },
		diet: { type: String, enum: petDiets, required: true, default: 'dry' },
		/** Energia da ração (rótulo da embalagem). Sem valor, usa o padrão da dieta. */
		foodKcalPerKg: { type: Number, min: 100, max: 6000, default: null },
		bodyCondition: {
			type: String,
			enum: petBodyConditions,
			required: true,
			default: 'ideal',
		},
	},
	{ timestamps: true, versionKey: false },
);

export type PetDocument = InferSchemaType<typeof petSchema> & { _id: string };

export const Pet = model('Pet', petSchema);
