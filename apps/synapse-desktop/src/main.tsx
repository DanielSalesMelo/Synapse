import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import type { AgentConfig, AgentProfile, AttachmentDraft, DeviceInfo, Message, Ticket } from "./types";

const DEFAULT_SERVER = "https://synapse-backend-ds2026.azurewebsites.net";
const CATEGORIES = ["hardware", "software", "rede", "acesso", "email", "impressora", "outro"];
const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  triagem_ia: "Triagem IA",
  aguardando_usuario: "Aguardando usuário",
  aguardando_ti: "Aguardando TI",
  em_andamento: "Em andamento",
  acesso_remoto_solicitado: "Acesso remoto solicitado",
  em_acesso_remoto: "Em acesso remoto",
  resolvido: "Resolvido",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
  reaberto: "Reaberto",
};

const formatDateTimeBR = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const bytesLabel = (kb?: number | string | null) => {
  const value = Number(kb ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} GB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} MB`;
  return `${value.toFixed(0)} KB`;
};

const firstLineTitle = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Solicitação via Synapse";
  return clean.length > 64 ? `${clean.slice(0, 61)}...` : clean;
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
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [workerRunning, setWorkerRunning] = useState(false);
  const lastMessageRef = useRef<number | null>(null);

  const isPaired = Boolean(config.token);
  const isTiMode = config.agent_mode === "ti" && Boolean(config.user_is_ti);
  const selectedTicket = useMemo(
    () => selectedTicketId === null ? null : tickets.find((ticket) => ticket.id === selectedTicketId) ?? tickets[0] ?? null,
    [selectedTicketId, tickets],
  );
  const metric = profile?.ultima_metrica ?? null;

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

  const refreshMessages = useCallback(async () => {
    if (!config.token || !selectedTicket?.id) {
      setMessages([]);
      return;
    }
    try {
      const base = isTiMode ? "/api/agent/ti/tickets" : "/api/agent/tickets";
      const nextMessages = await api(`${base}/${selectedTicket.id}/messages`);
      const list = Array.isArray(nextMessages) ? nextMessages : [];
      const lastId = Number(list[list.length - 1]?.id || 0);
      if (lastId && lastMessageRef.current && lastId !== lastMessageRef.current) {
        window.synapse.notify("Nova mensagem no Synapse", selectedTicket.titulo || "Chamado atualizado");
      }
      if (lastId) lastMessageRef.current = lastId;
      setMessages(list);
    } catch (error) {
      notify((error as Error).message || "Falha ao carregar conversa.");
    }
  }, [api, config.token, isTiMode, notify, selectedTicket]);

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
    if (!config.token) return;
    refreshData(true);
    const id = window.setInterval(() => refreshData(true), 12000);
    return () => window.clearInterval(id);
  }, [config.token, refreshData]);

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
        user_name: payload.userName || payload.user?.name || "",
        user_email: payload.userEmail || payload.user?.email || "",
        user_role: payload.userRole || payload.user?.role || "",
        user_is_ti: Boolean(payload.userIsTi || payload.user?.isTiManager),
        agent_mode: payload.userIsTi || payload.user?.isTiManager ? "ti" : "simple",
      });
      setConfig(nextConfig);
      await window.synapse.startWorker();
      notify("PC pareado com sucesso.");
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
    notify("Vínculo local limpo. Gere um novo código SYNC no painel web.");
  };

  const loginTi = async () => {
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
      if (!result?.user?.isTiManager) throw new Error("Este usuário não possui permissão TI/Admin.");
      const next = await window.synapse.saveConfig({
        user_name: result.user.name,
        user_email: result.user.email,
        user_role: result.user.role,
        user_is_ti: true,
        agent_mode: "ti",
      });
      setConfig(next);
      setLoginOpen(false);
      setLoginPassword("");
      notify("Modo TI/Admin ativado.");
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
      if (!ticket) {
        if (isTiMode) throw new Error("Selecione uma demanda para responder no modo TI/Admin.");
        ticket = await api("/api/agent/tickets/open", {
          method: "POST",
          body: JSON.stringify({
            titulo: firstLineTitle(composer),
            descricao: composer.trim() || "Anexo enviado pelo agente Synapse.",
            categoria: category,
            prioridade: priority,
          }),
        });
        setSelectedTicketId(ticket.id);
        await refreshData(true);
      } else if (composer.trim()) {
        const base = isTiMode ? "/api/agent/ti/tickets" : "/api/agent/tickets";
        await api(`${base}/${ticket.id}/messages`, {
          method: "POST",
          body: JSON.stringify({ conteudo: composer.trim() }),
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
      await Promise.all([refreshData(true), refreshMessages()]);
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

  const statusText = profile?.online ? "Conectado" : isPaired ? "Aguardando heartbeat" : "Não pareado";

  return (
    <div className="app-shell" onPaste={handlePaste} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <header className="titlebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>Synapse para Windows</strong>
            <span>Suporte, chamados e monitoramento sincronizados</span>
          </div>
        </div>
        <nav className="top-menu">
          <MenuButton label="Arquivo" items={["Atualizar", "Minimizar", "Sair"]} onPick={(item) => {
            if (item === "Atualizar") refreshData(false);
            if (item === "Minimizar") window.synapse.minimizeToTray();
            if (item === "Sair") window.synapse.quit();
          }} />
          <MenuButton label="Atendimento" items={["Novo chamado", "Histórico"]} onPick={(item) => {
            if (item === "Novo chamado") setSelectedTicketId(null);
            if (item === "Histórico") setHistoryOpen(true);
          }} />
          <MenuButton label="Ferramentas" items={isTiMode ? ["Copiar diagnóstico", "Painel web", "Área técnica"] : ["Copiar diagnóstico", "Painel web"]} onPick={(item) => {
            if (item === "Copiar diagnóstico") copyDiagnostics();
            if (item === "Painel web") window.synapse.openExternal("https://synapse-seven-nu.vercel.app");
            if (item === "Área técnica") notify("Área técnica disponível apenas com políticas remotas aprovadas.");
          }} />
          <MenuButton label="Configurações" items={["Pareamento", "Limpar vínculo antigo"]} onPick={(item) => {
            if (item === "Pareamento") setSettingsOpen(true);
            if (item === "Limpar vínculo antigo") clearLink();
          }} />
          <MenuButton label="Ajuda" items={["Abrir ajuda", `Sobre ${appVersion}`]} onPick={(item) => {
            if (item === "Abrir ajuda") window.synapse.openExternal("https://synapse-seven-nu.vercel.app/ajuda");
            else notify(`Synapse para Windows ${appVersion}`);
          }} />
        </nav>
        <div className={`connection ${profile?.online ? "online" : ""}`}>
          <span />
          {statusText}
        </div>
      </header>

      {!isPaired ? (
        <section className="setup-view">
          <div className="setup-card">
            <div className="eyebrow">Primeira execução</div>
            <h1>Conectar este computador ao Synapse</h1>
            <p>Informe o código SYNC gerado no painel web. O app vai parear este PC, iniciar o monitoramento em segundo plano e abrir a central de suporte.</p>
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
            <div className="component-list">
              <span>Componentes incluídos</span>
              <label><input type="checkbox" checked readOnly /> Suporte e chat</label>
              <label><input type="checkbox" checked readOnly /> Monitoramento e heartbeat</label>
              <label><input type="checkbox" checked readOnly /> Inicialização com o Windows</label>
              <label><input type="checkbox" checked readOnly /> Modo TI/Admin quando permitido</label>
            </div>
            <button className="primary large" disabled={busy} onClick={pairDevice}>{busy ? "Conectando..." : "Conectar Synapse"}</button>
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
            <button className="new-ticket" onClick={() => { setSelectedTicketId(null); setComposer(""); }}>
              Novo chamado por conversa
            </button>
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className={`ticket-item ${selectedTicket?.id === ticket.id ? "active" : ""}`}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <span>{ticket.protocolo || `#${ticket.id}`}</span>
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

            <div className="messages">
              {!selectedTicket && (
                <div className="assistant-card">
                  <strong>Abra chamado conversando.</strong>
                  <p>Descreva o problema como em um chat: “Minha VPN caiu”, “Meu sistema não abre”, “Meu notebook está lento”. Prints e arquivos podem ser colados ou arrastados aqui.</p>
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
              {!selectedTicket && (
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
              <span className="eyebrow">Este computador</span>
              <h3>{profile?.hostname || device?.hostname}</h3>
              <p>{profile?.so || device?.os}</p>
              <dl>
                <div><dt>IP</dt><dd>{profile?.ip || device?.ip || "-"}</dd></div>
                <div><dt>Usuário</dt><dd>{profile?.usuario_nome || config.user_name || device?.username || "-"}</dd></div>
                <div><dt>Última coleta</dt><dd>{formatDateTimeBR(profile?.ultimoContato)}</dd></div>
                <div><dt>Worker</dt><dd>{workerRunning ? "Ativo" : "Aguardando"}</dd></div>
              </dl>
            </div>
            {isTiMode ? (
              <div className="card technical">
                <span className="eyebrow">Área TI/Admin</span>
                <h3>Dados técnicos</h3>
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
                <p>Você vê apenas chamados, chat, anexos e status. Dados técnicos, AnyDesk e comandos ficam ocultos.</p>
                <button onClick={() => setLoginOpen(true)}>Entrar como TI/Admin</button>
              </div>
            )}
          </aside>
        </main>
      )}

      {settingsOpen && (
        <Modal title="Configurações do Synapse" onClose={() => setSettingsOpen(false)}>
          <label>Servidor Synapse<input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} /></label>
          <label className="check"><input type="checkbox" checked={autoLaunch} onChange={(event) => setAutoLaunch(event.target.checked)} /> Iniciar com o Windows</label>
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
        <Modal title="Entrar como TI/Admin" onClose={() => setLoginOpen(false)}>
          <label>E-mail<input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
          <label>Senha<input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
          <div className="modal-actions">
            <button onClick={() => setLoginOpen(false)}>Cancelar</button>
            <button className="primary" disabled={busy} onClick={loginTi}>Entrar</button>
          </div>
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function MenuButton({ label, items, onPick }: { label: string; items: string[]; onPick: (item: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="menu-button" onMouseLeave={() => setOpen(false)}>
      <button onClick={() => setOpen((value) => !value)}>{label}</button>
      {open && (
        <div className="menu-popover">
          {items.map((item) => <button key={item} onClick={() => { setOpen(false); onPick(item); }}>{item}</button>)}
        </div>
      )}
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
