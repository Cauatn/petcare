import { api } from '@/features/core/service/apiService';
import type { PairedBoard, PairingConfig } from '../types/pairing';

export const getPairingConfig = () => api.get<PairingConfig>('/pairing/config');

export const getPairedBoards = () => api.get<PairedBoard[]>('/pairing/boards');

export const deletePairedBoard = (devicePrefix: string) =>
	api.delete(`/pairing/boards/${encodeURIComponent(devicePrefix)}`);
