import dgram from 'node:dgram';
import os from 'node:os';
import { env } from '../../config/env.js';

let lastKnownLanIp: string | null = null;

/**
 * Detecta dinamicamente o IP IPv4 da máquina na rede local via interfaces do sistema operacional.
 */
export function detectLocalLanIp(): string {
	const interfaces = os.networkInterfaces();
	const candidates: { name: string; address: string }[] = [];

	for (const [name, addrs] of Object.entries(interfaces)) {
		if (!addrs) continue;
		if (/^(docker|br-|veth|virbr|lo)/i.test(name)) continue;

		for (const addr of addrs) {
			if (
				addr.family === 'IPv4' &&
				!addr.internal &&
				!addr.address.startsWith('192.168.4.')
			) {
				candidates.push({ name, address: addr.address });
			}
		}
	}

	const preferred = candidates.find((c) => /^(wl|en|eth)/i.test(c.name));
	const detected = preferred?.address ?? candidates[0]?.address ?? null;

	if (detected) {
		lastKnownLanIp = detected;
		return detected;
	}

	return lastKnownLanIp ?? 'localhost';
}

detectLocalLanIp();

/**
 * Responde a pacotes UDP de descoberta ("PETCARE_DISCOVER") enviados pelo ESP32 na rede local,
 * permitindo que a placa encontre o IP atual do backend automaticamente via DHCP sem IPs fixos.
 */
export function startUdpDiscoveryServer(port = env.PORT) {
	const socket = dgram.createSocket('udp4');

	socket.on('error', (err) => {
		console.warn('[udp-discovery] erro no socket UDP:', err.message);
	});

	socket.on('message', (msg, rinfo) => {
		if (msg.toString().trim() === 'PETCARE_DISCOVER') {
			const reply = Buffer.from(`PETCARE_API:${port}`);
			socket.send(reply, rinfo.port, rinfo.address);
		}
	});

	socket.bind(port, () => {
		console.log(
			`[udp-discovery] respondendo descoberta do ESP32 na porta UDP ${port}`,
		);
	});
}
