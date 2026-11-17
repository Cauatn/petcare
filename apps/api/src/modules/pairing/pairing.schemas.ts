import { z } from 'zod';

export const heartbeatPairingSchema = z.object({
	devicePrefix: z.string().trim().min(1).max(64).default('esp32-01'),
	ssid: z.string().trim().min(1).max(64),
	ip: z.string().trim().min(1).max(64),
	mac: z.string().trim().max(32).optional(),
});

export type HeartbeatPairingInput = z.infer<typeof heartbeatPairingSchema>;
