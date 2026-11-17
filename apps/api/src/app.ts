import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { errorHandler } from './commons/errorHandler.js';
import { env } from './config/env.js';
import { isDatabaseUp } from './database/connection.js';
import { devicesRouter } from './modules/devices/devices.routes.js';
import { pairingRouter } from './modules/pairing/pairing.routes.js';
import { readingsRouter } from './modules/readings/readings.routes.js';

export function createApp() {
	const app = express();

	app.use(cors({ origin: env.CORS_ORIGIN }));
	app.use(express.json());
	app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

	const api = express.Router();
	api.get('/health', (_req, res) => {
		res.json({ status: 'ok', database: isDatabaseUp() ? 'up' : 'down' });
	});
	api.use('/devices', devicesRouter);
	api.use('/pairing', pairingRouter);
	api.use('/readings', readingsRouter);

	app.use('/api', api);
	app.use(errorHandler);

	return app;
}
