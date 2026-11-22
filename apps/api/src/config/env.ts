import { z } from 'zod';

const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	PORT: z.coerce.number().default(3333),
	MONGODB_URI: z.string().default('mongodb://localhost:27017/petcare'),
	DEVICE_TOKEN: z.string().optional(),
	CORS_ORIGIN: z.string().default('*'),
	/** Porta UDP em que a API responde à descoberta do ESP32. Fixa no firmware (3333). */
	DISCOVERY_PORT: z.coerce.number().default(3333),
	/**
	 * IP do PC na rede local, usado para sugerir a URL da API ao ESP32.
	 * Obrigatório em Docker: de dentro do container só se enxerga o IP da rede bridge.
	 */
	HOST_LAN_IP: z.string().trim().optional(),
	/** Porta HTTP vista de fora (porta publicada no host). Padrão: PORT. */
	PUBLIC_API_PORT: z.coerce.number().optional(),
	/**
	 * Fuso da casa. Os dias e o período noturno da aba de saúde são contados nele.
	 * Containers rodam em UTC: sem isso, para quem está em UTC-3 o dia "acaba" às 21h.
	 */
	APP_TIMEZONE: z.string().trim().default('America/Sao_Paulo'),
});

export const env = envSchema.parse(process.env);

// Datas locais (getHours, setHours…) passam a usar o fuso da casa.
process.env.TZ = env.APP_TIMEZONE;
