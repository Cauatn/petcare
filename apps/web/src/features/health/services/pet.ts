import { api } from '@/features/core/service/apiService';
import type { Pet, SavePetPayload } from '../types/health';

export const getPet = () => api.get<Pet | null>('/pet');

export const savePet = (payload: SavePetPayload) =>
	api.put<Pet>('/pet', payload);
