import { api } from './apiService';

export type Health = {
	status: 'ok';
	mock?: boolean;
	database?: 'up' | 'down';
};

export const getHealth = () => api.get<Health>('/health');
