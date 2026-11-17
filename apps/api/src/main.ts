import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './database/connection.js';
import { startUdpDiscoveryServer } from './modules/pairing/pairing.discovery.js';

async function bootstrap() {
	await connectDatabase();

	createApp().listen(env.PORT, () => {
		console.log(`[api] ouvindo em http://localhost:${env.PORT}/api`);
	});
	startUdpDiscoveryServer();
}

bootstrap().catch((error) => {
	console.error('[api] falha ao iniciar', error);
	process.exit(1);
});
