import { AppPage } from '@/components/Layout/AppPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateDevice } from '@/features/devices/composables/useCreateDevice';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { cn } from '@/lib/utils';
import {
	ArrowLeft,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Lock,
	Power,
	RefreshCw,
	TriangleAlert,
	Wifi,
} from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { WizardStepper } from '../components/wizardStepper';
import { useGetEsp32SoftApStatus } from '../composables/useGetEsp32SoftApStatus';
import { useGetPairedBoards } from '../composables/useGetPairedBoards';
import { useGetPairingConfig } from '../composables/useGetPairingConfig';
import { useProvisionEsp32 } from '../composables/useProvisionEsp32';
import { useScanEsp32Networks } from '../composables/useScanEsp32Networks';

type Step = 'power' | 'connect' | 'network' | 'connecting' | 'done';

/** Quanto tempo esperamos a placa aparecer online depois de enviar o Wi-Fi. */
const CONNECT_TIMEOUT_MS = 90_000;

const stepIndex: Record<Step, number> = {
	power: 0,
	connect: 1,
	network: 2,
	connecting: 2,
	done: 3,
};

export function AddDevicePage() {
	const { data: pairingConfig } = useGetPairingConfig();
	const softApUrl = pairingConfig?.softApBaseUrl ?? 'http://10.73.73.1';
	const softApSsid = pairingConfig?.softApSsid ?? 'PetCare-Setup';

	const { data: softApStatus } = useGetEsp32SoftApStatus(softApUrl);
	const { data: boards = [] } = useGetPairedBoards();
	const { data: devices = [] } = useGetDevices();
	const {
		mutate: scanNetworks,
		data: networks = [],
		isPending: isScanning,
		isError: scanFailed,
	} = useScanEsp32Networks(softApUrl);
	const { mutateAsync: provision } = useProvisionEsp32(softApUrl);
	const { mutateAsync: createDevice } = useCreateDevice();

	const [step, setStep] = React.useState<Step>('power');
	const [ssid, setSsid] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [prefixOverride, setPrefixOverride] = React.useState<string | null>(
		null,
	);
	const [apiUrlOverride, setApiUrlOverride] = React.useState<string | null>(
		null,
	);
	const [deviceToken, setDeviceToken] = React.useState('');
	const [sentAt, setSentAt] = React.useState<number | null>(null);
	const [timedOut, setTimedOut] = React.useState(false);
	const [rejected, setRejected] = React.useState(false);
	const [wantMic, setWantMic] = React.useState(true);
	const [wantLitter, setWantLitter] = React.useState(true);
	const [creating, setCreating] = React.useState(false);
	const [created, setCreated] = React.useState(false);
	const scannedOnce = React.useRef(false);

	const devicePrefix =
		prefixOverride ??
		softApStatus?.devicePrefix ??
		pairingConfig?.defaultDevicePrefix ??
		'esp32-01';
	const apiBaseUrl =
		apiUrlOverride ?? pairingConfig?.suggestedApiBaseUrl ?? '';
	const requiresToken = pairingConfig?.requiresDeviceToken ?? false;

	// Passos que avançam sozinhos, derivados do que o app enxerga (sem setState em efeito)
	const board =
		sentAt !== null
			? boards.find(
					(b) =>
						b.devicePrefix === devicePrefix &&
						b.online &&
						new Date(b.lastSeenAt).getTime() >= sentAt,
				)
			: undefined;
	const current: Step =
		step === 'connect' && softApStatus
			? 'network'
			: step === 'connecting' && board
				? 'done'
				: step;

	// Ao chegar no passo da rede, busca as redes uma vez
	React.useEffect(() => {
		if (current === 'network' && !scannedOnce.current) {
			scannedOnce.current = true;
			scanNetworks();
		}
	}, [current, scanNetworks]);

	// Limite de espera pela placa
	React.useEffect(() => {
		if (step !== 'connecting') return;
		const timer = setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS);
		return () => clearTimeout(timer);
	}, [step]);

	const sendConfig = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!ssid.trim()) return;

		setTimedOut(false);
		setRejected(false);
		setSentAt(Date.now());
		setStep('connecting');
		try {
			await provision({
				ssid: ssid.trim(),
				password,
				apiBaseUrl: apiBaseUrl.trim().replace(/\/+$/, ''),
				deviceToken: deviceToken.trim(),
				devicePrefix: devicePrefix.trim() || 'esp32-01',
			});
		} catch (error) {
			// Sem resposta HTTP = a placa trocou de rede depois de salvar (comum e esperado).
			// Com resposta de erro = ela recusou de verdade.
			const hasResponse =
				typeof error === 'object' &&
				error !== null &&
				'response' in error &&
				Boolean((error as { response?: unknown }).response);
			if (hasResponse) setRejected(true);
		}
	};

	const retry = () => {
		setSentAt(null);
		setTimedOut(false);
		setRejected(false);
		scannedOnce.current = false;
		setStep('connect');
	};

	const createSensors = async () => {
		setCreating(true);
		try {
			const has = (key: string) =>
				devices.some((d) => d.sensorKey === key);
			const micKey = `${devicePrefix}:mic`;
			const litterKey = `${devicePrefix}:proximity`;
			if (wantMic && !has(micKey)) {
				await createDevice({
					name: 'Microfone',
					type: 'microphone',
					sensorKey: micKey,
					position: { x: 30, y: 40 },
				});
			}
			if (wantLitter && !has(litterKey)) {
				await createDevice({
					name: 'Caixa de areia',
					type: 'litterBox',
					sensorKey: litterKey,
					position: { x: 70, y: 60 },
				});
			}
			setCreated(true);
		} finally {
			setCreating(false);
		}
	};

	return (
		<AppPage
			title="Adicionar dispositivo"
			description="Conecte uma placa PetCare ao Wi-Fi da sua casa em poucos passos."
			headerActions={
				<Button variant="outline" asChild>
					<Link to="/config">
						<ArrowLeft className="size-4" />
						Voltar
					</Link>
				</Button>
			}
		>
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
				<WizardStepper current={stepIndex[current]} />

				<section className="rounded-xl border border-n-30 bg-n-0 p-6 shadow-xs">
					{current === 'power' && (
						<div className="space-y-4">
							<Heading icon={<Power className="size-5" />}>
								Ligue a placa
							</Heading>
							<p className="text-sm text-ink-secondary">
								Ligue o ESP32 na tomada ou no USB e espere uns{' '}
								<strong>15 segundos</strong>. Se ela ainda não
								tem Wi-Fi salvo, cria sozinha a rede{' '}
								<code className="rounded bg-n-20 px-1 py-0.5 font-semibold">
									{softApSsid}
								</code>
								.
							</p>
							<p className="rounded-lg bg-n-10 p-3 text-xs text-ink-muted">
								Já tinha pareado antes e quer refazer? Segure o
								botão <strong>BOOT</strong> da placa por{' '}
								<strong>3 segundos</strong> para ela esquecer o
								Wi-Fi e abrir a rede de configuração de novo.
							</p>
							<Button onClick={() => setStep('connect')}>
								A placa está ligada
							</Button>
						</div>
					)}

					{current === 'connect' && (
						<div className="space-y-4">
							<Heading icon={<Wifi className="size-5" />}>
								Conecte na rede da placa
							</Heading>
							<p className="text-sm text-ink-secondary">
								No Wi-Fi do seu computador ou celular, conecte
								em{' '}
								<code className="rounded bg-n-20 px-1 py-0.5 font-semibold">
									{softApSsid}
								</code>{' '}
								(rede aberta, sem senha). O aviso &ldquo;sem
								internet&rdquo; é normal.
							</p>
							<p className="flex items-center gap-2 rounded-lg bg-n-10 p-3 text-sm text-ink-secondary">
								<Loader2 className="size-4 animate-spin" />
								Procurando a placa… esta tela avança sozinha
								quando você conectar.
							</p>
							<p className="text-xs text-ink-muted">
								No celular, a página de configuração da placa
								abre sozinha quando você conecta. Se não abrir,
								acesse{' '}
								<a
									href={softApUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 font-semibold text-b-600 underline"
								>
									{softApUrl}
									<ExternalLink className="size-3" />
								</a>
								.
							</p>
							<Button
								variant="outline"
								onClick={() => setStep('power')}
							>
								Voltar
							</Button>
						</div>
					)}

					{current === 'network' && (
						<form onSubmit={sendConfig} className="space-y-4">
							<Heading icon={<Wifi className="size-5" />}>
								Escolha o Wi-Fi da sua casa
							</Heading>
							<p className="flex items-center gap-2 text-sm text-g-700">
								<CheckCircle2 className="size-4" />
								Conectado à placa
							</p>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label>Redes 2,4 GHz encontradas</Label>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										disabled={isScanning}
										onClick={() => scanNetworks()}
									>
										<RefreshCw
											className={cn(
												'size-4',
												isScanning && 'animate-spin',
											)}
										/>
										Buscar de novo
									</Button>
								</div>
								<div className="flex flex-col gap-2">
									{isScanning && networks.length === 0 ? (
										<p className="text-sm text-ink-muted">
											Buscando redes…
										</p>
									) : null}
									{networks.map((net) => (
										<button
											key={net.ssid}
											type="button"
											onClick={() => setSsid(net.ssid)}
											className={cn(
												'flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
												ssid === net.ssid
													? 'border-brand bg-brand-faint font-semibold'
													: 'border-n-40 bg-n-0 hover:bg-n-10',
											)}
										>
											<span className="flex items-center gap-2">
												{net.auth ? (
													<Lock className="size-3.5 text-ink-muted" />
												) : null}
												{net.ssid}
											</span>
											<span className="text-xs text-ink-muted">
												{net.rssi} dBm
											</span>
										</button>
									))}
									{scanFailed ? (
										<p className="text-sm text-ink-muted">
											Não consegui buscar as redes. Digite
											o nome abaixo.
										</p>
									) : null}
								</div>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="ssid">Nome da rede</Label>
								<Input
									id="ssid"
									value={ssid}
									onChange={(e) => setSsid(e.target.value)}
									placeholder="Escolha acima ou digite"
									required
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="password">Senha do Wi-Fi</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									placeholder="Deixe vazio se a rede for aberta"
									autoComplete="off"
								/>
							</div>

							<details className="rounded-lg border border-n-30 p-3 text-sm">
								<summary className="cursor-pointer font-medium text-ink-secondary">
									Opções avançadas
								</summary>
								<div className="mt-3 space-y-3">
									<div className="space-y-1.5">
										<Label htmlFor="apiUrl">
											Endereço da API
										</Label>
										<Input
											id="apiUrl"
											value={apiBaseUrl}
											onChange={(e) =>
												setApiUrlOverride(
													e.target.value,
												)
											}
											placeholder="http://IP-DO-COMPUTADOR:3333/api"
										/>
										<p className="text-xs text-ink-muted">
											É o endereço do computador que roda
											o PetCare, na rede de casa. Vazio =
											a placa procura o servidor sozinha
											(não funciona dentro do WSL/Docker).
										</p>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="prefix">
											Nome da placa
										</Label>
										<Input
											id="prefix"
											value={devicePrefix}
											onChange={(e) =>
												setPrefixOverride(
													e.target.value,
												)
											}
										/>
									</div>
									{requiresToken ? (
										<div className="space-y-1.5">
											<Label htmlFor="token">
												Token do dispositivo
											</Label>
											<Input
												id="token"
												value={deviceToken}
												onChange={(e) =>
													setDeviceToken(
														e.target.value,
													)
												}
											/>
										</div>
									) : null}
								</div>
							</details>

							{!apiBaseUrl ? (
								<p className="flex items-start gap-2 rounded-lg bg-y-100 p-3 text-xs text-y-700">
									<TriangleAlert className="mt-0.5 size-4 shrink-0" />
									O painel não sabe o IP do computador na
									rede. Em Docker ou WSL, informe o endereço
									da API nas opções avançadas, senão a placa
									pode não achar o servidor.
								</p>
							) : null}

							<Button type="submit" disabled={!ssid.trim()}>
								Conectar a placa
							</Button>
						</form>
					)}

					{current === 'connecting' && (
						<div className="space-y-4">
							<Heading
								icon={
									<Loader2 className="size-5 animate-spin" />
								}
							>
								Conectando a placa…
							</Heading>
							{rejected ? (
								<StatusBox tone="error">
									A placa recusou a configuração. Confira os
									dados e tente de novo.
								</StatusBox>
							) : timedOut ? (
								<StatusBox tone="error">
									A placa não apareceu online em{' '}
									{CONNECT_TIMEOUT_MS / 1000} segundos.
									Confira a senha do Wi-Fi, se a rede é de 2,4
									GHz e se o endereço da API (opções
									avançadas) é o do computador na rede de
									casa.
								</StatusBox>
							) : (
								<>
									<p className="text-sm text-ink-secondary">
										A placa recebeu o Wi-Fi, vai reiniciar e
										conectar em <strong>{ssid}</strong>. A
										rede <strong>{softApSsid}</strong> vai
										sumir.
									</p>
									<p className="rounded-lg bg-n-10 p-3 text-sm text-ink-secondary">
										<strong>Agora:</strong> reconecte o seu
										computador ou celular ao Wi-Fi de casa.
										Esta tela avança sozinha quando a placa
										aparecer online.
									</p>
								</>
							)}
							{(rejected || timedOut) && (
								<Button onClick={retry}>Tentar de novo</Button>
							)}
						</div>
					)}

					{current === 'done' && (
						<div className="space-y-4">
							<Heading
								icon={
									<CheckCircle2 className="size-5 text-g-600" />
								}
							>
								Placa conectada!
							</Heading>
							<p className="text-sm text-ink-secondary">
								<strong>
									{board?.devicePrefix ?? devicePrefix}
								</strong>{' '}
								está online
								{board ? ` em ${board.ip}` : ''}. Falta escolher
								o que ela vai monitorar.
							</p>

							<div className="space-y-2">
								<SensorOption
									checked={wantMic}
									onChange={setWantMic}
									title="Microfone"
									detail="Ouve os miados e classifica o tipo de som."
								/>
								<SensorOption
									checked={wantLitter}
									onChange={setWantLitter}
									title="Caixa de areia"
									detail="O sonar avisa quando o gato entra e sai."
								/>
							</div>

							{created ? (
								<div className="space-y-3">
									<StatusBox tone="ok">
										Sensores criados. Já aparecem no plano
										da casa.
									</StatusBox>
									<Button asChild>
										<Link to="/home">Ver minha casa</Link>
									</Button>
								</div>
							) : (
								<div className="flex flex-wrap gap-2">
									<Button
										onClick={createSensors}
										isLoading={creating}
										disabled={!wantMic && !wantLitter}
									>
										Criar sensores
									</Button>
									<Button variant="outline" asChild>
										<Link to="/home">Pular</Link>
									</Button>
								</div>
							)}
						</div>
					)}
				</section>
			</div>
		</AppPage>
	);
}

function Heading({
	icon,
	children,
}: {
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<h2 className="flex items-center gap-2 text-lg font-semibold text-ink-strong">
			{icon}
			{children}
		</h2>
	);
}

function StatusBox({
	tone,
	children,
}: {
	tone: 'ok' | 'error';
	children: React.ReactNode;
}) {
	return (
		<p
			className={cn(
				'rounded-lg border px-4 py-3 text-sm',
				tone === 'ok'
					? 'border-g-300 bg-g-50 text-g-700'
					: 'border-(--r-500) bg-r-100 text-r-700',
			)}
		>
			{children}
		</p>
	);
}

function SensorOption({
	checked,
	onChange,
	title,
	detail,
}: {
	checked: boolean;
	onChange: (value: boolean) => void;
	title: string;
	detail: string;
}) {
	return (
		<label
			className={cn(
				'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5',
				checked ? 'border-brand bg-brand-faint' : 'border-n-40',
			)}
		>
			<input
				type="checkbox"
				className="mt-1"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span>
				<span className="block text-sm font-semibold text-ink-strong">
					{title}
				</span>
				<span className="block text-xs text-ink-muted">{detail}</span>
			</span>
		</label>
	);
}
