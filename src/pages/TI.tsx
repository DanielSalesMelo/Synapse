import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Monitor, Headphones, AlertCircle, CheckCircle2, Search,
  Wrench, Cpu, HardDrive, Server, Key, Shield, ShoppingCart,
  Network, Activity, AlertTriangle, Clock, User, Building2,
  Thermometer, Wifi, Package, FileText, ExternalLink,
  RefreshCw, TrendingUp, Eye, Edit, Trash2, Send, Paperclip,
  Download, Link2, QrCode, Copy, Check, X, ChevronRight,
  BarChart2, Database, Settings, Zap, Bell, BellRing,
  Image as ImageIcon, MessageSquare, Calendar, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

// ─── Helpers de cor ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  em_andamento: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  aguardando: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  resolvido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  fechado: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};
const PRIORIDADE_COLORS: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-orange-100 text-orange-700",
  critica: "bg-red-100 text-red-700",
};
const PRIORIDADE_ICONS: Record<string, string> = {
  baixa: "🟢", media: "🔵", alta: "🟠", critica: "🔴",
};

// ─── Componente de Lightbox ───────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={onClose}>
        <X className="h-8 w-8" />
      </button>
      <img src={src} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── Componente de Chat do Chamado ────────────────────────────────────────────
function TicketChat({ ticketId, empresaId }: { ticketId: number; empresaId: number }) {
  const { user } = useAuth();
  const [msg, setMsg] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; nome: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const mensagensQ = trpc.ti.listMensagens.useQuery({ ticketId }, { refetchInterval: 5000 });
  const sendMsg = trpc.ti.sendMensagem.useMutation({
    onSuccess: () => {
      mensagensQ.refetch();
      setMsg("");
      setPreview(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensQ.data]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    const token = localStorage.getItem("synapse-auth-token") ?? "";
    const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3001" : "";
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${baseUrl}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.url) setPreview({ url: data.url, nome: file.name });
      else toast.error("Erro ao enviar arquivo");
    } catch { toast.error("Erro ao enviar arquivo"); }
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((i) => i.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) uploadFile(file);
    }
  }, []);

  const handleSend = () => {
    if (!msg.trim() && !preview) return;
    const isImg = preview && /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(preview.url);
    sendMsg.mutate({
      ticketId,
      conteudo: msg || (preview ? `📎 ${preview.nome}` : ""),
      tipo: preview ? (isImg ? "imagem" : "anexo") : "texto",
      anexoUrl: preview?.url,
      anexoNome: preview?.nome,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(url) || url.startsWith("data:image");

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden" style={{ height: 420 }}>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      {/* Header do chat */}
      <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2 shrink-0">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Chat do Chamado</span>
        <span className="text-xs text-muted-foreground ml-1">— converse com o solicitante</span>
        <Badge variant="secondary" className="text-xs ml-auto">{mensagensQ.data?.length ?? 0}</Badge>
      </div>
      {/* Mensagens */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {(mensagensQ.data ?? []).map((m: any) => {
            const isMine = m.autorId === user?.id;
            return (
              <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""} ${m.tipo === "sistema" ? "justify-center" : ""}`}>
                {m.tipo === "sistema" ? (
                  <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">{m.conteudo}</p>
                ) : (
                  <>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isMine ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {(m.autorNome ?? "?")[0].toUpperCase()}
                    </div>
                    <div className={`flex-1 min-w-0 max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`flex items-center gap-2 mb-0.5 ${isMine ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-medium">{isMine ? "Você" : (m.autorNome ?? "Usuário")}</span>
                        {m.isInterno && <Badge variant="outline" className="text-xs py-0 h-4">Interno</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {m.tipo === "imagem" || (m.anexoUrl && isImage(m.anexoUrl)) ? (
                        <div className={isMine ? "self-end" : ""}>
                          {m.conteudo && !m.conteudo.startsWith("📎") && <p className="text-sm mb-1">{m.conteudo}</p>}
                          <img src={m.anexoUrl} alt="Imagem" className="max-w-[240px] max-h-[180px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity border" onClick={() => setLightbox(m.anexoUrl)} />
                        </div>
                      ) : m.anexoUrl ? (
                        <a href={m.anexoUrl} target="_blank" rel="noreferrer" className={`text-sm underline text-primary flex items-center gap-1 ${
                          isMine ? "self-end" : ""
                        }`}>
                          <FileText className="h-3.5 w-3.5" />{m.anexoNome ?? "Arquivo"}
                        </a>
                      ) : (
                        <p className={`text-sm rounded-xl px-3 py-2 break-words ${
                          isMine ? "bg-primary text-primary-foreground self-end" : "bg-muted/60 text-foreground"
                        }`}>{m.conteudo}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {(mensagensQ.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda. Inicie a conversa!</p>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      {/* Preview de arquivo */}
      {preview && (
        <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-2 shrink-0">
          {isImage(preview.url) ? (
            <img src={preview.url} alt="Preview" className="h-10 w-10 object-cover rounded border" />
          ) : (
            <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>
          )}
          <div className="flex-1 text-xs text-muted-foreground truncate">{preview.nome}</div>
          <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      )}
      {/* Input */}
      <div className="p-2 border-t flex gap-1.5 shrink-0">
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          title="Anexar arquivo ou imagem"
        >
          {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <Input
          ref={inputRef}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={preview ? "Legenda (opcional)..." : "Digite uma mensagem... (Enter para enviar)"}
          className="flex-1 text-sm"
          autoFocus
        />
        <Button size="sm" onClick={handleSend} disabled={sendMsg.isPending || (!msg.trim() && !preview)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Componente de Detalhe do Chamado ─────────────────────────────────────────
function TicketDetail({ ticket, onClose, empresaId }: { ticket: any; onClose: () => void; empresaId: number }) {
  const [, navigate] = useLocation();
  const updateTicket = trpc.ti.updateTicket.useMutation({
    onSuccess: () => toast.success("Chamado atualizado!"),
  });
  const updateStatus = trpc.ti.updateTicketStatus.useMutation({
    onSuccess: () => toast.success("Status atualizado!"),
  });
  const tecnicos = trpc.ti.listTecnicos.useQuery();

  const slaPercent = ticket.slaHoras && ticket.createdAt
    ? Math.min(100, Math.round(((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * ticket.slaHoras)) * 100))
    : null;

  const STATUS_FLOW = ["aberto", "em_andamento", "aguardando", "resolvido", "fechado"];
  const currentIdx = STATUS_FLOW.indexOf(ticket.status);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">#{ticket.id}</Badge>
            <Badge variant="outline" className="font-mono text-xs">{ticket.protocolo}</Badge>
            {ticket.numeroOs && <Badge variant="secondary" className="font-mono text-xs">OS #{ticket.numeroOs}</Badge>}
            <Badge className={`text-xs ${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace("_", " ")}</Badge>
          </div>
          <h3 className="font-semibold mt-1">{ticket.titulo}</h3>
          <p className="text-sm text-muted-foreground mt-1">{ticket.descricao}</p>
        </div>
      </div>

      {/* Solicitante */}
      <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{ticket.solicitante_nome || "Solicitante desconhecido"}</p>
            <p className="text-xs text-muted-foreground">
              {[ticket.solicitante_cargo, ticket.solicitante_departamento].filter(Boolean).join(" · ") || ticket.solicitante_email || ""}
            </p>
          </div>
        </div>
        {ticket.solicitante_id && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1 flex-shrink-0"
            onClick={() => navigate(`/chat?userId=${ticket.solicitante_id}`)}
          >
            <MessageSquare className="h-3 w-3" />
            Chat Direto
          </Button>
        )}
      </div>

      {/* Timeline de status */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STATUS_FLOW.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => updateStatus.mutate({ id: ticket.id, status: s as any })}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                i === currentIdx ? "bg-primary text-primary-foreground" :
                i < currentIdx ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {i < currentIdx ? <Check className="h-3 w-3 inline mr-1" /> : null}
              {s.replace("_", " ")}
            </button>
            {i < STATUS_FLOW.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* SLA */}
      {slaPercent !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">SLA ({ticket.slaHoras}h)</span>
            <span className={slaPercent > 80 ? "text-red-600 font-bold" : slaPercent > 60 ? "text-yellow-600" : "text-green-600"}>
              {slaPercent}% utilizado
            </span>
          </div>
          <Progress value={slaPercent} className={`h-2 ${slaPercent > 80 ? "[&>div]:bg-red-500" : slaPercent > 60 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
        </div>
      )}

      {/* Campos editáveis — somente equipe TI */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Prioridade (Equipe TI)</Label>
          <Select
            value={ticket.prioridade ?? "media"}
            onValueChange={(v) => updateTicket.mutate({ id: ticket.id, prioridade: v as any })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">🟢 Baixa</SelectItem>
              <SelectItem value="media">🔵 Média</SelectItem>
              <SelectItem value="alta">🟠 Alta</SelectItem>
              <SelectItem value="critica">🔴 Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Técnico Responsável</Label>
          <Select
            value={ticket.tecnicoId?.toString() ?? ""}
            onValueChange={(v) => updateTicket.mutate({ id: ticket.id, tecnicoId: parseInt(v) })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Atribuir técnico..." /></SelectTrigger>
            <SelectContent>
              {(tecnicos.data ?? []).map((t: any) => (
                <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Prazo</Label>
          <Input
            type="datetime-local"
            className="h-8 text-xs"
            defaultValue={ticket.prazo ? new Date(ticket.prazo).toISOString().slice(0, 16) : ""}
            onBlur={(e) => e.target.value && updateTicket.mutate({ id: ticket.id, prazo: new Date(e.target.value).toISOString() })}
          />
        </div>
        <div>
          <Label className="text-xs">SLA (horas)</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            defaultValue={ticket.slaHoras ?? ""}
            onBlur={(e) => e.target.value && updateTicket.mutate({ id: ticket.id, slaHoras: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Custo Estimado (R$)</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            defaultValue={ticket.custoEstimado ?? ""}
            onBlur={(e) => e.target.value && updateTicket.mutate({ id: ticket.id, custoEstimado: parseFloat(e.target.value) })}
          />
        </div>
      </div>

      {/* Chat */}
      <TicketChat ticketId={ticket.id} empresaId={empresaId} />
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TI() {
  const { user } = useAuth();
  const empresaId = user?.empresaId ?? 0;

  const [location, setLocation] = useLocation();
  const [tab, setTab] = useState(location.split("/")[2] || "dashboard");

  useEffect(() => {
    const currentTab = location.split("/")[2] || "dashboard";
    if (currentTab !== tab) setTab(currentTab);
  }, [location]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setLocation(`/ti/${newTab}`);
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showNew, setShowNew] = useState(false);
  const [showNewAtivo, setShowNewAtivo] = useState(false);
  const [showNewLicenca, setShowNewLicenca] = useState(false);
  const [showNewCompra, setShowNewCompra] = useState(false);
  const [showNewManutencao, setShowNewManutencao] = useState(false);
  const [showNewAcesso, setShowNewAcesso] = useState(false);
  const [showNewCertificado, setShowNewCertificado] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [selectedAgente, setSelectedAgente] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // ── Queries ──
  const dashboard = trpc.ti.dashboard.useQuery(undefined, { refetchInterval: 30000 });
  const ticketsQ = trpc.ti.listTickets.useQuery(
    { search, status: statusFilter === "todos" ? undefined : statusFilter },
    { refetchInterval: 15000 }
  );
  const ativosQ = trpc.ti.listAtivos.useQuery({ search }, { refetchInterval: 30000 });
  const licencasQ = trpc.ti.listLicencas.useQuery({ search }, { refetchInterval: 60000 });
  const comprasQ = trpc.ti.listCompras.useQuery(undefined, { refetchInterval: 60000 });
  const acessosQ = trpc.ti.listAcessos.useQuery(undefined, { refetchInterval: 60000 });
  const agentesQ = trpc.ti.listAgentes.useQuery(undefined, { refetchInterval: 20000 });
  const alertasQ = trpc.ti.listAlertas.useQuery({ limit: 20 }, { refetchInterval: 15000 });
  const manutencoesQ = trpc.ti.listManutencoes.useQuery(undefined, { refetchInterval: 60000 });
  const codigosQ = trpc.ti.listCodigosPareamento.useQuery(undefined, { refetchInterval: 30000 });
  const certificadosQ = trpc.ti.listCertificados.useQuery({ search }, { refetchInterval: 60000 });
  const agenteMetricas = trpc.ti.getAgenteMetricas.useQuery(
    { agenteId: selectedAgente?.id, periodo: "24h" },
    { enabled: !!selectedAgente?.id, refetchInterval: 30000 }
  );

  // ── Mutations ──
  const createTicket = trpc.ti.createTicket.useMutation({
    onSuccess: () => { ticketsQ.refetch(); dashboard.refetch(); setShowNew(false); toast.success("Chamado aberto!"); },
    onError: (err) => toast.error("Erro ao abrir chamado: " + (err.message || "tente novamente")),
  });
  const updateStatus = trpc.ti.updateTicketStatus.useMutation({
    onSuccess: () => { ticketsQ.refetch(); dashboard.refetch(); },
  });
  const createAtivo = trpc.ti.createAtivo.useMutation({
    onSuccess: () => { ativosQ.refetch(); setShowNewAtivo(false); toast.success("Ativo cadastrado!"); },
  });
  const createLicenca = trpc.ti.createLicenca.useMutation({
    onSuccess: () => { licencasQ.refetch(); setShowNewLicenca(false); toast.success("Licença adicionada!"); },
  });
  const createCompra = trpc.ti.createCompra.useMutation({
    onSuccess: () => { comprasQ.refetch(); setShowNewCompra(false); toast.success("Requisição criada!"); },
  });
  const createManutencao = trpc.ti.createManutencao.useMutation({
    onSuccess: () => { manutencoesQ.refetch(); setShowNewManutencao(false); toast.success("Manutenção registrada!"); },
  });
  const createAcesso = trpc.ti.createAcesso.useMutation({
    onSuccess: () => { acessosQ.refetch(); setShowNewAcesso(false); toast.success("Acesso cadastrado!"); },
  });
  const createCertificado = trpc.ti.createCertificado.useMutation({
    onSuccess: () => { certificadosQ.refetch(); setShowNewCertificado(false); toast.success("Certificado cadastrado!"); },
    onError: (err) => toast.error("Erro ao cadastrar: " + err.message),
  });
  const deleteCertificado = trpc.ti.deleteCertificado.useMutation({
    onSuccess: () => { certificadosQ.refetch(); toast.success("Certificado removido!"); },
  });
  const gerarCodigo = trpc.ti.gerarCodigoPareamento.useMutation({
    onSuccess: () => { codigosQ.refetch(); toast.success("Código gerado!"); },
    onError: (err) => toast.error("Erro ao gerar código: " + (err.message || "tente novamente")),
  });
  const revogarCodigo = trpc.ti.revogarCodigoPareamento.useMutation({
    onSuccess: () => { codigosQ.refetch(); toast.success("Código revogado!"); },
  });

  // ── Notificações na aba do navegador ──
  useEffect(() => {
    const abertos = dashboard.data?.tickets?.abertos ?? 0;
    const criticos = (alertasQ.data ?? []).filter((a: any) => a.severidade === "critico").length;
    const total = abertos + criticos;
    if (total > 0) {
      document.title = `(${total}) TI & Infraestrutura — Synapse`;
    } else {
      document.title = "TI & Infraestrutura — Synapse";
    }
    return () => { document.title = "Synapse"; };
  }, [dashboard.data, alertasQ.data]);

  // ── Formulários ──
  const [ticketForm, setTicketForm] = useState({
    titulo: "", descricao: "", categoria: "outro" as const, prioridade: "media" as const,
  });
  const [ticketAnexos, setTicketAnexos] = useState<{ nome: string; url: string; tipo: string; tamanho?: number }[]>([]);
  const [ticketAnexoPreviews, setTicketAnexoPreviews] = useState<{ nome: string; url: string; isImage: boolean }[]>([]);
  const ticketFileRef = useRef<HTMLInputElement>(null);

  const handleTicketFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const token = localStorage.getItem("synapse-auth-token") ?? "";
    const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3001" : "";
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch(`${baseUrl}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (data.url) {
          const isImg = file.type.startsWith("image/");
          setTicketAnexos((prev) => [...prev, { nome: file.name, url: data.url, tipo: file.type, tamanho: file.size }]);
          setTicketAnexoPreviews((prev) => [...prev, { nome: file.name, url: isImg ? data.url : "", isImage: isImg }]);
        }
      } catch { toast.error("Erro ao enviar arquivo"); }
    }
    e.target.value = "";
  };
  const [ativoForm, setAtivoForm] = useState({
    nome: "", tipo: "", marca: "", modelo: "", patrimonio: "", serial: "", setor: "", anydesk: "",
  });
  const [licencaForm, setLicencaForm] = useState({
    software: "", tipo: "Assinatura", totalLicencas: 1, licencasUsadas: 0,
    expiracao: "", custoMensal: 0, fornecedor: "", chave: "",
  });
  const [compraForm, setCompraForm] = useState({
    titulo: "", descricao: "", categoria: "hardware", valor: 0, fornecedor: "", urgencia: "normal",
  });
  const [manutencaoForm, setManutencaoForm] = useState({
    ativoId: 0, tipo: "preventiva", descricao: "", tecnico: "", custo: 0, dataAgendada: "",
  });
  const [acessoForm, setAcessoForm] = useState({
    maquina: "", setor: "", anydesk: "", teamviewer: "", responsavel: "", senha: "",
  });
  const [certificadoForm, setCertificadoForm] = useState({
    nome: "", tipo: "A1", vencimento: "", senha: "", observacoes: "",
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Copiado!");
  };

  // ── KPIs ──
  const kpiAbertos = dashboard.data?.tickets?.abertos ?? 0;
  const kpiAndamento = dashboard.data?.tickets?.emAndamento ?? 0;
  const kpiResolvidos = dashboard.data?.tickets?.resolvidos ?? 0;
  const kpiAtivos = ativosQ.data?.length ?? 0;
  const kpiOnline = (agentesQ.data ?? []).filter((a: any) => a.status === "online").length;
  const kpiAtencao = (alertasQ.data ?? []).filter((a: any) => a.severidade === "atencao").length;
  const kpiCriticos = (alertasQ.data ?? []).filter((a: any) => a.severidade === "critico").length;
  const kpiLicencas = licencasQ.data?.length ?? 0;
  const kpiCertificados = dashboard.data?.certificados?.total ?? 0;
  const kpiCertificadosExpirando = dashboard.data?.certificados?.expirando ?? 0;
  const kpiCertificadosVencidos = dashboard.data?.certificados?.vencidos ?? 0;

  return (
    <div className="space-y-6">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            TI & Infraestrutura
            {kpiCriticos > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs animate-pulse">
                {kpiCriticos}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">ITSM · ITAM · Monitoramento · Acessos Remotos · Licenças</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { dashboard.refetch(); ticketsQ.refetch(); ativosQ.refetch(); agentesQ.refetch(); alertasQ.refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />Atualizar
          </Button>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Chamado</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Abrir Novo Chamado</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                createTicket.mutate({ ...ticketForm, anexos: ticketAnexos.length ? ticketAnexos : undefined });
                setTicketAnexos([]);
                setTicketAnexoPreviews([]);
              }} className="space-y-4">
                <div>
                  <Label>Título *</Label>
                  <Input value={ticketForm.titulo} onChange={(e) => setTicketForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Descreva o problema brevemente" required />
                </div>
                <div>
                  <Label>Descrição detalhada *</Label>
                  <Textarea value={ticketForm.descricao} onChange={(e) => setTicketForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descreva com o máximo de detalhes..." rows={4} required />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={ticketForm.categoria} onValueChange={(v) => setTicketForm((p) => ({ ...p, categoria: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["hardware","software","rede","acesso","email","impressora","servidor","outro"].map((c) => (
                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">A prioridade será definida pela equipe de TI após análise do chamado.</p>
                {/* Anexos */}
                <div>
                  <Label>Anexos (imagens, prints, documentos)</Label>
                  <input ref={ticketFileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={handleTicketFileChange} />
                  <button type="button" onClick={() => ticketFileRef.current?.click()}
                    className="mt-1 w-full border-2 border-dashed border-border rounded-lg py-3 px-4 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors flex items-center justify-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Clique para anexar imagem ou arquivo
                  </button>
                  {ticketAnexoPreviews.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ticketAnexoPreviews.map((p, i) => (
                        <div key={i} className="relative group">
                          {p.isImage ? (
                            <img src={p.url} alt={p.nome} className="h-16 w-16 object-cover rounded border" />
                          ) : (
                            <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center text-xs text-center p-1 text-muted-foreground">{p.nome}</div>
                          )}
                          <button type="button" onClick={() => {
                            setTicketAnexos((prev) => prev.filter((_, j) => j !== i));
                            setTicketAnexoPreviews((prev) => prev.filter((_, j) => j !== i));
                          }} className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs hidden group-hover:flex items-center justify-center">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createTicket.isPending}>
                  {createTicket.isPending ? "Abrindo..." : "Abrir Chamado"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Chamados Abertos", value: kpiAbertos, color: "text-red-600" },
          { label: "Em Andamento", value: kpiAndamento, color: "text-yellow-600" },
          { label: "Resolvidos Hoje", value: kpiResolvidos, color: "text-green-600" },
          { label: "Total Ativos", value: kpiAtivos, color: "" },
          { label: "Online", value: kpiOnline, color: "text-green-600", border: "border-green-200" },
          { label: "Atenção", value: kpiAtencao, color: "text-yellow-600", border: "border-yellow-200" },
          { label: "Críticos", value: kpiCriticos, color: "text-red-600", border: "border-red-200" },
          { label: "Certificados", value: kpiCertificados, color: "" },
          { label: "Vencendo/Vencidos", value: `${kpiCertificadosExpirando}/${kpiCertificadosVencidos}`, color: (kpiCertificadosExpirando + kpiCertificadosVencidos) > 0 ? "text-orange-600" : "" },
        ].map((k) => (
          <Card key={k.label} className={k.border ?? ""}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-xs text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard"><Activity className="h-4 w-4 mr-1" />Visão Geral</TabsTrigger>
          <TabsTrigger value="tickets" className="relative">
            <Headphones className="h-4 w-4 mr-1" />Chamados
            {kpiAbertos > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px]">{kpiAbertos}</span>}
          </TabsTrigger>
          <TabsTrigger value="inventario"><HardDrive className="h-4 w-4 mr-1" />Inventário</TabsTrigger>
          <TabsTrigger value="monitoramento"><Cpu className="h-4 w-4 mr-1" />Monitoramento</TabsTrigger>
          <TabsTrigger value="acessos"><Key className="h-4 w-4 mr-1" />Acessos Remotos</TabsTrigger>
          <TabsTrigger value="licencas"><Shield className="h-4 w-4 mr-1" />Licenças</TabsTrigger>
          <TabsTrigger value="compras"><ShoppingCart className="h-4 w-4 mr-1" />Compras</TabsTrigger>
          <TabsTrigger value="manutencao"><Wrench className="h-4 w-4 mr-1" />Manutenção</TabsTrigger>
          <TabsTrigger value="agentes"><Network className="h-4 w-4 mr-1" />Agentes</TabsTrigger>
          <TabsTrigger value="certificados"><Shield className="h-4 w-4 mr-1" />Certificados</TabsTrigger>
          <TabsTrigger value="alertas" className="relative">
            <Bell className="h-4 w-4 mr-1" />Alertas
            {kpiCriticos > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] animate-pulse">{kpiCriticos}</span>}
          </TabsTrigger>
        </TabsList>

        {/* ══ VISÃO GERAL ══ */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Alertas Recentes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(alertasQ.data ?? []).slice(0, 6).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${a.severidade === "critico" ? "bg-red-500 animate-pulse" : a.severidade === "atencao" ? "bg-yellow-500" : "bg-blue-500"}`} />
                      <span className="text-sm">{a.mensagem}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
                {(alertasQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta ativo</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" />Chamados Recentes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(ticketsQ.data ?? []).slice(0, 5).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => { setSelectedTicket(t); setTab("tickets"); }}>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{t.titulo}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.protocolo}</p>
                    </div>
                    <Badge className={`text-xs ${PRIORIDADE_COLORS[t.prioridade] ?? ""}`}>{PRIORIDADE_ICONS[t.prioridade]} {t.prioridade}</Badge>
                  </div>
                ))}
                {(ticketsQ.data ?? []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum chamado recente</p>}
              </CardContent>
            </Card>
          </div>
          {/* Agentes online */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Network className="h-4 w-4 text-green-500" />Agentes Monitorados</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(agentesQ.data ?? []).slice(0, 8).map((a: any) => (
                  <div key={a.id} className={`p-2 rounded-lg border cursor-pointer hover:bg-muted/50 ${a.status === "online" ? "border-green-200" : "border-gray-200"}`} onClick={() => { setSelectedAgente(a); setTab("monitoramento"); }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`h-2 w-2 rounded-full ${a.status === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className="text-xs font-mono font-medium truncate">{a.hostname}</span>
                    </div>
                    {a.cpuUso != null && (
                      <div className="text-xs text-muted-foreground">CPU: {a.cpuUso}% · RAM: {a.ramUsoPct}%</div>
                    )}
                  </div>
                ))}
                {(agentesQ.data ?? []).length === 0 && (
                  <div className="col-span-4 text-center py-6 text-muted-foreground text-sm">
                    Nenhum agente instalado. Vá em <strong>Agentes</strong> para baixar e instalar.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ CHAMADOS ══ */}
        <TabsContent value="tickets" className="space-y-4 mt-4">
          {selectedTicket ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Detalhes do Chamado</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                    <X className="h-4 w-4 mr-1" />Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} empresaId={empresaId} />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar chamados..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS / Protocolo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aberto em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(ticketsQ.data ?? []).map((t: any) => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicket(t)}>
                        <TableCell>
                          <div className="font-mono text-xs">{t.protocolo}</div>
                          {t.numeroOs && <div className="font-mono text-xs text-muted-foreground">OS #{t.numeroOs}</div>}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{t.titulo}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{t.categoria}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${PRIORIDADE_COLORS[t.prioridade] ?? ""}`}>{PRIORIDADE_ICONS[t.prioridade]} {t.prioridade}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${STATUS_COLORS[t.status] ?? ""}`}>{t.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select value={t.status} onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as any })}>
                            <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aberto">Aberto</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="aguardando">Aguardando</SelectItem>
                              <SelectItem value="resolvido">Resolvido</SelectItem>
                              <SelectItem value="fechado">Fechado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(ticketsQ.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum chamado encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ══ INVENTÁRIO ══ */}
        <TabsContent value="inventario" className="space-y-4 mt-4">
          <div className="flex gap-2 justify-between flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar ativos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Dialog open={showNewAtivo} onOpenChange={setShowNewAtivo}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Cadastrar Ativo</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Cadastrar Novo Ativo</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createAtivo.mutate(ativoForm); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Nome / Hostname *</Label><Input value={ativoForm.nome} onChange={(e) => setAtivoForm((p) => ({ ...p, nome: e.target.value }))} placeholder="DESKTOP-FIN01" required /></div>
                    <div><Label>Tipo *</Label>
                      <Select value={ativoForm.tipo} onValueChange={(v) => setAtivoForm((p) => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {["Desktop","Notebook","Servidor","Switch","Roteador","Impressora","Tablet","Smartphone","Monitor","Outro"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Setor *</Label><Input value={ativoForm.setor} onChange={(e) => setAtivoForm((p) => ({ ...p, setor: e.target.value }))} placeholder="Financeiro, TI..." required /></div>
                    <div><Label>Marca</Label><Input value={ativoForm.marca} onChange={(e) => setAtivoForm((p) => ({ ...p, marca: e.target.value }))} placeholder="Dell, HP, Lenovo..." /></div>
                    <div><Label>Modelo</Label><Input value={ativoForm.modelo} onChange={(e) => setAtivoForm((p) => ({ ...p, modelo: e.target.value }))} placeholder="OptiPlex 7090..." /></div>
                    <div><Label>AnyDesk ID</Label><Input value={ativoForm.anydesk} onChange={(e) => setAtivoForm((p) => ({ ...p, anydesk: e.target.value }))} placeholder="123 456 789" /></div>
                    <div><Label>Patrimônio</Label><Input value={ativoForm.patrimonio} onChange={(e) => setAtivoForm((p) => ({ ...p, patrimonio: e.target.value }))} placeholder="PAT-001" /></div>
                    <div><Label>Serial / S/N</Label><Input value={ativoForm.serial} onChange={(e) => setAtivoForm((p) => ({ ...p, serial: e.target.value }))} placeholder="SN123456" /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createAtivo.isPending}>Cadastrar Ativo</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Hostname</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>AnyDesk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ativosQ.data ?? []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm font-medium">{a.nome}</TableCell>
                    <TableCell><Badge variant="outline">{a.tipo}</Badge></TableCell>
                    <TableCell className="text-sm">{a.marca} {a.modelo}</TableCell>
                    <TableCell><Badge variant="secondary">{a.setor}</Badge></TableCell>
                    <TableCell>
                      {a.anydesk ? (
                        <a href={`anydesk://${a.anydesk.replace(/\s/g, "")}`} className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1" title="Abrir AnyDesk">
                          <ExternalLink className="h-3 w-3" />{a.anydesk}
                        </a>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${a.status === "online" ? "text-green-600" : a.status === "atencao" ? "text-yellow-600" : a.status === "critico" ? "text-red-600" : "text-gray-500"}`}>
                        <div className={`h-2 w-2 rounded-full ${a.status === "online" ? "bg-green-500" : a.status === "atencao" ? "bg-yellow-500" : a.status === "critico" ? "bg-red-500" : "bg-gray-400"}`} />
                        {a.status ?? "offline"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {a.anydesk && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                          <a href={`anydesk://${a.anydesk.replace(/\s/g, "")}`}>
                            <ExternalLink className="h-3 w-3 mr-1" />Conectar
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(ativosQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum ativo cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ MONITORAMENTO ══ */}
        <TabsContent value="monitoramento" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(agentesQ.data ?? []).length} agente(s) · Atualização automática a cada 30s
            </p>
            <Button variant="outline" size="sm" onClick={() => agentesQ.refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />Atualizar
            </Button>
          </div>
          {selectedAgente ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono">{selectedAgente.hostname}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAgente(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">IP:</span> <span className="font-mono">{selectedAgente.ip}</span></div>
                  <div><span className="text-muted-foreground">SO:</span> <span>{selectedAgente.so}</span></div>
                  <div><span className="text-muted-foreground">AnyDesk:</span> {selectedAgente.anydeskId ? (
                    <a href={`anydesk://${selectedAgente.anydeskId}`} className="text-blue-600 hover:underline font-mono">{selectedAgente.anydeskId}</a>
                  ) : "—"}</div>
                  <div><span className="text-muted-foreground">Versão:</span> <span>{selectedAgente.versaoAgente}</span></div>
                </div>
                {/* Métricas em tempo real */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "CPU", value: selectedAgente.cpuUso, unit: "%", warn: 80, crit: 90 },
                    { label: "RAM", value: selectedAgente.ramUsoPct, unit: "%", warn: 80, crit: 90 },
                    { label: "Disco", value: selectedAgente.discoUsoPct, unit: "%", warn: 80, crit: 90 },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{m.label}</span>
                        <span className={m.value > m.crit ? "text-red-600 font-bold" : m.value > m.warn ? "text-yellow-600" : "text-muted-foreground"}>
                          {m.value ?? "—"}{m.value != null ? m.unit : ""}
                        </span>
                      </div>
                      <Progress value={m.value ?? 0} className="h-2" />
                    </div>
                  ))}
                </div>
                {/* Histórico de métricas */}
                {(agenteMetricas.data?.metricas ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Histórico (últimas 24h)</p>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Horário</TableHead>
                            <TableHead className="text-xs">CPU %</TableHead>
                            <TableHead className="text-xs">RAM %</TableHead>
                            <TableHead className="text-xs">Disco %</TableHead>
                            <TableHead className="text-xs">Rede ↑↓ KB</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(agenteMetricas.data?.metricas ?? []).slice(-20).reverse().map((m: any) => (
                            <TableRow key={m.id}>
                              <TableCell className="text-xs font-mono">{new Date(m.coletadoEm).toLocaleTimeString("pt-BR")}</TableCell>
                              <TableCell className={`text-xs ${m.cpuUso > 80 ? "text-red-600 font-bold" : ""}`}>{m.cpuUso}%</TableCell>
                              <TableCell className={`text-xs ${m.ramUsoPct > 80 ? "text-red-600 font-bold" : ""}`}>{m.ramUsoPct}%</TableCell>
                              <TableCell className="text-xs">{m.discoUsoPct}%</TableCell>
                              <TableCell className="text-xs">{m.redeEnviadoKb}↑ / {m.redeRecebidoKb}↓</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(agentesQ.data ?? []).map((a: any) => (
                <Card key={a.id} className={`border-l-4 cursor-pointer hover:shadow-md transition-shadow ${a.status === "online" ? "border-l-green-500" : a.status === "atencao" ? "border-l-yellow-500" : "border-l-gray-400"}`} onClick={() => setSelectedAgente(a)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono">{a.hostname}</CardTitle>
                      <div className="flex items-center gap-2">
                        {a.anydeskId && (
                          <a href={`anydesk://${a.anydeskId}`} className="text-blue-600 hover:text-blue-800" title={`AnyDesk: ${a.anydeskId}`} onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <div className={`h-2.5 w-2.5 rounded-full ${a.status === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.so} · {a.ip}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "CPU", value: a.cpuUso, icon: <Cpu className="h-3 w-3" /> },
                      { label: "RAM", value: a.ramUsoPct, icon: <Server className="h-3 w-3" /> },
                      { label: "Disco", value: a.discoUsoPct, icon: <HardDrive className="h-3 w-3" /> },
                    ].map((m) => (
                      <div key={m.label} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1">{m.icon}{m.label}</span>
                          <span className={m.value > 80 ? "text-red-600 font-bold" : "text-muted-foreground"}>{m.value != null ? `${m.value}%` : "—"}</span>
                        </div>
                        <Progress value={m.value ?? 0} className="h-1.5" />
                      </div>
                    ))}
                    {a.cpuTemp && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                        <Thermometer className="h-3 w-3" />{a.cpuTemp}°C
                        {a.anydeskId && <span className="ml-auto font-mono">{a.anydeskId}</span>}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Última coleta: {a.ultimaColeta ? new Date(a.ultimaColeta).toLocaleTimeString("pt-BR") : "—"}</p>
                  </CardContent>
                </Card>
              ))}
              {(agentesQ.data ?? []).length === 0 && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum agente instalado</p>
                  <p className="text-sm mt-1">Vá em <strong>Agentes</strong> para baixar e instalar o agente nos PCs.</p>
                  <Button className="mt-4" size="sm" onClick={() => setTab("agentes")}>Ir para Agentes</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ══ ACESSOS REMOTOS ══ */}
        <TabsContent value="acessos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Credenciais de acesso remoto centralizadas e auditadas.</p>
            <Dialog open={showNewAcesso} onOpenChange={setShowNewAcesso}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Adicionar Acesso</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Cadastrar Acesso Remoto</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createAcesso.mutate(acessoForm); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Máquina *</Label><Input value={acessoForm.maquina} onChange={(e) => setAcessoForm((p) => ({ ...p, maquina: e.target.value }))} placeholder="DESKTOP-FIN01" required /></div>
                    <div><Label>Setor</Label><Input value={acessoForm.setor} onChange={(e) => setAcessoForm((p) => ({ ...p, setor: e.target.value }))} placeholder="Financeiro" /></div>
                    <div><Label>AnyDesk ID</Label><Input value={acessoForm.anydesk} onChange={(e) => setAcessoForm((p) => ({ ...p, anydesk: e.target.value }))} placeholder="123 456 789" /></div>
                    <div><Label>TeamViewer ID</Label><Input value={acessoForm.teamviewer} onChange={(e) => setAcessoForm((p) => ({ ...p, teamviewer: e.target.value }))} placeholder="TV-8821-4453" /></div>
                    <div><Label>Responsável</Label><Input value={acessoForm.responsavel} onChange={(e) => setAcessoForm((p) => ({ ...p, responsavel: e.target.value }))} placeholder="Nome do usuário" /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createAcesso.isPending}>Cadastrar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>AnyDesk ID</TableHead>
                  <TableHead>TeamViewer</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Última Sessão</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(acessosQ.data ?? []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{a.maquina}</TableCell>
                    <TableCell><Badge variant="secondary">{a.setor}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{a.anydesk || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{a.teamviewer || "—"}</TableCell>
                    <TableCell className="text-sm">{a.responsavel}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.ultimaSessao ? new Date(a.ultimaSessao).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      {a.anydesk && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" asChild>
                          <a href={`anydesk://${a.anydesk.replace(/\s/g, "")}`}>
                            <ExternalLink className="h-3 w-3 mr-1" />AnyDesk
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(acessosQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum acesso cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ CERTIFICADOS DIGITAIS ══ */}
        <TabsContent value="certificados" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Gerenciamento de certificados digitais (A1, A3, SSL) e alertas de vencimento.</p>
            <Dialog open={showNewCertificado} onOpenChange={setShowNewCertificado}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Certificado</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Cadastrar Certificado Digital</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createCertificado.mutate(certificadoForm); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>Nome / Titular *</Label><Input value={certificadoForm.nome} onChange={(e) => setCertificadoForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Empresa LTDA - E-CNPJ" required /></div>
                    <div><Label>Tipo</Label>
                      <Select value={certificadoForm.tipo} onValueChange={(v) => setCertificadoForm((p) => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A1">A1 (Arquivo)</SelectItem>
                          <SelectItem value="A3">A3 (Token/Cartão)</SelectItem>
                          <SelectItem value="SSL">SSL (Website)</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Vencimento *</Label><Input type="date" value={certificadoForm.vencimento} onChange={(e) => setCertificadoForm((p) => ({ ...p, vencimento: e.target.value }))} required /></div>
                    <div className="col-span-2"><Label>Senha / PIN</Label><Input value={certificadoForm.senha} onChange={(e) => setCertificadoForm((p) => ({ ...p, senha: e.target.value }))} placeholder="Senha do certificado" /></div>
                    <div className="col-span-2"><Label>Observações</Label><Textarea value={certificadoForm.observacoes} onChange={(e) => setCertificadoForm((p) => ({ ...p, observacoes: e.target.value }))} placeholder="Detalhes adicionais..." rows={2} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createCertificado.isPending}>Cadastrar Certificado</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(certificadosQ.data ?? []).map((c: any) => {
                  const diasParaVencer = Math.ceil((new Date(c.vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const status = diasParaVencer < 0 ? "vencido" : diasParaVencer <= 30 ? "expirando" : "valido";
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(c.vencimento).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        {status === "vencido" ? <Badge className="bg-red-500">Vencido</Badge> :
                         status === "expirando" ? <Badge className="bg-orange-500 animate-pulse">Vence em {diasParaVencer} dias</Badge> :
                         <Badge className="bg-green-500">Válido</Badge>}
                      </TableCell>
                      <TableCell>
                        {c.senha ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">********</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(c.senha)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => { if(confirm("Remover este certificado?")) deleteCertificado.mutate({ id: c.id }); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(certificadosQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum certificado cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ LICENÇAS ══ */}
        <TabsContent value="licencas" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Controle de licenças de software, alertas de expiração e custos.</p>
            <Dialog open={showNewLicenca} onOpenChange={setShowNewLicenca}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Adicionar Licença</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Adicionar Licença</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createLicenca.mutate(licencaForm); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>Software *</Label><Input value={licencaForm.software} onChange={(e) => setLicencaForm((p) => ({ ...p, software: e.target.value }))} placeholder="Microsoft 365, Adobe CC..." required /></div>
                    <div><Label>Tipo</Label>
                      <Select value={licencaForm.tipo} onValueChange={(v) => setLicencaForm((p) => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Assinatura">Assinatura</SelectItem>
                          <SelectItem value="Perpétua">Perpétua</SelectItem>
                          <SelectItem value="OEM">OEM</SelectItem>
                          <SelectItem value="Volume">Volume</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Total de Licenças</Label><Input type="number" value={licencaForm.totalLicencas} onChange={(e) => setLicencaForm((p) => ({ ...p, totalLicencas: parseInt(e.target.value) }))} min={1} /></div>
                    <div><Label>Licenças em Uso</Label><Input type="number" value={licencaForm.licencasUsadas} onChange={(e) => setLicencaForm((p) => ({ ...p, licencasUsadas: parseInt(e.target.value) }))} min={0} /></div>
                    <div><Label>Expiração</Label><Input type="date" value={licencaForm.expiracao} onChange={(e) => setLicencaForm((p) => ({ ...p, expiracao: e.target.value }))} /></div>
                    <div><Label>Custo Mensal (R$)</Label><Input type="number" value={licencaForm.custoMensal} onChange={(e) => setLicencaForm((p) => ({ ...p, custoMensal: parseFloat(e.target.value) }))} /></div>
                    <div><Label>Fornecedor</Label><Input value={licencaForm.fornecedor} onChange={(e) => setLicencaForm((p) => ({ ...p, fornecedor: e.target.value }))} placeholder="Microsoft, Adobe..." /></div>
                    <div><Label>Chave / Serial</Label><Input value={licencaForm.chave} onChange={(e) => setLicencaForm((p) => ({ ...p, chave: e.target.value }))} placeholder="XXXXX-XXXXX-..." /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createLicenca.isPending}>Adicionar Licença</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(licencasQ.data ?? []).map((l: any) => {
              const uso = l.totalLicencas > 0 ? Math.round((l.licencasUsadas / l.totalLicencas) * 100) : 0;
              const expirandoEm30 = l.expiracao && new Date(l.expiracao) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              return (
                <Card key={l.id} className={expirandoEm30 ? "border-orange-300" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{l.software}</CardTitle>
                      {expirandoEm30 && <Badge className="bg-orange-100 text-orange-700 text-xs">Expirando em breve</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{l.tipo} · {l.fornecedor} · Expira: {l.expiracao ? new Date(l.expiracao).toLocaleDateString("pt-BR") : "—"}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Uso: {l.licencasUsadas} / {l.totalLicencas} licenças</span>
                      <span className={uso > 90 ? "text-red-600 font-bold" : "text-muted-foreground"}>{uso}%</span>
                    </div>
                    <Progress value={uso} className="h-2" />
                    {l.custoMensal > 0 && (
                      <p className="text-xs text-muted-foreground">Custo mensal: R$ {l.custoMensal.toLocaleString("pt-BR")}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {(licencasQ.data ?? []).length === 0 && (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma licença cadastrada</p>
                <Button className="mt-4" size="sm" onClick={() => setShowNewLicenca(true)}>
                  <Plus className="h-4 w-4 mr-2" />Adicionar Primeira Licença
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══ COMPRAS ══ */}
        <TabsContent value="compras" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Requisições de compra de hardware, software e periféricos.</p>
            <Dialog open={showNewCompra} onOpenChange={setShowNewCompra}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Requisição</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Nova Requisição de Compra</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createCompra.mutate(compraForm); }} className="space-y-4">
                  <div><Label>Título *</Label><Input value={compraForm.titulo} onChange={(e) => setCompraForm((p) => ({ ...p, titulo: e.target.value }))} placeholder="Notebook Dell para RH" required /></div>
                  <div><Label>Descrição</Label><Textarea value={compraForm.descricao} onChange={(e) => setCompraForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Detalhes da necessidade..." rows={3} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Categoria</Label>
                      <Select value={compraForm.categoria} onValueChange={(v) => setCompraForm((p) => ({ ...p, categoria: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["hardware","software","periférico","infraestrutura","outro"].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Urgência</Label>
                      <Select value={compraForm.urgencia} onValueChange={(v) => setCompraForm((p) => ({ ...p, urgencia: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Valor Estimado (R$)</Label><Input type="number" value={compraForm.valor} onChange={(e) => setCompraForm((p) => ({ ...p, valor: parseFloat(e.target.value) }))} /></div>
                    <div><Label>Fornecedor</Label><Input value={compraForm.fornecedor} onChange={(e) => setCompraForm((p) => ({ ...p, fornecedor: e.target.value }))} placeholder="Dell, Kabum..." /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createCompra.isPending}>Criar Requisição</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(comprasQ.data ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.titulo}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.categoria}</Badge></TableCell>
                    <TableCell><Badge className={`text-xs ${c.urgencia === "urgente" ? "bg-red-100 text-red-700" : c.urgencia === "alta" ? "bg-orange-100 text-orange-700" : ""}`}>{c.urgencia}</Badge></TableCell>
                    <TableCell className="text-sm">R$ {c.valor?.toLocaleString("pt-BR") ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{c.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
                {(comprasQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma requisição criada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ MANUTENÇÃO ══ */}
        <TabsContent value="manutencao" className="space-y-4 mt-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Ordens de serviço, manutenções preventivas e corretivas.</p>
            <Dialog open={showNewManutencao} onOpenChange={setShowNewManutencao}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Registrar Manutenção</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Registrar Manutenção</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createManutencao.mutate(manutencaoForm); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Ativo *</Label>
                      <Select value={manutencaoForm.ativoId.toString()} onValueChange={(v) => setManutencaoForm((p) => ({ ...p, ativoId: parseInt(v) }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione o ativo..." /></SelectTrigger>
                        <SelectContent>
                          {(ativosQ.data ?? []).map((a: any) => (
                            <SelectItem key={a.id} value={a.id.toString()}>{a.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={manutencaoForm.tipo} onValueChange={(v) => setManutencaoForm((p) => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preventiva">Preventiva</SelectItem>
                          <SelectItem value="corretiva">Corretiva</SelectItem>
                          <SelectItem value="upgrade">Upgrade</SelectItem>
                          <SelectItem value="limpeza">Limpeza</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2"><Label>Descrição *</Label><Textarea value={manutencaoForm.descricao} onChange={(e) => setManutencaoForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o serviço realizado..." rows={3} required /></div>
                    <div><Label>Técnico</Label><Input value={manutencaoForm.tecnico} onChange={(e) => setManutencaoForm((p) => ({ ...p, tecnico: e.target.value }))} placeholder="Nome do técnico" /></div>
                    <div><Label>Custo (R$)</Label><Input type="number" value={manutencaoForm.custo} onChange={(e) => setManutencaoForm((p) => ({ ...p, custo: parseFloat(e.target.value) }))} /></div>
                    <div className="col-span-2"><Label>Data Agendada</Label><Input type="datetime-local" value={manutencaoForm.dataAgendada} onChange={(e) => setManutencaoForm((p) => ({ ...p, dataAgendada: e.target.value }))} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createManutencao.isPending}>Registrar</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(manutencoesQ.data ?? []).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.ativoNome ?? m.ativoId}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{m.tipo}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{m.descricao}</TableCell>
                    <TableCell className="text-sm">{m.tecnico}</TableCell>
                    <TableCell className="text-sm">{m.custo ? `R$ ${m.custo.toLocaleString("pt-BR")}` : "—"}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{m.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.dataAgendada ? new Date(m.dataAgendada).toLocaleDateString("pt-BR") : new Date(m.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
                {(manutencoesQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma manutenção registrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ AGENTES ══ */}
        <TabsContent value="agentes" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Download do agente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Download className="h-4 w-4" />Instalar Agente de Monitoramento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  O agente coleta métricas do PC (CPU, RAM, disco, rede, temperatura) e envia para o Synapse.
                  Funciona offline com buffer local — nunca perde dados.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">COMO INSTALAR (WINDOWS):</p>
                  <div className="bg-muted rounded-lg p-3 space-y-2 text-xs font-mono">
                    <p className="text-muted-foreground"># 1. Baixe o instalador abaixo</p>
                    <p className="text-muted-foreground"># 2. Clique com o botão direito e "Executar como Administrador"</p>
                    <p className="text-muted-foreground"># 3. Use o código de pareamento gerado ao lado</p>
                    <p className="text-muted-foreground"># 4. URL do Servidor: {window.location.origin}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm" className="w-full" asChild>
                    <a href="https://synapse-backend.railway.app/api/agent/download/windows" download="instalar_agente.bat">
                      <Download className="h-4 w-4 mr-2" />Baixar Instalador (Windows .bat)
                    </a>
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <a href="https://synapse-backend.railway.app/api/agent/download/agent" download="synapse_agent.py">
                        <FileText className="h-4 w-4 mr-2" />Script Python
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <a href="https://synapse-backend.railway.app/api/agent/download/linux" download="install_linux.sh">
                        <Download className="h-4 w-4 mr-2" />Linux (.sh)
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Códigos de pareamento */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Link2 className="h-4 w-4" />Códigos de Pareamento
                  </CardTitle>
                  <Button size="sm" onClick={() => gerarCodigo.mutate({})} disabled={gerarCodigo.isPending}>
                    <Plus className="h-4 w-4 mr-1" />Gerar Código
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Gere um código único para vincular um PC ao Synapse. O código expira em 24h após o uso.
                </p>
                {(codigosQ.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum código gerado ainda</p>
                )}
                {(codigosQ.data ?? []).map((c: any) => (
                  <div key={c.id} className={`flex items-center justify-between p-2 rounded-lg border ${c.usado ? "opacity-50 bg-muted/30" : "bg-muted/50"}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-bold tracking-wider">{c.codigo}</code>
                        {c.usado && <Badge variant="secondary" className="text-xs">Usado</Badge>}
                        {!c.usado && new Date(c.expiresAt) < new Date() && <Badge variant="destructive" className="text-xs">Expirado</Badge>}
                        {!c.usado && new Date(c.expiresAt) > new Date() && <Badge className="bg-green-100 text-green-700 text-xs">Ativo</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">Expira: {new Date(c.expiresAt).toLocaleString("pt-BR")}</p>
                      {c.hostnameVinculado && <p className="text-xs text-muted-foreground">PC: {c.hostnameVinculado}</p>}
                    </div>
                    <div className="flex gap-1">
                      {!c.usado && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(c.codigo)}>
                          {copiedCode === c.codigo ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => revogarCodigo.mutate({ id: c.id })}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Lista de agentes registrados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Monitor className="h-4 w-4" />Agentes Registrados ({(agentesQ.data ?? []).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>SO</TableHead>
                    <TableHead>AnyDesk</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Coleta</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(agentesQ.data ?? []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-sm font-medium">{a.hostname}</TableCell>
                      <TableCell className="font-mono text-xs">{a.ip}</TableCell>
                      <TableCell className="text-xs">{a.so}</TableCell>
                      <TableCell>
                        {a.anydeskId ? (
                          <a href={`anydesk://${a.anydeskId}`} className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />{a.anydeskId}
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{a.versaoAgente}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1.5 text-xs ${a.status === "online" ? "text-green-600" : "text-gray-500"}`}>
                          <div className={`h-2 w-2 rounded-full ${a.status === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                          {a.status ?? "offline"}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.ultimaColeta ? new Date(a.ultimaColeta).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedAgente(a); setTab("monitoramento"); }}>
                          <Eye className="h-3 w-3 mr-1" />Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(agentesQ.data ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum agente registrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ ALERTAS ══ */}
        <TabsContent value="alertas" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Alertas automáticos de hardware, SLA e sistema. Atualização a cada 15s.</p>
            <Button variant="outline" size="sm" onClick={() => alertasQ.refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />Atualizar
            </Button>
          </div>
          <div className="space-y-2">
            {(alertasQ.data ?? []).map((a: any) => (
              <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border ${
                a.severidade === "critico" ? "border-red-200 bg-red-50 dark:bg-red-900/10" :
                a.severidade === "atencao" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10" :
                "border-blue-200 bg-blue-50 dark:bg-blue-900/10"
              }`}>
                <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  a.severidade === "critico" ? "bg-red-500 animate-pulse" :
                  a.severidade === "atencao" ? "bg-yellow-500" : "bg-blue-500"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.mensagem}</p>
                  <p className="text-xs text-muted-foreground">{a.hostname && `PC: ${a.hostname} · `}{new Date(a.criadoEm).toLocaleString("pt-BR")}</p>
                </div>
                <Badge variant="outline" className={`text-xs flex-shrink-0 ${
                  a.severidade === "critico" ? "border-red-300 text-red-700" :
                  a.severidade === "atencao" ? "border-yellow-300 text-yellow-700" : ""
                }`}>{a.severidade}</Badge>
              </div>
            ))}
            {(alertasQ.data ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="font-medium">Nenhum alerta ativo</p>
                <p className="text-sm mt-1">Todos os sistemas estão operando normalmente.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
