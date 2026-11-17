import { z } from 'zod';

export const dailyStatsQuerySchema = z.object({
	/** Quantidade de dias (incluindo hoje). O front pede alguns dias a mais para a linha de base. */
	days: z.coerce.number().int().min(3).max(60).default(21),
});
