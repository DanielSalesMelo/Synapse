import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import type { AgentConfig, AgentProfile, AttachmentDraft, DeviceInfo, Message, Ticket, UpdateInfo } from "./types";
import { formatDateTimeBR } from "./timezone";

const DEFAULT_SERVER = "https://synapse-backend-ds2026.azurewebsites.net";
const CATEGORIES = ["hardware", "software", "rede", "acesso", "email", "impressora", "outro"];
const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  novo: "Novo",
  triagem_ia: "Triagem IA",
  aguardando_usuario: "Aguardando usuário",
  aguardando_ti: "Aguardando TI",
  em_andamento: "Em andamento",
  em_atendimento: "Em atendimento",
  aguardando_fornecedor: "Aguardando fornecedor",
  acesso_remoto_solicitado: "Acesso remoto solicitado",
  em_acesso_remoto: "Em acesso remoto",
  resolvido: "Resolvido",
  fechado: "Fechado",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
  reaberto: "Reaberto",
};

const bytesLabel = (kb?: number | string | null) => {
  const value = Number(kb ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} GB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} MB`;
  return `${value.toFixed(0)} KB`;
};

const fileSizeLabel = (bytes?: number | null) => {
  const value = Number(bytes ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value.toFixed(0)} B`;
};

const firstLineTitle = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Solicitação via Synapse";
  return clean.length > 64 ? `${clean.slice(0, 61)}...` : clean;
};

const cleanTicketText = (text: string) =>
  text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const parseVersion = (version: string) =>
  String(version || "0").split(".").map((part) => Number(part.replace(/\D/g, "")) || 0);

const compareVersions = (left: string, right: string) => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const defaultPolicy = {
  isCritical24x7: false,
  notifyOnOffline: false,
  notifyOnNetworkLoss: false,
  offlineGraceMinutes: 10,
  monitoringNotes: "",
};

const safeJson = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
};

const readFileAsDataUrl = (file: File) =>
  new Promise<AttachmentDraft>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      name: file.name || `imagem-${Date.now()}.png`,
      type: file.type || "application/octet-stream",
      dataUrl: String(reader.result),
      size: file.size,
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

