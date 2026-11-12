import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [tailwindcss(), tsconfigPaths()],
	server: {
		port: 5173,
		proxy: {
			// Em dev, /api vai para a API local (mesmo contrato do nginx no Docker)
			'/api': {
				target: process.env.VITE_API_PROXY ?? 'http://localhost:3333',
				changeOrigin: true,
			},
		},
	},
	build: {
		assetsDir: 'static',
	},
});
