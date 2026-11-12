import { api } from '@/features/core/service/apiService';
import type {
	CreateDevicePayload,
	Device,
	ListReadingsParams,
	Reading,
	UpdateDevicePayload,
} from '../types/device';

export const getDevices = () => api.get<Device[]>('/devices');

export const createDevice = (payload: CreateDevicePayload) =>
	api.post<Device>('/devices', payload);

export const updateDevice = (id: string, payload: UpdateDevicePayload) =>
	api.patch<Device>(`/devices/${id}`, payload);

export const deleteDevice = (id: string) => api.delete(`/devices/${id}`);

export const getDeviceReadings = (id: string, params: ListReadingsParams) =>
	api.get<Reading[]>(`/devices/${id}/readings`, { params });
