import { useQuery } from '@tanstack/react-query';
import { getPet } from '../services/pet';

export const petQueryKey = ['pet'];

export function useGetPet() {
	return useQuery({
		queryKey: petQueryKey,
		queryFn: getPet,
		select: (response) => response.data,
	});
}
