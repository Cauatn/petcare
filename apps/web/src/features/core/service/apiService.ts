import axios from 'axios';
import { mockAdapter } from './mock/mockAdapter';

const REQUEST_TIMEOUT_MS = 10000;

export const isMockMode = import.meta.env.VITE_USE_MOCK === 'true';

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
	timeout: REQUEST_TIMEOUT_MS,
	paramsSerializer: { indexes: null },
	// Em modo simulação as requisições são respondidas no próprio navegador,
	// com o mesmo contrato da API real.
	adapter: isMockMode ? mockAdapter : undefined,
});
