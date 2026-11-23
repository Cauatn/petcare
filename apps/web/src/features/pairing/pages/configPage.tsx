import { AppPage } from '@/components/Layout/AppPage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { devicesTableColumns } from '@/features/devices/components/devicesTableColumns';
import { useGetDevices } from '@/features/devices/composables/useGetDevices';
import { Link } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { formatRelativeTime } from '@/features/core/utils/formatRelativeTime';
import { cn } from '@/lib/utils';
import {
	CheckCircle2,
	Cpu,
	ExternalLink,
	Plus,
	Radio,
	RefreshCw,
	Router,
	Send,
	Trash2,
	Wifi,
} from 'lucide-react';
import * as React from 'react';
import { useDeletePairedBoard } from '../composables/useDeletePairedBoard';
import { useGetEsp32SoftApStatus } from '../composables/useGetEsp32SoftApStatus';
import { useGetPairedBoards } from '../composables/useGetPairedBoards';
import { useGetPairingConfig } from '../composables/useGetPairingConfig';
import { useProvisionEsp32 } from '../composables/useProvisionEsp32';
import { useScanEsp32Networks } from '../composables/useScanEsp32Networks';

/** Endereço antigo /devices chega aqui com #sensores: rola até a lista quando ela carregar. */
function useScrollToHash(ready: boolean) {
	React.useEffect(() => {
		if (!ready || !window.location.hash) return;
		document
			.getElementById(window.location.hash.slice(1))
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}, [ready]);
}

