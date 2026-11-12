import { z } from 'zod';
import { deviceTypes } from './device.model.js';

const positionSchema = z.object({
	x: z.number().min(0).max(100),
	y: z.number().min(0).max(100),
});

export const createDeviceSchema = z.object({
	name: z.string().trim().min(1),
	type: z.enum(deviceTypes),
	sensorKey: z.string().trim().min(1),
	position: positionSchema,
});

export const updateDeviceSchema = createDeviceSchema
	.omit({ type: true })
	.partial();

export const listReadingsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(500).default(60),
});
