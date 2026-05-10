export type AgentConfig = {
  server_url: string;
  token?: string;
  device_id?: number;
  empresa_id?: number;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  user_is_ti?: boolean;
  user_id?: number;
  auth_session_active?: boolean;
  last_login_at?: string;
  agent_mode?: "simple" | "ti";
  collect_interval?: number;
  send_interval?: number;
};

export type DeviceInfo = {
  hostname: string;
  username: string;
  os: string;
  arch: string;
  ip: string;
  mac: string;
  fingerprint: string;
  cpu: string;
  memoryGb: number;
  uptimeSeconds: number;
};

export type Ticket = {
  id: number;
  protocolo?: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  prioridade?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  solicitante_nome?: string;
  agente_hostname?: string;
  agente_anydesk_id?: string;
};

export type Message = {
  id?: number;
  conteudo?: string;
  tipo?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  autor_nome?: string;
  autor_email?: string;
  createdAt?: string;
};

export type AttachmentDraft = {
  name: string;
  type: string;
  dataUrl: string;
  size: number;
};

export type AgentProfile = {
  id?: number;
  empresaId?: number;
  hostname?: string;
  ip?: string;
  so?: string;
  versaoAgente?: string;
  ultimoContato?: string;
  online?: boolean;
  status?: string;
  empresa_nome?: string;
  usuario_nome?: string;
  usuario_email?: string;
  technicalProfileAllowed?: boolean;
  anydeskId?: string;
  cpuModel?: string;
  gpuModel?: string;
  placaMaeModelo?: string;
  socketCpu?: string;
  serialNumber?: string;
  assetTag?: string;
  isCritical24x7?: boolean;
  notifyOnOffline?: boolean;
  notifyOnNetworkLoss?: boolean;
  offlineGraceMinutes?: number;
  monitoringNotes?: string;
  lastPolicyUpdateAt?: string;
  ultima_metrica?: Record<string, any> | null;
};

export type UpdateInfo = {
  version: string;
  productName?: string;
  artifact?: string;
  runtime?: string;
  worker?: string;
  downloadUrl?: string;
  releaseNotes?: string[];
  mandatory?: boolean;
  publishedAt?: string;
};
