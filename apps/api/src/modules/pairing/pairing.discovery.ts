import dgram from 'node:dgram';
import fs from 'node:fs';
import os from 'node:os';
import { env } from '../../config/env.js';

/**
 * Sub-rede do Hotspot do ESP32 (ver SOFTAP_IP_* em firmware/esp32-petcare/main/wifi_manager.c).
 * Se o PC estiver conectado no Hotspot, esse IP não serve para a placa alcançar a API.
 */
export const SOFTAP_SUBNET_PREFIX = '10.73.73.';

/** Porta HTTP que o ESP32 deve usar (a publicada no host, em Docker). */
export const publicApiPort = env.PUBLIC_API_PORT ?? env.PORT;

const isInsideContainer = fs.existsSync('/.dockerenv');

let lastKnownLanIp: string | null = null;

/**
 * Detecta o IPv4 do PC na rede local. Retorna `null` quando não há um IP confiável
 * (ex.: rodando em container sem `HOST_LAN_IP`), para o front não sugerir um endereço errado.
 */
export function detectLocalLanIp(): string | null {
	if (env.HOST_LAN_IP) return env.HOST_LAN_IP;
	if (isInsideContainer) return null;

	const interfaces = os.networkInterfaces();
	const candidates: { name: string; address: string }[] = [];

	for (const [name, addrs] of Object.entries(interfaces)) {
		if (!addrs) continue;
		if (/^(docker|br-|veth|virbr|lo|vEthernet)/i.test(name)) continue;

		for (const addr of addrs) {
			if (
				addr.family === 'IPv4' &&
				!addr.internal &&
				!addr.address.startsWith(SOFTAP_SUBNET_PREFIX)
			) {
				candidates.push({ name, address: addr.address });
			}
		}
	}

	const preferred = candidates.find((c) => /^(wl|en|eth|wi-?fi)/i.test(c.name));
	const detected = preferred?.address ?? candidates[0]?.address ?? null;

	if (detected) {
		lastKnownLanIp = detected;
		return detected;
	}

	return lastKnownLanIp;
}

/**
 * Responde a pacotes UDP de descoberta ("PETCARE_DISCOVER") enviados pelo ESP32 na rede local,
 * permitindo que a placa encontre o IP atual do backend automaticamente via DHCP sem IPs fixos.
 * A porta UDP é fixa (o firmware sempre envia para 3333); a resposta informa a porta HTTP.
 */
export function startUdpDiscoveryServer(
	discoveryPort = env.DISCOVERY_PORT,
	httpPort = publicApiPort,
) {
	const socket = dgram.createSocket('udp4');

	socket.on('error', (err) => {
		console.warn('[udp-discovery] erro no socket UDP:', err.message);
	});

	socket.on('message', (msg, rinfo) => {
		if (msg.toString().trim() === 'PETCARE_DISCOVER') {
			const reply = Buffer.from(`PETCARE_API:${httpPort}`);
			socket.send(reply, rinfo.port, rinfo.address);
		}
	});

	socket.bind(discoveryPort, () => {
		console.log(
			`[udp-discovery] respondendo descoberta do ESP32 na porta UDP ${discoveryPort}`,
		);
	});
}
