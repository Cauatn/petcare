import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().default(3333),
	MONGODB_URI: z.string().default('mongodb://localhost:27017/petcare'),
	DEVICE_TOKEN: z.string().optional(),
	CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