function App() {
  const [appVersion, setAppVersion] = useState("2.4.0");
  const [config, setConfig] = useState<AgentConfig>({ server_url: DEFAULT_SERVER, agent_mode: "simple" });
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [composer, setComposer] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [pairCode, setPairCode] = useState("");
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER);
  const [category, setCategory] = useState("hardware");
  const [priority, setPriority] = useState("media");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policy, setPolicy] = useState(defaultPolicy);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [workerRunning, setWorkerRunning] = useState(false);
  const lastMessageRef = useRef<number | null>(null);

  const isPaired = Boolean(config.token);
  const isTiMode = config.agent_mode === "ti" && Boolean(config.user_is_ti);
  const isAuthenticated = Boolean(config.auth_session_active && config.user_email);
  const availableVersion = updateInfo?.latestVersion || updateInfo?.version || "";
  const releaseNotes = updateInfo?.changelog?.length ? updateInfo.changelog : updateInfo?.releaseNotes || [];
  const hasUpdate = availableVersion ? compareVersions(availableVersion, appVersion) > 0 : false;
  const selectedTicket = useMemo(
    () => selectedTicketId === null ? null : tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null,
    [selectedTicketId, tickets],
  );
  const metric = profile?.ultima_metrica ?? null;
  const deviceHealth = useMemo(() => {
    let score = 100;
    const reasons: string[] = [];
    const cpu = Number(metric?.cpuUso);
    const ram = Number(metric?.ramUsoPct);
    const disk = Number(metric?.discoUsoPct);
    const lastSeen = profile?.ultimoContato ? new Date(profile.ultimoContato).getTime() : 0;
    const staleMinutes = lastSeen ? Math.floor((Date.now() - lastSeen) / 60000) : Number.POSITIVE_INFINITY;

    if (!profile?.online) {
      score -= 35;
      reasons.push("heartbeat offline");
    }
    if (Number.isFinite(staleMinutes) && staleMinutes > (policy.offlineGraceMinutes || 10)) {
      score -= 20;
      reasons.push("coleta atrasada");
    }
    if (Number.isFinite(cpu) && cpu >= 90) {
      score -= 18;
      reasons.push("CPU crítica");
    }
    if (Number.isFinite(ram) && ram >= 90) {
      score -= 18;
      reasons.push("RAM crítica");
    }
    if (Number.isFinite(disk) && disk >= 90) {
      score -= 22;
      reasons.push("disco crítico");
    }
    if (policy.isCritical24x7 && !profile?.online) {
      score -= 12;
      reasons.push("ativo 24x7 sem heartbeat");
    }

    const normalized = Math.max(0, Math.min(100, Math.round(score)));
    const level = normalized < 55 ? "critical" : normalized < 80 ? "attention" : "healthy";
    const label = level === "critical" ? "Crítico" : level === "attention" ? "Atenção" : "Saudável";
    return {
      score: normalized,
      level,
      label,
      summary: reasons.length ? reasons.join(", ") : "telemetria dentro do esperado",
    };
  }, [metric?.cpuUso, metric?.discoUsoPct, metric?.ramUsoPct, policy.isCritical24x7, policy.offlineGraceMinutes, profile?.online, profile?.ultimoContato]);
  const ticketInsights = useMemo(() => {
    const active = tickets.filter((ticket) => !["resolvido", "fechado", "encerrado", "cancelado"].includes(ticket.status || "")).length;
    const waiting = tickets.filter((ticket) => ["aguardando_usuario", "aguardando_ti", "aguardando_fornecedor"].includes(ticket.status || "")).length;
    return {
      active,
      waiting,
      total: tickets.length,
      latest: tickets[0]?.updatedAt || tickets[0]?.createdAt || profile?.ultimoContato,
    };
  }, [profile?.ultimoContato, tickets]);
  const quickStarters = isTiMode
    ? ["Abrir chamado vinculado a este PC", "Registrar incidente preventivo", "Solicitar acesso remoto"]
    : ["Meu sistema não abre", "Minha internet caiu", "Meu notebook está lento"];
  const contextCards = isTiMode
    ? [
        { label: "Saúde", value: `${deviceHealth.label} · ${deviceHealth.score}`, detail: deviceHealth.summary },
        { label: "Heartbeat", value: profile?.online ? "Online" : "Aguardando", detail: formatDateTimeBR(profile?.ultimoContato) },
        { label: "Operação", value: policy.isCritical24x7 ? "Crítico 24x7" : "Padrão", detail: workerRunning ? "worker ativo" : "worker aguardando" },
      ]
    : [
        { label: "Canal", value: "Suporte conectado", detail: "chat, anexos e histórico próprio" },
        { label: "SLA", value: ticketInsights.active ? "Em acompanhamento" : "Pronto para abrir", detail: `${ticketInsights.active} chamado(s) ativo(s)` },
        { label: "Privacidade", value: "Dados técnicos ocultos", detail: "somente TI autorizada visualiza inventário" },
      ];

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3600);
  }, []);

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const base = (config.server_url || DEFAULT_SERVER).replace(/\/$/, "");
    const headers = new Headers(init.headers || {});
    headers.set("Content-Type", headers.get("Content-Type") || "application/json");
    if (config.token) headers.set("Authorization", `Bearer ${config.token}`);
    if (isTiMode) headers.set("X-Synapse-Agent-Mode", "ti");
    const response = await fetch(`${base}${path}`, { ...init, headers });
    const payload = await safeJson(response);
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Erro HTTP ${response.status}`);
    }
    return payload;
  }, [config.server_url, config.token, isTiMode]);

  const checkForUpdates = useCallback(async (silent = true) => {
    setUpdateBusy(true);
    try {
      const base = (serverUrl || config.server_url || DEFAULT_SERVER).replace(/\/$/, "");
      const response = await fetch(`${base}/api/agent/version`, { cache: "no-store" });
      const payload = await safeJson(response) as UpdateInfo;
      if (!response.ok) throw new Error((payload as any)?.error || "Falha ao consultar atualização.");
      const nextVersion = payload.latestVersion || payload.version || appVersion;
      const notes = payload.changelog?.length ? payload.changelog : payload.releaseNotes || [];
      setUpdateInfo({
        ...payload,
        version: nextVersion,
        latestVersion: nextVersion,
        releaseNotes: notes,
        changelog: notes,
        downloadUrl: payload.downloadUrl || `${base}/api/agent/download`,
      });
      if (!silent) {
        const newer = compareVersions(nextVersion, appVersion) > 0;
        notify(newer ? `Atualização ${nextVersion} disponível.` : "Você já está na versão mais recente.");
      }
    } catch (error) {
      if (!silent) notify((error as Error).message || "Falha ao consultar atualização.");
    } finally {
      setUpdateBusy(false);
    }
  }, [appVersion, config.server_url, notify, serverUrl]);

  const loadPolicy = useCallback(async () => {
    if (!config.token || !isAuthenticated) return;
    try {
      const payload = await api("/api/agent/device-policy");
      setPolicy({
        isCritical24x7: Boolean(payload?.isCritical24x7),
        notifyOnOffline: Boolean(payload?.notifyOnOffline),
        notifyOnNetworkLoss: Boolean(payload?.notifyOnNetworkLoss),
        offlineGraceMinutes: Number(payload?.offlineGraceMinutes || 10),
        monitoringNotes: String(payload?.monitoringNotes || ""),
      });
    } catch {
      setPolicy(defaultPolicy);
    }
  }, [api, config.token, isAuthenticated]);

  const savePolicy = useCallback(async (nextPolicy = policy, close = true) => {
    if (!config.token || !isAuthenticated) {
      notify("Entre com usuário e senha antes de salvar o monitoramento deste PC.");
      return;
    }
    setBusy(true);
    try {
      const payload = await api("/api/agent/device-policy", {
        method: "PUT",
        body: JSON.stringify(nextPolicy),
      });
      setPolicy({
        isCritical24x7: Boolean(payload?.isCritical24x7),
        notifyOnOffline: Boolean(payload?.notifyOnOffline),
        notifyOnNetworkLoss: Boolean(payload?.notifyOnNetworkLoss),
        offlineGraceMinutes: Number(payload?.offlineGraceMinutes || nextPolicy.offlineGraceMinutes || 10),
        monitoringNotes: String(payload?.monitoringNotes || nextPolicy.monitoringNotes || ""),
      });
      if (close) setPolicyOpen(false);
      notify("Monitoramento deste PC atualizado.");
    } catch (error) {
      notify((error as Error).message || "Falha ao salvar monitoramento.");
    } finally {
      setBusy(false);
    }
  }, [api, config.token, isAuthenticated, notify, policy]);

  const loadBase = useCallback(async () => {
    const [nextConfig, nextDevice, version, launch, worker] = await Promise.all([
      window.synapse.getConfig(),
      window.synapse.getDeviceInfo(),
      window.synapse.getAppVersion(),
      window.synapse.getAutoLaunch(),
      window.synapse.getWorkerStatus(),
    ]);
    setConfig(nextConfig);
    setServerUrl(nextConfig.server_url || DEFAULT_SERVER);
    setDevice(nextDevice);
    setAppVersion(version);
    setAutoLaunch(launch);
    setWorkerRunning(worker.running);
  }, []);

  const refreshData = useCallback(async (silent = false) => {
    if (!config.token) return;
    try {
      const [nextProfile, nextTickets, worker] = await Promise.all([
        api("/api/agent/profile"),
        api(isTiMode ? "/api/agent/ti/tickets" : "/api/agent/tickets"),
        window.synapse.getWorkerStatus(),
      ]);
      setProfile(nextProfile);
      setTickets(Array.isArray(nextTickets) ? nextTickets : []);
      setWorkerRunning(worker.running);
      if (selectedTicketId === undefined && Array.isArray(nextTickets) && nextTickets[0]?.id) {
        setSelectedTicketId(nextTickets[0].id);
      }
      if (!silent) notify("Dados sincronizados com o Synapse.");
    } catch (error) {
      if (!silent) notify((error as Error).message || "Falha ao sincronizar.");
    }
  }, [api, config.token, isTiMode, notify, selectedTicketId]);

  const refreshMessages = useCallback(async (ticketIdOverride?: number) => {
    const ticketId = ticketIdOverride ?? selectedTicket?.id;
    if (!config.token || !isAuthenticated || !ticketId) {
      setMessages([]);
      return;
    }
    try {
      const base = isTiMode ? "/api/agent/ti/tickets" : "/api/agent/tickets";
      const nextMessages = await api(`${base}/${ticketId}/messages`);
      const list = Array.isArray(nextMessages) ? nextMessages : [];
      const lastId = Number(list[list.length - 1]?.id || 0);
      if (lastId && lastMessageRef.current && lastId !== lastMessageRef.current) {
        window.synapse.notify("Nova mensagem no Synapse", selectedTicket?.titulo || "Chamado atualizado");
      }
      if (lastId) lastMessageRef.current = lastId;
      setMessages(list);
    } catch (error) {
      notify((error as Error).message || "Falha ao carregar conversa.");
    }
  }, [api, config.token, isAuthenticated, isTiMode, notify, selectedTicket]);

  useEffect(() => {
    loadBase();
    const off = window.synapse.onMenuAction((action) => {
      if (action === "refresh") refreshData(false);
      if (action === "new-ticket") {
        setSelectedTicketId(null);
        setComposer("");
        notify("Escreva sua solicitação no chat para abrir um chamado.");
      }
      if (action === "history") setHistoryOpen(true);
      if (action === "settings") setSettingsOpen(true);
      if (action === "clear-link") clearLink();
      if (action === "copy-diagnostics") copyDiagnostics();
      if (action === "about") notify(`Synapse para Windows ${appVersion}`);
    });
    return off;
  }, [appVersion, loadBase, notify, refreshData]);

  useEffect(() => {
    checkForUpdates(true);
  }, [checkForUpdates]);

  useEffect(() => {
    if (!config.token || !isAuthenticated) return;
    refreshData(true);
    const id = window.setInterval(() => refreshData(true), 12000);
    return () => window.clearInterval(id);
  }, [config.token, isAuthenticated, refreshData]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  useEffect(() => {
    refreshMessages();
    const id = window.setInterval(() => refreshMessages(), 7000);
    return () => window.clearInterval(id);
  }, [refreshMessages]);

  const pairDevice = async () => {
    if (!pairCode.trim()) {
      notify("Informe o código SYNC para parear.");
      return;
    }
    setBusy(true);
    try {
      const currentDevice = device ?? await window.synapse.getDeviceInfo();
      const response = await fetch(`${serverUrl.replace(/\/$/, "")}/api/agent/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairCode: pairCode.trim().toUpperCase(),
          hostname: currentDevice.hostname,
          ip: currentDevice.ip,
          mac: currentDevice.mac,
          fingerprint: currentDevice.fingerprint,
          agentVersion: appVersion,
          platform: {
            os: currentDevice.os,
            machine: currentDevice.arch,
            processor: currentDevice.cpu,
          },
        }),
      });
      const payload = await safeJson(response);
      if (!response.ok) throw new Error(payload?.error || "Falha ao parear.");
      const nextConfig = await window.synapse.saveConfig({
        server_url: serverUrl,
        token: payload.token,
        device_id: payload.deviceId,
        empresa_id: payload.empresaId,
        user_id: undefined,
        user_name: "",
        user_email: "",
        user_role: "",
        user_is_ti: false,
        auth_session_active: false,
        agent_mode: "simple",
      });
      setConfig(nextConfig);
      await window.synapse.startWorker();
      setLoginOpen(true);
      notify("PC pareado. Entre com usuário e senha para liberar a tela correta.");
      setPairCode("");
    } catch (error) {
      notify((error as Error).message || "Falha ao parear.");
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    const next = await window.synapse.saveConfig({ server_url: serverUrl, agent_mode: isTiMode ? "ti" : "simple" });
    setConfig(next);
    await window.synapse.setAutoLaunch(autoLaunch);
    if (isAuthenticated) await savePolicy(policy, false);
    setSettingsOpen(false);
    notify("Configurações salvas.");
  };

  const clearLink = async () => {
    const ok = window.confirm("Limpar vínculo antigo?\n\nIsso remove o token local e prepara este PC para novo pareamento sem abrir PowerShell ou console.");
    if (!ok) return;
    const next = await window.synapse.clearLink();
    setConfig(next);
    setProfile(null);
    setTickets([]);
    setMessages([]);
    setSelectedTicketId(null);
    setPolicy(defaultPolicy);
    notify("Vínculo local limpo. Gere um novo código SYNC no painel web.");
  };

  const loginUser = async () => {
    if (!loginEmail || !loginPassword) {
      notify("Informe e-mail e senha.");
      return;
    }
    setBusy(true);
    try {
      const result = await api("/api/agent/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword, deviceId: config.device_id, token: config.token }),
      });
      if (!result?.user?.email) throw new Error("Login inválido.");
      const next = await window.synapse.saveConfig({
        user_id: Number(result.user.id || 0) || undefined,
        user_name: result.user.name,
        user_email: result.user.email,
        user_role: result.user.role,
        user_is_ti: Boolean(result.user.isTiManager),
        auth_session_active: true,
        last_login_at: new Date().toISOString(),
        agent_mode: result.user.isTiManager ? "ti" : "simple",
      });
      setConfig(next);
      setLoginOpen(false);
      setLoginPassword("");
      await fetch(`${(config.server_url || DEFAULT_SERVER).replace(/\/$/, "")}/api/agent/device-policy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
        body: JSON.stringify(policy),
      }).catch(() => undefined);
      await refreshData(true);
      notify(result.user.isTiManager ? "Modo TI/Admin ativado." : "Modo usuário comum ativado.");
    } catch (error) {
      notify((error as Error).message || "Falha ao autenticar.");
    } finally {
      setBusy(false);
    }
  };

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    const drafts = await Promise.all(files.map(readFileAsDataUrl));
    setAttachments((current) => [...current, ...drafts]);
    notify(`${drafts.length} anexo(s) adicionado(s).`);
  };

  const handlePaste = async (event: React.ClipboardEvent) => {
    const files = Array.from(event.clipboardData.files || []);
    if (files.length) {
      event.preventDefault();
      await addFiles(files);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    await addFiles(Array.from(event.dataTransfer.files || []));
  };

  const sendComposer = async () => {
    if (!composer.trim() && attachments.length === 0) return;
    setBusy(true);
    try {
      let ticket = selectedTicket;
      const cleanMessage = cleanTicketText(composer);
      if (!ticket) {
        ticket = await api("/api/agent/tickets/open", {
          method: "POST",
          body: JSON.stringify({
            titulo: firstLineTitle(cleanMessage),
            descricao: cleanMessage || "Anexo enviado pelo agente Synapse.",
            categoria: isTiMode ? category : "outro",
            prioridade: isTiMode ? priority : "media",
          }),
        });
        setSelectedTicketId(ticket.id);
      } else if (cleanMessage) {
        const base = isTiMode ? "/api/agent/ti/tickets" : "/api/agent/tickets";
        await api(`${base}/${ticket.id}/messages`, {
          method: "POST",
          body: JSON.stringify({ conteudo: cleanMessage }),
        });
      }
      if (ticket?.id) {
        const base = isTiMode ? "/api/agent/ti/tickets" : "/api/agent/tickets";
        for (const file of attachments) {
          await api(`${base}/${ticket.id}/messages`, {
            method: "POST",
            body: JSON.stringify({
              conteudo: "",
              fileUrl: file.dataUrl,
              fileName: file.name,
              fileType: file.type,
            }),
          });
        }
      }
      setComposer("");
      setAttachments([]);
      await Promise.all([refreshData(true), refreshMessages(ticket?.id)]);
      notify("Mensagem enviada.");
    } catch (error) {
      notify((error as Error).message || "Falha ao enviar.");
    } finally {
      setBusy(false);
    }
  };

  const updateTicketStatus = async (status: string) => {
    if (!selectedTicket?.id || !isTiMode) return;
    await api(`/api/agent/ti/tickets/${selectedTicket.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await refreshData(true);
    notify("Status atualizado.");
  };

  const copyDiagnostics = async () => {
    const diagnostics = {
      appVersion,
      device,
      profile,
      workerRunning,
      config: { ...config, token: config.token ? "[oculto]" : "" },
      generatedAt: new Date().toISOString(),
    };
    await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    notify("Diagnóstico copiado.");
  };

  const statusText = isPaired && !isAuthenticated ? "Login necessário" : isTiMode
    ? profile?.online ? "Conectado" : isPaired ? "Aguardando heartbeat" : "Não pareado"
    : profile?.online ? "Conectado ao suporte" : isPaired ? "Sincronizando suporte" : "Não conectado";

  return (
    <div className="app-shell" onPaste={handlePaste} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <header className="titlebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Synapse para Windows</strong>
            <span>Suporte, chamados, atualização e monitoramento</span>
          </div>
        </div>
        <nav className="title-actions">
          <button onClick={() => refreshData(false)} disabled={!isAuthenticated}>Atualizar</button>
          <button onClick={() => { setSelectedTicketId(null); setComposer(""); }} disabled={!isAuthenticated}>Chamado</button>
          <button onClick={() => setHistoryOpen(true)} disabled={!isAuthenticated}>Histórico</button>
          <button className={hasUpdate ? "update-attention" : ""} onClick={() => { setUpdateOpen(true); checkForUpdates(false); }}>
            {hasUpdate ? `Atualização ${availableVersion}` : "Atualizações"}
          </button>
          <button onClick={() => setPolicyOpen(true)} disabled={!isAuthenticated}>24x7</button>
          <button onClick={() => window.synapse.openExternal("https://synapse-seven-nu.vercel.app")}>Web</button>
          <button onClick={() => setSettingsOpen(true)}>Config</button>
        </nav>
        <div className={`connection ${profile?.online ? "online" : ""}`}>
          <span />
          {statusText}
        </div>
        <div className="window-controls">
          <button aria-label="Minimizar" onClick={() => window.synapse.windowMinimize()}>-</button>
          <button aria-label="Maximizar" onClick={() => window.synapse.windowToggleMaximize()}>□</button>
          <button aria-label="Fechar" onClick={() => window.synapse.minimizeToTray()}>×</button>
        </div>
      </header>

      {!isPaired ? (
        <section className="setup-view">
          <div className="setup-card">
            <div className="eyebrow">Primeira execução</div>
            <h1>Conectar este computador ao Synapse</h1>
            <p>Informe o código SYNC gerado no painel web. O app vai conectar este computador à central de suporte e manter a sincronização em segundo plano.</p>
            <div className="setup-grid">
              <label>
                Código de pareamento
                <input value={pairCode} onChange={(event) => setPairCode(event.target.value.toUpperCase())} placeholder="SYNC-XXXX-XXXX" />
              </label>
              <label>
                Servidor Synapse
                <input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} />
              </label>
            </div>
            <div className="policy-box">
              <span>Importância deste computador</span>
              <label className="check"><input type="checkbox" checked={policy.isCritical24x7} onChange={(event) => setPolicy((current) => ({ ...current, isCritical24x7: event.target.checked, notifyOnOffline: event.target.checked || current.notifyOnOffline }))} /> Servidor ou máquina que deve ficar ligada 24 horas</label>
              <label className="check"><input type="checkbox" checked={policy.notifyOnOffline} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnOffline: event.target.checked }))} /> Avisar TI se parar de enviar heartbeat</label>
              <label className="check"><input type="checkbox" checked={policy.notifyOnNetworkLoss} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnNetworkLoss: event.target.checked }))} /> Comparar com outros PCs da mesma rede para diferenciar queda local/rede</label>
              <label>
                Tolerância sem heartbeat
                <input type="number" min={3} max={240} value={policy.offlineGraceMinutes} onChange={(event) => setPolicy((current) => ({ ...current, offlineGraceMinutes: Number(event.target.value) || 10 }))} />
              </label>
            </div>
            <div className="component-list">
              <span>Componentes incluídos</span>
              <label><input type="checkbox" checked readOnly /> Suporte e chat</label>
              <label><input type="checkbox" checked readOnly /> Sincronização segura</label>
              <label><input type="checkbox" checked readOnly /> Inicialização com o Windows</label>
              <label><input type="checkbox" checked readOnly /> Modo TI/Admin quando permitido</label>
            </div>
            <button className="primary large" disabled={busy} onClick={pairDevice}>{busy ? "Conectando..." : "Conectar Synapse"}</button>
          </div>
        </section>
      ) : !isAuthenticated ? (
        <section className="setup-view">
          <div className="setup-card login-card">
            <div className="eyebrow">Login obrigatório</div>
            <h1>Entrar para definir a tela e os dados</h1>
            <p>O computador já está pareado. Agora entre com usuário e senha para o Synapse liberar automaticamente a experiência correta: usuário comum, TI/Admin ou master_admin.</p>
            <div className="setup-grid">
              <label>
                E-mail
                <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="usuario@empresa.com" />
              </label>
              <label>
                Senha
                <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") loginUser(); }} />
              </label>
            </div>
            <div className="policy-box">
              <span>Monitoramento 24x7 deste PC</span>
              <label className="check"><input type="checkbox" checked={policy.isCritical24x7} onChange={(event) => setPolicy((current) => ({ ...current, isCritical24x7: event.target.checked, notifyOnOffline: event.target.checked || current.notifyOnOffline }))} /> Este PC é servidor/máquina crítica e deve ficar ligado</label>
              <label className="check"><input type="checkbox" checked={policy.notifyOnOffline} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnOffline: event.target.checked }))} /> Notificar se desligar ou parar heartbeat</label>
              <label className="check"><input type="checkbox" checked={policy.notifyOnNetworkLoss} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnNetworkLoss: event.target.checked }))} /> Avaliar se outros dispositivos da mesma rede continuam online</label>
            </div>
            <div className="modal-actions">
              <button onClick={clearLink}>Trocar pareamento</button>
              <button className="primary" disabled={busy} onClick={loginUser}>{busy ? "Entrando..." : "Entrar no Synapse"}</button>
            </div>
          </div>
        </section>
      ) : (
        <main className="workspace">
          <aside className="sidebar">
            <div className="profile-card">
              <div className="avatar">{(config.user_name || device?.username || "S").slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{config.user_name || profile?.usuario_nome || "Usuário Synapse"}</strong>
                <span>{isTiMode ? "Modo TI/Admin" : "Modo usuário comum"}</span>
              </div>
            </div>
            <div className="side-metrics">
              <div>
                <span>Ativos</span>
                <strong>{ticketInsights.active}</strong>
              </div>
              <div>
                <span>Aguardando</span>
                <strong>{ticketInsights.waiting}</strong>
              </div>
              <div>
                <span>Histórico</span>
                <strong>{ticketInsights.total}</strong>
              </div>
            </div>
            <button className="new-ticket" onClick={() => { setSelectedTicketId(null); setComposer(""); }}>
              Abrir chamado
            </button>
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className={`ticket-item ${selectedTicket?.id === ticket.id ? "active" : ""}`}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <span>{ticket.protocolo || `#${ticket.id}`} · {formatDateTimeBR(ticket.updatedAt || ticket.createdAt)}</span>
                  <strong>{ticket.titulo}</strong>
                  <em>{STATUS_LABELS[ticket.status || ""] || ticket.status || "Aberto"}</em>
                </button>
              ))}
              {tickets.length === 0 && <p className="empty">Nenhum chamado ainda. Escreva no chat para abrir o primeiro.</p>}
            </div>
          </aside>

          <section className="chat-panel">
            <div className="chat-header">
              <div>
                <span className="eyebrow">{selectedTicket?.protocolo || "Novo atendimento"}</span>
                <h2>{selectedTicket?.titulo || "Como podemos ajudar?"}</h2>
                <p>{selectedTicket ? `Atualizado em ${formatDateTimeBR(selectedTicket.updatedAt || selectedTicket.createdAt)}` : "Digite como conversa. O Synapse transforma em chamado com contexto."}</p>
              </div>
              <div className="status-actions">
                {selectedTicket?.status && <span className={`ticket-status ${selectedTicket.status}`}>{STATUS_LABELS[selectedTicket.status] || selectedTicket.status}</span>}
                {isTiMode && selectedTicket && (
                  <select value={selectedTicket.status || "aberto"} onChange={(event) => updateTicketStatus(event.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="context-strip">
              {contextCards.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <em>{item.detail}</em>
                </div>
              ))}
            </div>

            <div className="messages">
              {!selectedTicket && (
                <div className="assistant-card">
                  <span className="assistant-pulse" />
                  <strong>Abra chamado conversando.</strong>
                  <p>Escreva em linguagem natural. O primeiro envio abre o chamado, grava a mensagem inicial no histórico e mantém anexos, SLA e acompanhamento no mesmo contexto.</p>
                  <div className="quick-starters">
                    {quickStarters.map((item) => (
                      <button key={item} onClick={() => setComposer(item)}>{item}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div key={message.id || index} className={`message ${message.autor_email === config.user_email ? "mine" : ""}`}>
                  <div className="bubble">
                    <div className="message-meta">
                      <strong>{message.autor_nome || (message.tipo === "sistema" ? "Sistema" : "Synapse")}</strong>
                      <span>{formatDateTimeBR(message.createdAt)}</span>
                    </div>
                    {message.conteudo && <p>{message.conteudo}</p>}
                    {message.fileUrl && (
                      <a className="attachment" href={message.fileUrl} target="_blank" rel="noreferrer">
                        {message.fileType?.startsWith("image/") ? <img src={message.fileUrl} alt={message.fileName || "Anexo"} /> : null}
                        <span>{message.fileName || "Anexo"}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <footer className="composer">
              {!selectedTicket && isTiMode && (
                <div className="composer-options">
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>
              )}
              {attachments.length > 0 && (
                <div className="drafts">
                  {attachments.map((file, index) => (
                    <button key={`${file.name}-${index}`} onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}>
                      {file.type.startsWith("image/") ? <img src={file.dataUrl} alt={file.name} /> : <span className="file-icon">DOC</span>}
                      <span>{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="composer-row">
                <label className="attach-button">
                  Anexar
                  <input type="file" multiple onChange={(event) => addFiles(Array.from(event.target.files || []))} />
                </label>
                <textarea
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  placeholder={selectedTicket ? "Responder ao chamado..." : "Descreva o problema para abrir um chamado..."}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) sendComposer();
                  }}
                />
                <button className="primary" disabled={busy} onClick={sendComposer}>{busy ? "Enviando..." : selectedTicket ? "Enviar" : "Abrir chamado"}</button>
              </div>
              <small>Ctrl+V cola prints. Arraste arquivos para anexar. Ctrl+Enter envia.</small>
            </footer>
          </section>

          <aside className="inspector">
            <div className="card">
              <span className="eyebrow">{isTiMode ? "Este computador" : "Atendimento"}</span>
              <h3>{isTiMode ? (profile?.hostname || device?.hostname) : "Central de suporte"}</h3>
              <p>{isTiMode ? (profile?.so || device?.os) : "Seu chat, chamados, anexos e histórico ficam aqui."}</p>
              {isTiMode ? (
                <dl>
                  <div><dt>IP</dt><dd>{profile?.ip || device?.ip || "-"}</dd></div>
                  <div><dt>Usuário</dt><dd>{profile?.usuario_nome || config.user_name || device?.username || "-"}</dd></div>
                  <div><dt>Última coleta</dt><dd>{formatDateTimeBR(profile?.ultimoContato)}</dd></div>
                  <div><dt>Worker</dt><dd>{workerRunning ? "Ativo" : "Aguardando"}</dd></div>
                </dl>
              ) : (
                <dl>
                  <div><dt>Usuário</dt><dd>{config.user_name || profile?.usuario_nome || "Synapse"}</dd></div>
                  <div><dt>Última sincronização</dt><dd>{formatDateTimeBR(profile?.ultimoContato)}</dd></div>
                  <div><dt>Status</dt><dd>{statusText}</dd></div>
                </dl>
              )}
            </div>
            <div className="card action-center">
              <span className="eyebrow">Ações rápidas</span>
              <div className="action-grid">
                <button onClick={() => { setSelectedTicketId(null); setComposer(""); }}>Chamado</button>
                <button onClick={() => setHistoryOpen(true)}>Histórico</button>
                <button onClick={() => { setUpdateOpen(true); checkForUpdates(false); }}>Update</button>
                <button onClick={() => setPolicyOpen(true)}>24x7</button>
              </div>
            </div>
            {isTiMode ? (
              <div className="card technical">
                <span className="eyebrow">Área TI/Admin</span>
                <h3>Dados técnicos</h3>
                <div className={`health-score ${deviceHealth.level}`}>
                  <span>Score de saúde</span>
                  <strong>{deviceHealth.score}</strong>
                  <em>{deviceHealth.label} · {deviceHealth.summary}</em>
                </div>
                <Metric label="CPU" value={metric?.cpuUso != null ? `${metric.cpuUso}%` : "-"} />
                <Metric label="RAM" value={metric?.ramUsoPct != null ? `${metric.ramUsoPct}%` : "-"} />
                <Metric label="Disco" value={metric?.discoUsoPct != null ? `${metric.discoUsoPct}%` : "-"} />
                <Metric label="Download" value={bytesLabel(metric?.redeRecebidoKb)} />
                <Metric label="Upload" value={bytesLabel(metric?.redeEnviadoKb)} />
                <Metric label="AnyDesk" value={profile?.anydeskId || metric?.anydeskId || "-"} mono />
                <Metric label="GPU" value={profile?.gpuModel || "-"} />
                <Metric label="Placa-mãe" value={profile?.placaMaeModelo || metric?.placaMaeModelo || "-"} />
                <Metric label="Socket" value={profile?.socketCpu || metric?.socketCpu || "-"} />
                <Metric label="Serial/Asset" value={profile?.serialNumber || profile?.assetTag || "-"} />
                <div className="tech-note">PowerShell remoto não aparece para usuário comum. Ações técnicas dependem de política/auditoria no Synapse.</div>
              </div>
            ) : (
              <div className="card simple-note">
                <span className="eyebrow">Privacidade</span>
                <h3>Modo usuário comum</h3>
                <p>Você vê apenas chamados, chat, anexos, histórico e status. Recursos internos ficam disponíveis somente para a equipe autorizada.</p>
                <button onClick={() => setLoginOpen(true)}>Trocar usuário / entrar como TI</button>
              </div>
            )}
          </aside>
        </main>
      )}

      {settingsOpen && (
        <Modal title="Configurações do Synapse" onClose={() => setSettingsOpen(false)}>
          <label>Servidor Synapse<input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} /></label>
          <label className="check"><input type="checkbox" checked={autoLaunch} onChange={(event) => setAutoLaunch(event.target.checked)} /> Iniciar com o Windows</label>
          <label className="check"><input type="checkbox" checked={policy.isCritical24x7} onChange={(event) => setPolicy((current) => ({ ...current, isCritical24x7: event.target.checked, notifyOnOffline: event.target.checked || current.notifyOnOffline }))} /> PC crítico 24x7</label>
          <label className="check"><input type="checkbox" checked={policy.notifyOnOffline} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnOffline: event.target.checked }))} /> Alertar se ficar offline</label>
          <label className="check"><input type="checkbox" checked={policy.notifyOnNetworkLoss} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnNetworkLoss: event.target.checked }))} /> Comparar perda de rede com outros dispositivos</label>
          <div className="modal-actions">
            <button onClick={clearLink}>Limpar vínculo antigo</button>
            <button className="primary" onClick={saveSettings}>Salvar</button>
          </div>
        </Modal>
      )}

      {historyOpen && (
        <Modal title="Histórico de chamados" onClose={() => setHistoryOpen(false)}>
          <div className="history-list">
            {tickets.map((ticket) => (
              <button key={ticket.id} onClick={() => { setSelectedTicketId(ticket.id); setHistoryOpen(false); }}>
                <strong>{ticket.titulo}</strong>
                <span>{ticket.protocolo || `#${ticket.id}`} · {STATUS_LABELS[ticket.status || ""] || ticket.status} · {formatDateTimeBR(ticket.updatedAt)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {loginOpen && (
        <Modal title="Entrar no Synapse" onClose={() => setLoginOpen(false)}>
          <label>E-mail<input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
          <label>Senha<input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
          <div className="modal-actions">
            <button onClick={() => setLoginOpen(false)}>Cancelar</button>
            <button className="primary" disabled={busy} onClick={loginUser}>Entrar</button>
          </div>
        </Modal>
      )}

      {policyOpen && (
        <Modal title="Monitoramento 24x7 deste PC" onClose={() => setPolicyOpen(false)}>
          <p className="modal-copy">Use isso para servidores e máquinas que precisam ficar ligadas. A TI verá se só este PC caiu ou se a rede inteira aparenta estar indisponível.</p>
          <label className="check"><input type="checkbox" checked={policy.isCritical24x7} onChange={(event) => setPolicy((current) => ({ ...current, isCritical24x7: event.target.checked, notifyOnOffline: event.target.checked || current.notifyOnOffline }))} /> Este PC deve ficar ligado 24 horas</label>
          <label className="check"><input type="checkbox" checked={policy.notifyOnOffline} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnOffline: event.target.checked }))} /> Avisar se desligar ou parar de enviar heartbeat</label>
          <label className="check"><input type="checkbox" checked={policy.notifyOnNetworkLoss} onChange={(event) => setPolicy((current) => ({ ...current, notifyOnNetworkLoss: event.target.checked }))} /> Comparar com outros dispositivos da mesma rede</label>
          <label>Tolerância sem heartbeat em minutos<input type="number" min={3} max={240} value={policy.offlineGraceMinutes} onChange={(event) => setPolicy((current) => ({ ...current, offlineGraceMinutes: Number(event.target.value) || 10 }))} /></label>
          <label>Observação para TI<textarea value={policy.monitoringNotes} onChange={(event) => setPolicy((current) => ({ ...current, monitoringNotes: event.target.value }))} placeholder="Ex: servidor fiscal, computador do financeiro, notebook de diretoria..." /></label>
          <div className="modal-actions">
            <button onClick={() => setPolicyOpen(false)}>Cancelar</button>
            <button className="primary" disabled={busy} onClick={() => savePolicy()}>Salvar monitoramento</button>
          </div>
        </Modal>
      )}

      {updateOpen && (
        <Modal title="Atualizações do Synapse" onClose={() => setUpdateOpen(false)}>
          <div className="update-panel">
            <span className={hasUpdate ? "update-badge available" : "update-badge"}>{hasUpdate ? "Atualização disponível" : "Atualizado"}</span>
            <h3>Instalado: {appVersion}</h3>
            <p>Disponível: {availableVersion || "consultando..."}</p>
            {updateInfo?.minimumVersion && <p>Versão mínima: {updateInfo.minimumVersion}</p>}
            {(updateInfo?.releaseDate || updateInfo?.publishedAt) && <p>Publicado em: {formatDateTimeBR(updateInfo.releaseDate || updateInfo.publishedAt)}</p>}
            {updateInfo?.sha256 && <p className="mono">SHA256: {updateInfo.sha256}</p>}
            {updateInfo?.sizeBytes ? <p>Tamanho: {fileSizeLabel(updateInfo.sizeBytes)}</p> : null}
            {!hasUpdate && availableVersion && <p className="update-ok">Você já está na versão mais recente.</p>}
            {releaseNotes.length ? (
              <ul>{releaseNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            ) : (
              <p>O aplicativo consulta o backend oficial e pode baixar o instalador automaticamente quando houver nova versão.</p>
            )}
          </div>
          <div className="modal-actions">
            <button disabled={updateBusy} onClick={() => checkForUpdates(false)}>{updateBusy ? "Consultando..." : "Verificar agora"}</button>
            <button
              className="primary"
              disabled={!hasUpdate || !updateInfo?.downloadUrl || updateBusy}
              onClick={async () => {
                if (!hasUpdate || !updateInfo?.downloadUrl) {
                  notify("Você já está na versão mais recente.");
                  return;
                }
                setUpdateBusy(true);
                try {
                  await window.synapse.downloadUpdate(updateInfo.downloadUrl, availableVersion || appVersion);
                  notify("Instalador de atualização iniciado.");
                } catch (error) {
                  notify((error as Error).message || "Falha ao iniciar atualização.");
                } finally {
                  setUpdateBusy(false);
                }
              }}
            >
              {hasUpdate ? "Baixar e instalar" : "Já atualizado"}
            </button>
          </div>
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <header><h2>{title}</h2><button onClick={onClose}>Fechar</button></header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="metric"><span>{label}</span><strong className={mono ? "mono" : ""}>{value}</strong></div>;
}

createRoot(document.getElementById("root")!).render(<App />);
