import { api } from '@/features/core/service/apiService';
import type { MicMonitor } from '../types/monitor';

export const getMicMonitor = (sensorKey: string) =>
	api.get<MicMonitor>(`/monitor/${encodeURIComponent(sensorKey)}`);
