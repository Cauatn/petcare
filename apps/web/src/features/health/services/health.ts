import { api } from '@/features/core/service/apiService';
import type { DailyCatStats, DailyStatsParams } from '../types/health';

export const getDailyStats = (params: DailyStatsParams) =>
	api.get<DailyCatStats[]>('/insights/daily', { params });
