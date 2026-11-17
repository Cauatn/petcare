import { Router } from 'express';
import { dailyStatsQuerySchema } from './insights.schemas.js';
import { getDailyStats } from './insights.service.js';

export const insightsRouter = Router();

/** Consumo de água/ração e visitas à caixa de areia, agregados por dia local. */
insightsRouter.get('/daily', async (req, res) => {
	const { days } = dailyStatsQuerySchema.parse(req.query);
	res.json(await getDailyStats(days));
});