export function ConfigPage() {
	const {
		data: devices,
		isLoading: isLoadingDevices,
		error: devicesError,
	} = useGetDevices();
	useScrollToHash(devices != null);
	const { data: pairingConfig } = useGetPairingConfig();
	const { data: boards = [], isLoading: isLoadingBoards } =
		useGetPairedBoards();
	const {
		mutate: deleteBoard,
		isPending: isDeleting,
		variables: deletingPrefix,
	} = useDeletePairedBoard();

	const softApUrl = pairingConfig?.softApBaseUrl ?? 'http://10.73.73.1';
	const softApSsid = pairingConfig?.softApSsid ?? 'PetCare-Setup';

	const {
		data: softApStatus,
		isFetching: isProbing,
		refetch: checkSoftAp,
	} = useGetEsp32SoftApStatus(softApUrl);
	const {
		mutateAsync: scanNetworks,
		data: scannedNetworks = [],
		isPending: isScanning,
	} = useScanEsp32Networks(softApUrl);
	const { mutateAsync: provision, isPending: isProvisioning } =
		useProvisionEsp32(softApUrl);
	const requiresDeviceToken = pairingConfig?.requiresDeviceToken ?? false;

	const [ssid, setSsid] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [customDevicePrefix, setCustomDevicePrefix] = React.useState<
		string | null
	>(null);
	const [customApiBaseUrl, setCustomApiBaseUrl] = React.useState<
		string | null
	>(null);
	const [deviceToken, setDeviceToken] = React.useState('');
	const [feedback, setFeedback] = React.useState<{
		type: 'success' | 'error' | 'info';
		message: string;
	} | null>(null);
	const [provisionSentAt, setProvisionSentAt] = React.useState<number | null>(
		null,
	);

	const devicePrefix =
		customDevicePrefix ??
		softApStatus?.devicePrefix ??
		pairingConfig?.defaultDevicePrefix ??
		'esp32-01';
	const apiBaseUrl =
		customApiBaseUrl ?? pairingConfig?.suggestedApiBaseUrl ?? '';
	const hasSuggestedApiBaseUrl = Boolean(pairingConfig?.suggestedApiBaseUrl);

	const handleScanNetworks = async () => {
		setFeedback(null);
		try {
			const list = await scanNetworks();
			if (list.length > 0 && !ssid) {
				setSsid(list[0].ssid);
			}
		} catch {
			setFeedback({
				type: 'error',
				message: `Não foi possível consultar o ESP32 em ${softApUrl}. Verifique se você está conectado na rede Wi-Fi "${softApSsid}".`,
			});
		}
	};

	const handleProvision = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!ssid.trim()) return;

		setFeedback(null);
		try {
			await provision({
				ssid: ssid.trim(),
				password,
				apiBaseUrl: apiBaseUrl.trim().replace(/\/+$/, ''),
				deviceToken: deviceToken.trim(),
				devicePrefix: devicePrefix.trim() || 'esp32-01',
			});
			setProvisionSentAt(Date.now());
			setFeedback({
				type: 'success',
				message:
					'Credenciais enviadas com sucesso para o ESP32! Agora reconecte seu computador/celular ao seu Wi-Fi normal para ver a placa ficar Online abaixo.',
			});
		} catch {
			setFeedback({
				type: 'error',
				message: `Falha ao enviar para ${softApUrl}/provision. Confirme que seu Wi-Fi está conectado na rede "${softApSsid}" do ESP32.`,
			});
		}
	};

	const targetBoardOnline = boards.find(
		(b) =>
			b.devicePrefix === (devicePrefix.trim() || 'esp32-01') && b.online,
	);

	return (
		<AppPage
			title="Configurações"
			description="Pareamento Wi-Fi do ESP32 (Hotspot SoftAP) e gerenciamento das placas conectadas ao PetCare."
			headerActions={
				<Button asChild>
					<Link to="/add-device">
						<Plus className="size-4" />
						Adicionar dispositivo
					</Link>
				</Button>
			}
		>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
				{/* Coluna esquerda: Status das Placas Pareadas + Tutorial Passo a Passo */}
				<div className="flex flex-col gap-6 lg:col-span-5">
					<Card className="border-n-40">
						<CardHeader>
							<div className="flex items-center justify-between gap-2">
								<div className="flex items-center gap-2.5">
									<Cpu className="size-5 text-g-600" />
									<CardTitle>Placas ESP32 Pareadas</CardTitle>
								</div>
								<Badge
									variant={
										boards.some((b) => b.online)
											? 'green'
											: 'neutral'
									}
								>
									{boards.filter((b) => b.online).length}{' '}
									online
								</Badge>
							</div>
							<CardDescription>
								Placas que já se conectaram ao Wi-Fi e enviaram
								sinal para a API.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							{isLoadingBoards ? (
								<div className="rounded-lg border border-n-30 bg-n-10 p-4 text-sm text-n-500">
									Carregando placas pareadas...
								</div>
							) : boards.length === 0 ? (
								<div className="rounded-lg border border-dashed border-n-50 bg-n-10 p-4 text-sm text-n-600">
									Nenhuma placa pareada ainda. Siga o tutorial
									abaixo para parear seu ESP32 sem precisar
									gravar senha no código.
								</div>
							) : (
								boards.map((board) => (
									<div
										key={board.devicePrefix}
										className="flex items-center justify-between gap-3 rounded-lg border border-n-40 bg-n-10 p-3.5"
									>
										<div className="min-w-0 flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-semibold text-n-900">
													{board.devicePrefix}
												</span>
												<Badge
													variant={
														board.online
															? 'green'
															: 'neutral'
													}
												>
													{board.online
														? 'Online'
														: 'Offline'}
												</Badge>
											</div>
											<div className="text-xs text-n-600">
												Wi-Fi:{' '}
												<strong className="text-n-800">
													{board.ssid}
												</strong>{' '}
												• IP:{' '}
												<code className="text-n-800">
													{board.ip}
												</code>
											</div>
											<div className="text-xs text-n-500">
												Último sinal:{' '}
												{formatRelativeTime(
													board.lastSeenAt,
												)}
											</div>
										</div>
										<Button
											variant="outline-danger"
											size="brand-sm"
											className="text-danger shrink-0"
											isLoading={
												isDeleting &&
												deletingPrefix ===
													board.devicePrefix
											}
											onClick={() =>
												deleteBoard(board.devicePrefix)
											}
											title="Desvincular placa"
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								))
							)}
						</CardContent>
					</Card>

					<Card className="border-n-40">
						<CardHeader>
							<div className="flex items-center gap-2.5">
								<Router className="size-5 text-g-600" />
								<CardTitle>
									Como funciona o Pareamento (3 Passos)
								</CardTitle>
							</div>
							<CardDescription>
								Siga este guia para configurar o Wi-Fi na
								memória Flash (NVS) do ESP32.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4 text-sm text-n-700">
							<div className="flex gap-3.5">
								<div
									className={cn(
										'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
										softApStatus
											? 'bg-g-100 text-g-700'
											: 'bg-n-30 text-n-800',
									)}
								>
									1
								</div>
								<div className="space-y-1">
									<div className="font-semibold text-n-900">
										Conecte na rede Wi-Fi &ldquo;
										{softApSsid}&rdquo;
									</div>
									<p className="text-xs leading-relaxed text-n-600">
										Quando o ESP32 está sem Wi-Fi salvo ou
										não consegue conectar em 10 segundos,
										ele cria a rede aberta{' '}
										<code className="rounded bg-n-20 px-1 py-0.5 font-semibold text-n-900">
											{softApSsid}
										</code>
										. Para forçar o modo pareamento a
										qualquer momento, segure o botão{' '}
										<strong>BOOT</strong> na placa por{' '}
										<strong>3 segundos</strong>.
									</p>
								</div>
							</div>

							<div className="flex gap-3.5">
								<div
									className={cn(
										'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
										provisionSentAt
											? 'bg-g-100 text-g-700'
											: 'bg-n-30 text-n-800',
									)}
								>
									2
								</div>
								<div className="space-y-1">
									<div className="font-semibold text-n-900">
										Envie o SSID e a senha da sua rede 2.4
										GHz
									</div>
									<p className="text-xs leading-relaxed text-n-600">
										Com o computador conectado em{' '}
										<strong>{softApSsid}</strong>, clique em{' '}
										<em>
											&ldquo;Buscar redes 2.4 GHz&rdquo;
										</em>{' '}
										ao lado (ou digite o nome da rede),
										informe a senha e clique em{' '}
										<strong>Parear ESP32</strong>.
									</p>
								</div>
							</div>

							<div className="flex gap-3.5">
								<div
									className={cn(
										'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
										targetBoardOnline
											? 'bg-g-100 text-g-700'
											: 'bg-n-30 text-n-800',
									)}
								>
									3
								</div>
								<div className="space-y-1">
									<div className="font-semibold text-n-900">
										Volte para o seu Wi-Fi normal
									</div>
									<p className="text-xs leading-relaxed text-n-600">
										O ESP32 salva as credenciais na memória
										permanente (NVS), fecha o Hotspot e
										avisa a API automaticamente. Basta
										reconectar seu PC ao Wi-Fi normal e ele
										aparecerá <strong>Online</strong> acima!
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Coluna direita: Assistente / Formulário de Pareamento Direto com 192.168.4.1 */}
				<div className="lg:col-span-7">
					<Card className="border-n-40">
						<CardHeader>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="space-y-1">
									<CardTitle className="flex items-center gap-2">
										<Wifi className="size-5 text-g-600" />
										Parear Dispositivo ESP32
									</CardTitle>
									<CardDescription>
										Comunicação direta com o Hotspot do
										ESP32 em <code>{softApUrl}</code>
									</CardDescription>
								</div>

								<div className="flex items-center gap-2">
									<Badge
										variant={
											softApStatus ? 'green' : 'yellow'
										}
									>
										{softApStatus
											? `Conectado ao ESP32 (${softApUrl})`
											: `Aguardando conexão em ${softApSsid}`}
									</Badge>
									<Button
										type="button"
										variant="outline"
										size="brand-sm"
										isLoading={isProbing}
										onClick={() => void checkSoftAp()}
									>
										<RefreshCw className="size-3.5" />
										Testar
									</Button>
								</div>
							</div>
						</CardHeader>

						<CardContent>
							<form
								onSubmit={handleProvision}
								className="flex flex-col gap-5"
							>
								{/* Seleção / busca de rede Wi-Fi 2.4 GHz */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between gap-2">
										<Label htmlFor="wifi-ssid">
											Nome da Rede Wi-Fi (SSID 2.4 GHz)
										</Label>
										<Button
											type="button"
											variant="outline"
											size="brand-sm"
											isLoading={isScanning}
											onClick={() =>
												void handleScanNetworks()
											}
										>
											<Radio className="size-3.5" />
											Buscar redes 2.4 GHz na placa
										</Button>
									</div>

									<Input
										id="wifi-ssid"
										placeholder="Ex.: MinhaRede_2.4G"
										value={ssid}
										onChange={(event) =>
											setSsid(event.target.value)
										}
										required
									/>

									{scannedNetworks.length > 0 ? (
										<div className="mt-1 flex flex-wrap gap-1.5 rounded-lg border border-n-30 bg-n-10 p-2.5">
											<span className="w-full text-xs font-medium text-n-600">
												Redes 2.4 GHz encontradas pelo
												ESP32 (clique para selecionar):
											</span>
											{scannedNetworks.map((net) => (
												<button
													key={`${net.ssid}-${net.rssi}`}
													type="button"
													onClick={() =>
														setSsid(net.ssid)
													}
													className={cn(
														'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
														ssid === net.ssid
															? 'border-(--color-g-500) bg-g-100 text-g-700'
															: 'border-n-40 bg-n-0 text-n-700 hover:bg-n-20',
													)}
												>
													<Wifi className="size-3" />
													<span>{net.ssid}</span>
													<span className="text-n-400">
														({net.rssi} dBm)
													</span>
												</button>
											))}
										</div>
									) : (
										<span className="text-xs text-n-500">
											Importante: o ESP32 só conecta em
											redes de <strong>2.4 GHz</strong>{' '}
											(em Hotspot de iPhone, ative
											&ldquo;Maximizar
											Compatibilidade&rdquo;).
										</span>
									)}
								</div>

								{/* Senha do Wi-Fi */}
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="wifi-password">
										Senha do Wi-Fi
									</Label>
									<Input
										id="wifi-password"
										type="password"
										placeholder="Digite a senha da sua rede Wi-Fi"
										value={password}
										onChange={(event) =>
											setPassword(event.target.value)
										}
									/>
								</div>

								{/* Prefixo da Placa e URL da API */}
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									<div className="flex flex-col gap-1.5">
										<Label htmlFor="device-prefix">
											Identificador da Placa (Prefixo)
										</Label>
										<Input
											id="device-prefix"
											placeholder="esp32-01"
											value={devicePrefix}
											onChange={(event) =>
												setCustomDevicePrefix(
													event.target.value,
												)
											}
											required
										/>
										<span className="text-xs text-n-500">
											Envia chaves como{' '}
											<code>
												{devicePrefix || 'esp32-01'}
												:water
											</code>{' '}
											e{' '}
											<code>
												{devicePrefix || 'esp32-01'}
												:proximity
											</code>
											.
										</span>
									</div>

									<div className="flex flex-col gap-1.5">
										<Label htmlFor="api-base-url">
											URL da API PetCare (opcional —
											descoberta automática na rede)
										</Label>
										<Input
											id="api-base-url"
											placeholder="Descoberto automaticamente via UDP na rede local"
											value={apiBaseUrl}
											onChange={(event) =>
												setCustomApiBaseUrl(
													event.target.value,
												)
											}
										/>
										<span className="text-xs text-n-500">
											{hasSuggestedApiBaseUrl
												? 'Se vazio ou se o IP do PC mudar, o ESP32 descobre o servidor sozinho na rede.'
												: 'A API não sabe o IP deste PC na rede. Em Docker, defina HOST_LAN_IP no .env ou informe a URL (ex.: http://192.168.0.10:3333/api).'}
										</span>
									</div>
								</div>

								{/* Token: a API não o expõe, o usuário digita o DEVICE_TOKEN do .env */}
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="device-token">
										Token do Dispositivo
										{requiresDeviceToken
											? ''
											: ' (opcional)'}
									</Label>
									<Input
										id="device-token"
										type="password"
										autoComplete="off"
										placeholder={
											requiresDeviceToken
												? 'Valor de DEVICE_TOKEN no .env da API'
												: 'Em branco: DEVICE_TOKEN não está ativo na API'
										}
										value={deviceToken}
										onChange={(event) =>
											setDeviceToken(event.target.value)
										}
										required={requiresDeviceToken}
									/>
								</div>

								{feedback ? (
									<div
										className={cn(
											'flex items-start gap-2.5 rounded-lg border p-3.5 text-sm',
											feedback.type === 'success'
												? 'border-(--color-g-300) bg-g-50 text-g-700'
												: feedback.type === 'error'
													? 'border-(--color-r-500) bg-r-100 text-r-700'
													: 'border-(--color-b-400) bg-b-100 text-b-700',
										)}
									>
										<CheckCircle2 className="mt-0.5 size-4 shrink-0" />
										<span>{feedback.message}</span>
									</div>
								) : null}

								<div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--color-n-30) pt-4">
									<a
										href={softApUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1.5 text-xs font-medium text-n-600 hover:text-n-900"
									>
										<ExternalLink className="size-3.5" />
										Abrir portal interno do ESP32 (
										{softApUrl})
									</a>

									<Button
										type="submit"
										size="brand-sm"
										isLoading={isProvisioning}
										disabled={
											!ssid.trim() ||
											(requiresDeviceToken &&
												!deviceToken.trim())
										}
									>
										<Send className="size-4" />
										Enviar configuração e parear ESP32
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>

			<section id="sensores" className="mt-8 space-y-4">
				<div className="space-y-1">
					<h2 className="text-lg font-semibold text-ink-strong">
						Sensores
					</h2>
					<p className="text-sm text-ink-muted">
						Todos os sensores cadastrados. Toque num deles para ver
						os detalhes.
					</p>
				</div>
				<DataTable
					columns={devicesTableColumns}
					data={devices}
					isLoading={isLoadingDevices}
					error={devicesError}
					emptyStateDescription="Use “Adicionar dispositivo” para começar."
				/>
			</section>
		</AppPage>
	);
}
