import * as React from 'react';
import type {
	Esp32ProvisionPayload,
	Esp32ScanNetwork,
	Esp32SoftApStatus,
} from '../types/pairing';

async function probeSoftAp(baseUrl: string): Promise<Esp32SoftApStatus | null> {
	try {
		const response = await fetch(`${baseUrl}/status`, {
			method: 'GET',
			signal: AbortSignal.timeout(1800),
		});
		if (!response.ok) return null;
		return (await response.json()) as Esp32SoftApStatus;
	} catch {
		return null;
	}
}

export function useEsp32SoftAp(softApUrl: string) {
	const [softApStatus, setSoftApStatus] =
		React.useState<Esp32SoftApStatus | null>(null);
	const [isProbing, setIsProbing] = React.useState(false);
	const [scannedNetworks, setScannedNetworks] = React.useState<
		Esp32ScanNetwork[]
	>([]);
	const [isScanning, setIsScanning] = React.useState(false);
	const [isProvisioning, setIsProvisioning] = React.useState(false);

	const checkSoftAp = React.useCallback(async () => {
		setIsProbing(true);
		const status = await probeSoftAp(softApUrl);
		setSoftApStatus(status);
		setIsProbing(false);
		return status;
	}, [softApUrl]);

	React.useEffect(() => {
		let cancelled = false;
		const poll = () => {
			void probeSoftAp(softApUrl).then((status) => {
				if (!cancelled) {
					setSoftApStatus(status);
				}
			});
		};
		const initialTimer = window.setTimeout(poll, 50);
		const timer = window.setInterval(poll, 3000);
		return () => {
			cancelled = true;
			window.clearTimeout(initialTimer);
			window.clearInterval(timer);
		};
	}, [softApUrl]);

	const scanNetworks = React.useCallback(async () => {
		setIsScanning(true);
		try {
			const response = await fetch(`${softApUrl}/scan`, {
				method: 'GET',
				signal: AbortSignal.timeout(8000),
			});
			if (!response.ok) {
				throw new Error('Não foi possível escanear as redes no ESP32.');
			}
			const data = (await response.json()) as {
				networks?: Esp32ScanNetwork[];
			};
			const list = data.networks ?? [];
			setScannedNetworks(list);
			return list;
		} finally {
			setIsScanning(false);
		}
	}, [softApUrl]);

	const provision = React.useCallback(
		async (payload: Esp32ProvisionPayload) => {
			setIsProvisioning(true);
			try {
				const response = await fetch(`${softApUrl}/provision`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
					signal: AbortSignal.timeout(5000),
				});

				if (!response.ok) {
					throw new Error(
						`Falha ao enviar configuração (HTTP ${response.status})`,
					);
				}

				return (await response.json()) as {
					ok: boolean;
					message?: string;
				};
			} finally {
				setIsProvisioning(false);
			}
		},
		[softApUrl],
	);

	return {
		softApStatus,
		isProbing,
		scannedNetworks,
		isScanning,
		isProvisioning,
		checkSoftAp,
		scanNetworks,
		provision,
	};
}
