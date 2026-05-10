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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Plus, Monitor, Headphones, AlertCircle, CheckCircle2, Search,
  Wrench, Cpu, HardDrive, Server, Key, Shield, ShoppingCart,
  Network, Activity, AlertTriangle, Clock, User, Building2,
  Thermometer, Wifi, Package, FileText, ExternalLink,
  RefreshCw, TrendingUp, Eye, Edit, Trash2, Send, Paperclip,
  Download, Link2, QrCode, Copy, Check, X, ChevronRight,
  BarChart2, Database, Settings, Zap, Bell, BellRing,
  Image as ImageIcon, MessageSquare, Calendar, Tag, MoreHorizontal,
  Archive, Unlink, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { getBackendBaseUrl } from "@/lib/backend";
import { useViewAs } from "@/contexts/ViewAsContext";
import { formatDateBR, formatDateTimeBR, saoPauloDateTimeLocalToIso, toSaoPauloDateTimeLocalInput } from "@/lib/timezone";

// ─── Helpers de cor ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  triagem_ia: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  aguardando_usuario: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  aguardando_ti: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  em_andamento: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  acesso_remoto_solicitado: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  em_acesso_remoto: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  resolvido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  encerrado: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  cancelado: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  reaberto: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
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

const TI_MANAGER_ROLES = new Set([
  "master_admin",
  "ti_master",
  "admin",
  "admin_empresa",
  "administrador",
  "ti",
  "supervisor_geral",
  "supervisor_ti",
]);

type AgentLifecycleAction =
  | "remover_monitoramento"
  | "desparear"
  | "arquivar"
  | "reativar"
  | "limpar_vinculo"
  | "descartar"
  | "excluir_definitivo";

type AgentFilter = "todos" | "online" | "offline" | "arquivados" | "removidos" | "duplicados" | "sem_heartbeat";

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
  const backendBaseUrl = getBackendBaseUrl();
  const [msg, setMsg] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; nome: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const mensagensQ = trpc.ti.listMensagens.useQuery({ ticketId }, { refetchInterval: 5000 }) as any;
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
    const baseUrl = backendBaseUrl;
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
    sendMsg.mutate({
      ticketId,
      conteudo: msg || (preview ? `Anexo: ${preview.nome}` : ""),
      tipo: preview ? "anexo" : "mensagem",
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
            const fileUrl = m.anexoUrl ?? m.fileUrl;
            const fileName = m.anexoNome ?? m.fileName ?? "Arquivo";
            const authorName = m.autorNome ?? m.autor_nome ?? "Usuário";
            const isMine = Number(m.autorId) === Number(user?.id);
            return (
              <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""} ${m.tipo === "sistema" ? "justify-center" : ""}`}>
                {m.tipo === "sistema" ? (
                  <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">{m.conteudo}</p>
                ) : (
                  <>
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isMine ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {(authorName ?? "?")[0].toUpperCase()}
                    </div>
                    <div className={`flex-1 min-w-0 max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`flex items-center gap-2 mb-0.5 ${isMine ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-medium">{isMine ? "Você" : authorName}</span>
                        {m.isInterno && <Badge variant="outline" className="text-xs py-0 h-4">Interno</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTimeBR(m.createdAt)}
                        </span>
                      </div>
                      {m.tipo === "imagem" || (fileUrl && isImage(fileUrl)) ? (
                        <div className={isMine ? "self-end" : ""}>
                          {m.conteudo && !m.conteudo.startsWith("Anexo:") && <p className="text-sm mb-1">{m.conteudo}</p>}
                          <img src={fileUrl} alt="Imagem" className="max-w-[240px] max-h-[180px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity border" onClick={() => setLightbox(fileUrl)} />
                        </div>
                      ) : fileUrl ? (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className={`text-sm underline text-primary flex items-center gap-1 ${
                          isMine ? "self-end" : ""
                        }`}>
                          <FileText className="h-3.5 w-3.5" />{fileName}
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
function TicketDetail({ ticket, onClose, empresaId, isTiManager }: { ticket: any; onClose: () => void; empresaId: number; isTiManager: boolean }) {
  const [, navigate] = useLocation() as any;
  const updateTicket = trpc.ti.updateTicket.useMutation({
    onSuccess: () => toast.success("Chamado atualizado!"),
  });
  const updateStatus = trpc.ti.updateTicketStatus.useMutation({
    onSuccess: () => toast.success("Status atualizado!"),
  });
  const requestRemoteAccess = trpc.ti.requestRemoteAccess.useMutation({
    onSuccess: () => toast.success("Acesso remoto solicitado!"),
  });
  const runAiTriage = trpc.ti.aiTriage.useMutation({
    onSuccess: (r: any) => {
      toast.success(
        r?.precisaEscalar
          ? "IA triou e escalou para TI."
          : "IA triou e sugeriu autoatendimento ao usuário."
      );
    },
    onError: (e: any) => toast.error(e?.message || "Falha na triagem IA"),
  });
  const historyQ = trpc.ti.listStatusHistory.useQuery({ ticketId: ticket.id }) as any;
  const notesQ = trpc.ti.listInternalNotes.useQuery({ ticketId: ticket.id }, { enabled: isTiManager }) as any;
  const addNote = trpc.ti.addInternalNote.useMutation({
    onSuccess: () => {
      notesQ.refetch();
      toast.success("Nota interna salva.");
    },
  });
  const [internalNote, setInternalNote] = useState("");
  const tecnicos = trpc.ti.listTecnicos.useQuery(undefined, { enabled: isTiManager }) as any;

  const slaPercent = ticket.slaHoras && ticket.createdAt
    ? Math.min(100, Math.round(((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * ticket.slaHoras)) * 100))
    : null;

  const STATUS_FLOW = ["aberto", "triagem_ia", "aguardando_usuario", "aguardando_ti", "em_andamento", "acesso_remoto_solicitado", "em_acesso_remoto", "resolvido", "encerrado"];
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
              onClick={() => {
                if (!isTiManager) return;
                updateStatus.mutate({ id: ticket.id, status: s as any });
              }}
              disabled={!isTiManager}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                i === currentIdx ? "bg-primary text-primary-foreground" :
                i < currentIdx ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                "bg-muted text-muted-foreground hover:bg-muted/80"
              } ${!isTiManager ? "opacity-70 cursor-not-allowed" : ""}`}
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
      {isTiManager ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Prioridade (Equipe TI)</Label>
            <Select
              value={ticket.prioridade ?? "media"}
              onValueChange={(v) => updateTicket.mutate({ id: ticket.id, prioridade: v as any })}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
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
              defaultValue={toSaoPauloDateTimeLocalInput(ticket.prazo)}
              onBlur={(e) => {
                const prazo = saoPauloDateTimeLocalToIso(e.target.value);
                if (prazo) updateTicket.mutate({ id: ticket.id, prazo });
              }}
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
      ) : (
        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          Modo usuário: você acompanha seu chamado, conversa com a equipe, envia anexos e consulta o histórico deste atendimento.
        </div>
      )}

      <TicketChat ticketId={ticket.id} empresaId={empresaId} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Histórico de status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(historyQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma mudança registrada ainda.</p>
            ) : (
              (historyQ.data ?? []).map((h: any) => (
                <div key={h.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {(h.fromStatus ?? "inicial").replaceAll("_", " ")} → {h.toStatus.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {h.autor_nome ?? "Sistema"} · {formatDateTimeBR(h.createdAt)}
                  </p>
                  {h.motivo && <p className="text-xs text-muted-foreground mt-1">{h.motivo}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {isTiManager && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notas internas da TI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={3}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Registre detalhes internos, causa raiz ou orientação para a equipe..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => requestRemoteAccess.mutate({ ticketId: ticket.id, anydeskId: ticket.anydeskId, observacoes: "Solicitação iniciada pela equipe de TI" })}
                >
                  Solicitar acesso remoto
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={runAiTriage.isPending}
                  onClick={() => runAiTriage.mutate({ ticketId: ticket.id, descricao: ticket.descricao || ticket.titulo })}
                >
                  {runAiTriage.isPending ? "Triando..." : "Triagem IA"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!internalNote.trim()) return;
                    addNote.mutate({ ticketId: ticket.id, conteudo: internalNote });
                    setInternalNote("");
                  }}
                >
                  Salvar nota interna
                </Button>
              </div>
              <div className="space-y-2">
                {(notesQ.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma nota interna registrada.</p>
                ) : (
                  (notesQ.data ?? []).map((note: any) => (
                    <div key={note.id} className="rounded-lg bg-muted/40 p-3">
                      <p className="text-sm">{note.conteudo}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {note.autor_nome ?? "Equipe TI"} · {formatDateTimeBR(note.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TI({ params }: { params?: { tab?: string } }) {
  const { user } = useAuth();
  const { effectiveEmpresaId } = useViewAs();
  const empresaId = Number(effectiveEmpresaId || user?.empresaId || 0);
  const hasEmpresaContext = Number.isFinite(empresaId) && empresaId > 0;
  const userRole = String(user?.role || "").toLowerCase();
  const isMasterAdmin = userRole === "master_admin" || userRole === "ti_master";
  const isTiManager = TI_MANAGER_ROLES.has(userRole);
  const hasTiOperationalContext = isMasterAdmin || hasEmpresaContext;
  const tiEmpresaInput = hasEmpresaContext ? { empresaId } : undefined;
  const optionalEmpresaPayload = hasEmpresaContext ? { empresaId } : {};
  const backendBaseUrl = getBackendBaseUrl();
  const [agentVersion, setAgentVersion] = useState<string>("latest");
  const TAB_ALIASES: Record<string, string> = {
    agente: "agentes",
    agentes: "agentes",
    dispositivo: "dispositivos",
    dispositivos: "dispositivos",
    limpeza: "limpeza-agentes",
    "limpeza-agentes": "limpeza-agentes",
    chamado: "tickets",
    chamados: "tickets",
  };

  const [location, setLocation] = useLocation() as any;
  const MANAGER_ONLY_TABS = new Set([
    "dashboard",
    "inventario",
    "monitoramento",
    "acessos",
    "licencas",
    "compras",
    "manutencao",
    "agentes",
    "dispositivos",
    "limpeza-agentes",
    "certificados",
    "alertas",
  ]);
  // Prioriza o parâmetro da rota (params.tab), depois tenta extrair da URL, fallback para dashboard
  const getInitialTab = () => {
    if (params?.tab) {
      const normalized = TAB_ALIASES[params.tab] ?? params.tab;
      if (!isTiManager && MANAGER_ONLY_TABS.has(normalized)) return "tickets";
      return normalized;
    }
    const parts = location.split("/");
    const tiIndex = parts.indexOf("ti");
    if (tiIndex !== -1 && parts[tiIndex + 1]) {
      const normalized = TAB_ALIASES[parts[tiIndex + 1]] ?? parts[tiIndex + 1];
      if (!isTiManager && MANAGER_ONLY_TABS.has(normalized)) return "tickets";
      return normalized;
    }
    return isTiManager ? "dashboard" : "tickets";
  };

  const [tab, setTab] = useState(getInitialTab());

  useEffect(() => {
    let active = true;
    const fetchVersion = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/api/agent/version`, { cache: "no-store" });
        const payload = await response.json();
        if (!active) return;
        const version = String(payload?.version || "").trim();
        if (version) setAgentVersion(version);
      } catch {
        if (active) setAgentVersion("latest");
      }
    };
    fetchVersion();
    return () => {
      active = false;
    };
  }, [backendBaseUrl]);

  useEffect(() => {
    const currentTab = getInitialTab();
    if (currentTab !== tab) setTab(currentTab);
  }, [location, params?.tab]);

  const handleTabChange = (newTab: string) => {
    if (!isTiManager && MANAGER_ONLY_TABS.has(newTab)) {
      toast.warning("Este módulo é exclusivo da equipe de TI.");
      setTab("tickets");
      setLocation("/ti/tickets");
      return;
    }
    setTab(newTab);
    setLocation(`/ti/${newTab}`);
  };

  // Handlers para modais de dispositivos
  const handleAssociateClick = (agente: any) => {
    setSelectedAgenteForAssociate(agente);
    setAssociateForm({ userId: "", departmentId: "" });
    setShowAssociateModal(true);
  };

  const handleAssociateSubmit = async () => {
    if (!associateForm.userId) {
      toast.error("Selecione um usuário");
      return;
    }
    try {
      await associateAgente.mutateAsync({
        agentId: selectedAgenteForAssociate.id,
        userId: associateForm.userId,
        departmentId: associateForm.departmentId,
      });
      toast.success("Dispositivo associado com sucesso!");
      setShowAssociateModal(false);
      // Recarregar dispositivos
      await agentesQ.refetch();
    } catch (err) {
      toast.error("Erro ao associar dispositivo: " + (err as any).message);
    }
  };

  const handleGenerateCodeSubmit = async () => {
    if (!hasTiOperationalContext) {
      toast.error("Selecione uma empresa ativa para gerar código de pareamento.");
      return;
    }
    if (!generateCodeForm.userId) {
      toast.error("Selecione um usuário");
      return;
    }
    try {
      const result = await generatePairingCode.mutateAsync({
        userId: generateCodeForm.userId,
        departmentId: generateCodeForm.departmentId,
      });
      setGeneratedCode({ code: result.code, expiresAt: result.expiresAt });
      toast.success("Código gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar código: " + (err as any).message);
    }
  };

  const handleCopyCode = () => {
    if (generatedCode?.code) {
      navigator.clipboard.writeText(generatedCode.code);
      toast.success("Código copiado!");
    }
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
  // Estados para gerenciamento de dispositivos
  const [agentes, setAgentes] = useState<any[]>([]);
  const [agentesLoading, setAgentesLoading] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const [selectedAgenteForAssociate, setSelectedAgenteForAssociate] = useState<any>(null);
  const [associateForm, setAssociateForm] = useState({ userId: "", departmentId: "" });
  const [generateCodeForm, setGenerateCodeForm] = useState({ userId: "", departmentId: "" });
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [showOnlyUnassociated, setShowOnlyUnassociated] = useState(false);
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("todos");
  const [agentStaleDays, setAgentStaleDays] = useState(7);
  const [cleanupKeepByGroup, setCleanupKeepByGroup] = useState<Record<string, number>>({});
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [remoteStatusFilter, setRemoteStatusFilter] = useState("todos");
  const agentLifecycleStatuses = new Set(["arquivado", "removido", "descartado", "despareado", "aguardando", "excluido"]);
  const agentStatus = (a: any) => {
    const rawStatus = String(a?.status_resolvido || a?.status || "offline").toLowerCase();
    if (agentLifecycleStatuses.has(rawStatus)) return rawStatus;
    if (a?.ativo === false) return "arquivado";
    return rawStatus;
  };
  const agentIsArchived = (a: any) => agentStatus(a) === "arquivado";
  const agentIsInactive = (a: any) => ["arquivado", "removido", "descartado", "excluido"].includes(agentStatus(a));
  const agentStatusLabel = (status: string) => ({
    online: "conectado",
    offline: "desconectado",
    arquivado: "arquivado",
    removido: "removido",
    descartado: "descartado",
    despareado: "despareado",
    aguardando: "aguardando pareamento",
    excluido: "excluído",
    atencao: "atenção",
    critico: "crítico",
  }[status] ?? status);
  const agentLastCollected = (a: any) => a?.ultima_coleta || a?.ultimaColeta || a?.updatedAt || a?.ultimoContato || null;
  const agentIdentifier = (value: any) => String(value ?? "").trim().toUpperCase();
  const agentFingerprint = (a: any) => agentIdentifier(a?.fingerprint || a?.mac || a?.serial || "");
  const agentHostname = (a: any) => agentIdentifier(a?.hostname || a?.displayName || "");
  const agentDaysSinceHeartbeat = (a: any) => {
    const last = agentLastCollected(a);
    if (!last) return Number.POSITIVE_INFINITY;
    const timestamp = new Date(last).getTime();
    if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
    return Math.floor((Date.now() - timestamp) / 86400000);
  };
  const metricValue = (...values: any[]) => {
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const numeric = Number(value);
      if (Number.isFinite(numeric)) return numeric;
    }
    return null;
  };
  const agentCpuUsage = (a: any) => metricValue(a?.cpuUso, a?.cpu_atual, a?.cpuAtual);
  const agentRamUsage = (a: any) => metricValue(a?.ramUsoPct, a?.ram_atual, a?.ramAtual);
  const agentDiskUsage = (a: any) => metricValue(a?.discoUsoPct, a?.disco_atual, a?.discoAtual);
  const agentCpuTemp = (a: any) => metricValue(a?.cpuTemp, a?.cpu_temp);
  const agentAnyDesk = (a: any) => a?.anydeskId || a?.anydesk_id_atual || a?.anydesk || a?.anydesk_id || "";
  const agentIsCritical = (a: any) => Boolean(a?.isCritical24x7 || a?.notifyOnOffline);
  const agentSubnet = (a: any) => {
    const ip = String(a?.ip || a?.ipLocal || "").trim();
    const match = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
    return match?.[1] || "";
  };
  const agentNetworkDiagnostic = (a: any, rows: any[]) => {
    if (agentStatus(a) === "online") return "Heartbeat normal";
    const subnet = agentSubnet(a);
    if (!subnet) return "Sem IP para comparar rede";
    const peers = rows.filter((peer: any) => Number(peer.id) !== Number(a.id) && agentSubnet(peer) === subnet);
    const onlinePeers = peers.filter((peer: any) => agentStatus(peer) === "online");
    if (onlinePeers.length > 0) return "Mesma rede online: possível PC desligado/agente parado";
    if (peers.length > 0) return "Todos da mesma rede offline: possível queda de rede/local";
    return "Sem pares na mesma rede para comparar";
  };
  const metricTimestamp = (m: any) => m?.coletadoEm || m?.hora || m?.timestamp || null;
  const metricCpuUsage = (m: any) => metricValue(m?.cpuUso, m?.cpu_medio, m?.cpuAtual);
  const metricRamUsage = (m: any) => metricValue(m?.ramUsoPct, m?.ram_medio, m?.ramAtual);
  const metricDiskUsage = (m: any) => metricValue(m?.discoUsoPct, m?.disco_medio, m?.discoAtual);
  const metricNetworkSent = (m: any) => metricValue(m?.redeEnviadoKb, m?.rede_enviado_kb, m?.redeEnviadoAtualKb, m?.rede_enviado_atual_kb);
  const metricNetworkRecv = (m: any) => metricValue(m?.redeRecebidoKb, m?.rede_recebido_kb, m?.redeRecebidoAtualKb, m?.rede_recebido_atual_kb);
  const formatNetworkKb = (value: any) => {
    const numeric = metricValue(value);
    if (numeric == null) return "—";
    if (numeric >= 1024 * 1024) return `${(numeric / 1024 / 1024).toFixed(1)} GB`;
    if (numeric >= 1024) return `${(numeric / 1024).toFixed(1)} MB`;
    return `${numeric.toFixed(0)} KB`;
  };

  // ── Queries ──
  const dashboard = trpc.ti.dashboard.useQuery(undefined, { refetchInterval: 30000 }) as any;
  const ticketsQ = trpc.ti.listTickets.useQuery(
    { search, status: statusFilter === "todos" ? undefined : statusFilter },
    { refetchInterval: 15000 }
  ) as any;
  const ativosQ = trpc.ti.listAtivos.useQuery({ search }, { refetchInterval: 30000, enabled: isTiManager }) as any;
  const licencasQ = trpc.ti.listLicencas.useQuery({ search }, { refetchInterval: 60000, enabled: isTiManager }) as any;
  const comprasQ = trpc.ti.listCompras.useQuery(undefined, { refetchInterval: 60000, enabled: isTiManager }) as any;
  const acessosQ = trpc.ti.listAcessos.useQuery(undefined, { refetchInterval: 60000, enabled: isTiManager }) as any;
  const remoteAccessQ = trpc.ti.listRemoteAccessRequests.useQuery(
    { status: remoteStatusFilter === "todos" ? undefined : remoteStatusFilter },
    { refetchInterval: 15000, enabled: isTiManager }
  ) as any;
  const agentesQ = trpc.ti.listAgentes.useQuery(tiEmpresaInput, { refetchInterval: 5000, enabled: isTiManager && hasTiOperationalContext }) as any;
  const alertasQ = trpc.ti.listAlertas.useQuery({ limit: 20 }, { refetchInterval: 15000, enabled: isTiManager }) as any;
  const manutencoesQ = trpc.ti.listManutencoes.useQuery(undefined, { refetchInterval: 60000, enabled: isTiManager }) as any;
  const codigosQ = trpc.ti.listCodigosPareamento.useQuery(tiEmpresaInput, { refetchInterval: 10000, enabled: isTiManager && hasTiOperationalContext }) as any;
  const certificadosQ = trpc.ti.listCertificados.useQuery({ search }, { refetchInterval: 60000, enabled: isTiManager }) as any;
  const agenteMetricas = trpc.ti.getAgenteMetricas.useQuery(
    { agenteId: selectedAgente?.id, periodo: "24h", ...(hasEmpresaContext ? { empresaId } : {}) },
    { enabled: isTiManager && hasTiOperationalContext && !!selectedAgente?.id, refetchInterval: 30000 }
  ) as any;

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
    onSuccess: () => {
      comprasQ.refetch();
      setShowNewCompra(false);
      setCompraForm({
        item: "", justificativa: "", observacoes: "", categoria: "hardware", valorUnitario: 0, quantidade: 1, fornecedor: "", urgencia: "normal",
      });
      toast.success("Requisição criada!");
    },
  });
  const updateCompra = trpc.ti.updateCompra.useMutation({
    onSuccess: () => {
      comprasQ.refetch();
      toast.success("Status da compra atualizado!");
    },
  });
  const createManutencao = trpc.ti.createManutencao.useMutation({
    onSuccess: () => { manutencoesQ.refetch(); setShowNewManutencao(false); toast.success("Manutenção registrada!"); },
  });
  const createAcesso = trpc.ti.createAcesso.useMutation({
    onSuccess: () => { acessosQ.refetch(); setShowNewAcesso(false); toast.success("Acesso cadastrado!"); },
  });
  const updateRemoteAccessRequest = trpc.ti.updateRemoteAccessRequest.useMutation({
    onSuccess: () => {
      remoteAccessQ.refetch();
      ticketsQ.refetch();
      dashboard.refetch();
      toast.success("Solicitação de acesso remoto atualizada.");
    },
    onError: (err) => toast.error("Erro ao atualizar acesso remoto: " + err.message),
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
  const gerenciarAgente = trpc.ti.gerenciarAgente.useMutation({
    onSuccess: (result: any) => {
      agentesQ.refetch();
      dashboard.refetch();
      toast.success(result?.message || "Ação aplicada ao ativo monitorado.");
    },
    onError: (err) => toast.error("Erro ao gerenciar ativo: " + (err.message || "tente novamente")),
  });

  const executarAcaoAgente = (
    agente: any,
    acao: AgentLifecycleAction,
  ) => {
    const detalhes: Record<AgentLifecycleAction, { titulo: string; efeito: string }> = {
      remover_monitoramento: {
        titulo: "Remover monitoramento",
        efeito: "Oculta este ativo do painel e invalida o token atual. O histórico técnico permanece preservado para auditoria.",
      },
      desparear: {
        titulo: "Desparear este PC",
        efeito: "Remove o vínculo/token atual. O usuário precisará parear novamente com um novo código SYNC.",
      },
      arquivar: {
        titulo: "Arquivar ativo",
        efeito: "Oculta o ativo da operação ativa sem apagar histórico. Pode ser reativado depois.",
      },
      reativar: {
        titulo: "Reativar ativo",
        efeito: "Volta o ativo para a operação. Se o token tiver sido invalidado, será necessário reinstalar ou parear novamente.",
      },
      limpar_vinculo: {
        titulo: "Limpar vínculo antigo",
        efeito: "Libera este mesmo PC para reinstalação sem criar duplicidade, mantendo fingerprint/hostname para reutilizar o registro.",
      },
      descartar: {
        titulo: "Marcar como equipamento descartado",
        efeito: "Remove o equipamento da operação ativa, invalida token e mantém o histórico para auditoria.",
      },
      excluir_definitivo: {
        titulo: "Excluir definitivamente",
        efeito: "Remove o registro da operação. Por segurança, o backend só permite em registros de teste ou sem histórico técnico.",
      },
    };
    const info = detalhes[acao];
    if (acao === "excluir_definitivo") {
      const confirmacao = `EXCLUIR ${agente.hostname}`;
      const typed = window.prompt(`${info.titulo}\n\nAtivo: ${agente.hostname}\n\n${info.efeito}\n\nDigite exatamente:\n${confirmacao}`);
      if (typed !== confirmacao) {
        toast.info("Exclusão definitiva cancelada.");
        return;
      }
      gerenciarAgente.mutate({
        agenteId: Number(agente.id),
        acao,
        motivo: `Confirmação forte: ${confirmacao}`,
        ...optionalEmpresaPayload,
      });
      return;
    }
    const ok = window.confirm(`${info.titulo}\n\nAtivo: ${agente.hostname}\n\n${info.efeito}\n\nDeseja continuar?`);
    if (!ok) return;
    gerenciarAgente.mutate({ agenteId: Number(agente.id), acao, ...optionalEmpresaPayload });
  };

  const selecionarAcaoAgente = (agente: any, acao: AgentLifecycleAction) => (event: Event) => {
    event.stopPropagation();
    window.setTimeout(() => executarAcaoAgente(agente, acao), 0);
  };

  const executarAcaoGrupoAgentes = async (
    group: { agentes: any[]; suggestedKeepId?: number },
    manterAgenteId: number,
    acao: Exclude<AgentLifecycleAction, "reativar" | "excluir_definitivo">,
  ) => {
    const alvos = group.agentes.filter((agente: any) => Number(agente.id) !== Number(manterAgenteId));
    if (alvos.length === 0) {
      toast.info("Nenhum duplicado para limpar neste grupo.");
      return;
    }
    const label = acao === "limpar_vinculo"
      ? "limpar tokens e vínculos antigos"
      : acao === "remover_monitoramento"
        ? "remover o monitoramento"
        : "arquivar";
    const ok = window.confirm(`Limpeza de duplicados\n\nManter: #${manterAgenteId}\nAplicar "${label}" em ${alvos.length} registro(s) duplicado(s).\n\nEssa ação preserva o histórico, exceto exclusão definitiva que não é usada em lote.\n\nDeseja continuar?`);
    if (!ok) return;
    try {
      for (const agente of alvos) {
        await gerenciarAgente.mutateAsync({ agenteId: Number(agente.id), acao, ...optionalEmpresaPayload });
      }
      await agentesQ.refetch();
      toast.success("Limpeza de duplicados concluída.");
    } catch (err) {
      toast.error("Falha ao limpar duplicados: " + ((err as any)?.message || "tente novamente"));
    }
  };

  const renderAgenteActions = (a: any, options: { showView?: boolean; showAssociate?: boolean } = {}) => {
    const inactive = agentIsInactive(a);
    return (
      <div className="flex flex-wrap items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
        {options.showView && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedAgente(a); setTab("monitoramento"); }}>
            <Eye className="h-3 w-3 mr-1" />Ver
          </Button>
        )}
        {inactive ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={gerenciarAgente.isPending}
            onClick={() => executarAcaoAgente(a, "reativar")}
          >
            <RefreshCw className="h-3 w-3 mr-1" />Reativar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={gerenciarAgente.isPending}
            onClick={() => executarAcaoAgente(a, "arquivar")}
          >
            <Archive className="h-3 w-3 mr-1" />Arquivar
          </Button>
        )}
        {!inactive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-red-600 hover:text-red-700"
            disabled={gerenciarAgente.isPending}
            onClick={() => executarAcaoAgente(a, "remover_monitoramento")}
          >
            <Trash2 className="h-3 w-3 mr-1" />Remover
          </Button>
        )}
        {options.showAssociate && (
          <Dialog open={showAssociateModal && selectedAgenteForAssociate?.id === a.id} onOpenChange={(open) => { if (!open) setShowAssociateModal(false); }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAssociateClick(a)}>
                <Edit className="h-3 w-3 mr-1" />Vincular
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Vincular dispositivo</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); handleAssociateSubmit(); }} className="space-y-4">
                <div>
                  <Label>Usuário *</Label>
                  <Select value={associateForm.userId} onValueChange={(v) => setAssociateForm((p) => ({ ...p, userId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione um usuário..." /></SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.name} {u.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Departamento (opcional)</Label>
                  <Input value={associateForm.departmentId} onChange={(e) => setAssociateForm((p) => ({ ...p, departmentId: e.target.value }))} placeholder="Ex: TI, RH" />
                </div>
                <Button type="submit" className="w-full">Vincular</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={gerenciarAgente.isPending} aria-label={`Mais ações para ${a.hostname || "dispositivo"}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16} className="z-[80] w-72" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuLabel className="text-xs">
              <span className="block text-muted-foreground">Ações do agente</span>
              <span className="block truncate font-mono text-[11px] font-normal">{a.hostname || `#${a.id}`}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.showView && (
              <DropdownMenuItem onSelect={(event) => { event.stopPropagation(); setSelectedAgente(a); setTab("monitoramento"); }}>
                <Eye className="h-4 w-4 mr-2" />Abrir monitoramento
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={selecionarAcaoAgente(a, "limpar_vinculo")}>
              <RotateCcw className="h-4 w-4 mr-2" />Limpar vínculo antigo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={selecionarAcaoAgente(a, "desparear")}>
              <Unlink className="h-4 w-4 mr-2" />Desparear este PC
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {inactive ? (
              <DropdownMenuItem onSelect={selecionarAcaoAgente(a, "reativar")}>
                <RefreshCw className="h-4 w-4 mr-2" />Reativar ativo
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={selecionarAcaoAgente(a, "arquivar")}>
                <Archive className="h-4 w-4 mr-2" />Arquivar ativo
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={selecionarAcaoAgente(a, "descartar")}>
              <Package className="h-4 w-4 mr-2" />Marcar como equipamento descartado
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={selecionarAcaoAgente(a, "remover_monitoramento")}>
              <Trash2 className="h-4 w-4 mr-2" />Remover da operação ativa
            </DropdownMenuItem>
            {isMasterAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-700 focus:text-red-700" onSelect={selecionarAcaoAgente(a, "excluir_definitivo")}>
                  <AlertTriangle className="h-4 w-4 mr-2" />Excluir definitivamente
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const renderAgentFilterBar = () => (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-2">
      {agentFilterOptions.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={agentFilter === option.value ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setAgentFilter(option.value)}
        >
          {option.label}
          <Badge variant="secondary" className="ml-2 text-[10px]">{option.count}</Badge>
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Dias sem heartbeat</Label>
        <Input
          type="number"
          min={1}
          max={365}
          value={agentStaleDays}
          onChange={(event) => setAgentStaleDays(Math.max(1, Number(event.target.value) || 1))}
          className="h-8 w-20 text-xs"
        />
      </div>
    </div>
  );
  
  // Funções para associar agente e gerar código
  const associateAgente = {
    mutateAsync: async (data: { agentId: number; userId: string; departmentId?: string }) => {
      const token = localStorage.getItem("synapse-auth-token") ?? "";
      const baseUrl = backendBaseUrl;
      const res = await fetch(`${baseUrl}/api/agents/${data.agentId}/associate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: data.userId, departmentId: data.departmentId || null }),
      });
      if (!res.ok) throw new Error("Erro ao associar agente");
      return res.json();
    }
  };
  
  const generatePairingCode = {
    mutateAsync: async (data: { userId: string; departmentId: string }) => {
      const token = localStorage.getItem("synapse-auth-token") ?? "";
      const baseUrl = backendBaseUrl;
      const res = await fetch(`${baseUrl}/api/agents/generate-pairing-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: data.userId,
          departmentId: data.departmentId,
          empresaId: empresaId > 0 ? empresaId : undefined,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({} as any));
        if (payload?.error === "EMPRESA_REQUIRED") {
          throw new Error("Selecione uma empresa ativa para gerar o código.");
        }
        if (payload?.error === "FORBIDDEN_COMPANY") {
          throw new Error("Você não tem permissão para gerar código nesta empresa.");
        }
        throw new Error(payload?.error || "Erro ao gerar código");
      }
      return res.json();
    }
  };

  useEffect(() => {
    setAgentes(agentesQ.data ?? []);
    setAgentesLoading(agentesQ.isLoading);
  }, [agentesQ.data, agentesQ.isLoading]);
  useEffect(() => {
    if (agentesQ.isError) {
      toast.error("Falha ao carregar dispositivos. Clique em Atualizar para tentar novamente.");
    }
  }, [agentesQ.isError]);

  const agentDuplicateInfo = useMemo(() => {
    const rows = agentesQ.data ?? [];
    const groups = new Map<string, any[]>();
    for (const agente of rows) {
      const fingerprint = agentFingerprint(agente);
      const hostname = agentHostname(agente);
      const keys = [
        fingerprint && fingerprint !== "UNKNOWN" ? `fingerprint:${fingerprint}` : "",
        hostname ? `hostname:${hostname}` : "",
      ].filter(Boolean);
      for (const key of keys) {
        const current = groups.get(key) ?? [];
        current.push(agente);
        groups.set(key, current);
      }
    }
    const duplicateGroups = Array.from(groups.entries())
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => {
        const [reason, value] = key.split(":");
        const sorted = [...group].sort((a, b) => {
          const statusScore = (agentStatus(b) === "online" ? 2 : b?.ativo !== false ? 1 : 0)
            - (agentStatus(a) === "online" ? 2 : a?.ativo !== false ? 1 : 0);
          if (statusScore !== 0) return statusScore;
          return new Date(agentLastCollected(b) ?? 0).getTime() - new Date(agentLastCollected(a) ?? 0).getTime();
        });
        return {
          key,
          reason: reason === "fingerprint" ? "fingerprint" : "hostname",
          value,
          agentes: sorted,
          suggestedKeepId: sorted[0]?.id,
        };
      });
    const ids = new Set<string>();
    duplicateGroups.forEach((group) => group.agentes.forEach((agente: any) => ids.add(String(agente.id))));
    return { groups: duplicateGroups, ids };
  }, [agentesQ.data]);

  const agentFilterOptions: { value: AgentFilter; label: string; count: number }[] = [
    { value: "todos", label: "Ativos", count: (agentesQ.data ?? []).filter((a: any) => !agentIsInactive(a)).length },
    { value: "online", label: "Online", count: (agentesQ.data ?? []).filter((a: any) => agentStatus(a) === "online").length },
    { value: "offline", label: "Offline", count: (agentesQ.data ?? []).filter((a: any) => agentStatus(a) === "offline").length },
    { value: "arquivados", label: "Arquivados", count: (agentesQ.data ?? []).filter((a: any) => agentStatus(a) === "arquivado").length },
    { value: "removidos", label: "Removidos", count: (agentesQ.data ?? []).filter((a: any) => ["removido", "descartado"].includes(agentStatus(a))).length },
    { value: "duplicados", label: "Duplicados", count: agentDuplicateInfo.ids.size },
    { value: "sem_heartbeat", label: `Sem heartbeat há ${agentStaleDays}+ dias`, count: (agentesQ.data ?? []).filter((a: any) => agentDaysSinceHeartbeat(a) >= agentStaleDays).length },
  ];

  const filteredAgentes = useMemo(() => {
    const rows = agentesQ.data ?? [];
    return rows.filter((agente: any) => {
      const status = agentStatus(agente);
      if (agentFilter === "online") return status === "online";
      if (agentFilter === "offline") return status === "offline";
      if (agentFilter === "arquivados") return status === "arquivado";
      if (agentFilter === "removidos") return ["removido", "descartado"].includes(status);
      if (agentFilter === "duplicados") return agentDuplicateInfo.ids.has(String(agente.id));
      if (agentFilter === "sem_heartbeat") return agentDaysSinceHeartbeat(agente) >= agentStaleDays;
      return !agentIsInactive(agente);
    });
  }, [agentesQ.data, agentDuplicateInfo.ids, agentFilter, agentStaleDays]);

  const vinculoAgentes = useMemo(() => {
    return filteredAgentes.filter((agente: any) => {
      if (!showOnlyUnassociated) return true;
      return !agente.user_id && !agente.userId && !agente.userName;
    });
  }, [filteredAgentes, showOnlyUnassociated]);

  // Buscar usuários
  useEffect(() => {
    const fetchUsuarios = async () => {
      setUsuariosLoading(true);
      try {
        const data = await trpc.users.listAll.query();
        setUsuarios(data);
      } catch (err) {
        console.error("Erro ao buscar usuários:", err);
      } finally {
        setUsuariosLoading(false);
      }
    };
    if (showAssociateModal || showGenerateCodeModal) {
      fetchUsuarios();
    }
  }, [showAssociateModal, showGenerateCodeModal]);

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
    const baseUrl = backendBaseUrl;
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
    item: "",
    justificativa: "",
    observacoes: "",
    categoria: "hardware",
    valorUnitario: 0,
    quantidade: 1,
    fornecedor: "",
    urgencia: "normal",
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
  const agentDownloadSuffix = `?v=${encodeURIComponent(agentVersion)}&ts=${Date.now()}`;

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
  const kpiOnline = (agentesQ.data ?? []).filter((a: any) => agentStatus(a) === "online").length;
  const kpiAtencao = (alertasQ.data ?? []).filter((a: any) => a.severidade === "atencao").length;
  const kpiCriticos = (alertasQ.data ?? []).filter((a: any) => a.severidade === "critico").length;
  const kpiLicencas = licencasQ.data?.length ?? 0;
  const kpiCertificados = dashboard.data?.certificados?.total ?? 0;
  const kpiCertificadosExpirando = dashboard.data?.certificados?.expirando ?? 0;
  const kpiCertificadosVencidos = dashboard.data?.certificados?.vencidos ?? 0;
  const kpiCards = isTiManager
    ? [
        { label: "Chamados Abertos", value: kpiAbertos, color: "text-red-600" },
        { label: "Em Andamento", value: kpiAndamento, color: "text-yellow-600" },
        { label: "Resolvidos Hoje", value: kpiResolvidos, color: "text-green-600" },
        { label: "Total Ativos", value: kpiAtivos, color: "" },
        { label: "Online", value: kpiOnline, color: "text-green-600", border: "border-green-200" },
        { label: "Atenção", value: kpiAtencao, color: "text-yellow-600", border: "border-yellow-200" },
        { label: "Críticos", value: kpiCriticos, color: "text-red-600", border: "border-red-200" },
        { label: "Certificados", value: kpiCertificados, color: "" },
        { label: "Vencendo/Vencidos", value: `${kpiCertificadosExpirando}/${kpiCertificadosVencidos}`, color: (kpiCertificadosExpirando + kpiCertificadosVencidos) > 0 ? "text-orange-600" : "" },
      ]
    : [
        { label: "Chamados Abertos", value: kpiAbertos, color: "text-red-600" },
        { label: "Em Andamento", value: kpiAndamento, color: "text-yellow-600" },
        { label: "Resolvidos Hoje", value: kpiResolvidos, color: "text-green-600" },
      ];
  const refreshTiData = () => {
    dashboard.refetch();
    ticketsQ.refetch();
    if (isTiManager) {
      ativosQ.refetch();
      agentesQ.refetch();
      alertasQ.refetch();
    }
  };

  return (
    <div className="space-y-6">
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            {isTiManager ? "TI & Infraestrutura" : "Meus chamados"}
            {isTiManager && kpiCriticos > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs animate-pulse">
                {kpiCriticos}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isTiManager
              ? "ITSM · ITAM · Monitoramento · Acessos Remotos · Licenças"
              : "Atendimento, conversa, anexos e histórico dos seus chamados"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={refreshTiData}>
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
                      {["hardware","software","rede","acesso","email","impressora","outro"].map((c) => (
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
        {kpiCards.map((k) => (
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
          {isTiManager && <TabsTrigger value="dashboard"><Activity className="h-4 w-4 mr-1" />Visão Geral</TabsTrigger>}
          <TabsTrigger value="tickets" className="relative">
            <Headphones className="h-4 w-4 mr-1" />Chamados
            {kpiAbertos > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px]">{kpiAbertos}</span>}
          </TabsTrigger>
          {isTiManager && (
            <>
              <TabsTrigger value="inventario"><HardDrive className="h-4 w-4 mr-1" />Inventário</TabsTrigger>
              <TabsTrigger value="monitoramento"><Cpu className="h-4 w-4 mr-1" />Monitoramento</TabsTrigger>
              <TabsTrigger value="acessos"><Key className="h-4 w-4 mr-1" />Acessos Remotos</TabsTrigger>
              <TabsTrigger value="licencas"><Shield className="h-4 w-4 mr-1" />Licenças</TabsTrigger>
              <TabsTrigger value="compras"><ShoppingCart className="h-4 w-4 mr-1" />Compras</TabsTrigger>
              <TabsTrigger value="manutencao"><Wrench className="h-4 w-4 mr-1" />Manutenção</TabsTrigger>
              <TabsTrigger value="agentes"><Network className="h-4 w-4 mr-1" />Dispositivos</TabsTrigger>
              <TabsTrigger value="dispositivos"><Monitor className="h-4 w-4 mr-1" />Vínculos e Inventário</TabsTrigger>
              <TabsTrigger value="limpeza-agentes"><Trash2 className="h-4 w-4 mr-1" />Limpeza de agentes</TabsTrigger>
              <TabsTrigger value="certificados"><Shield className="h-4 w-4 mr-1" />Certificados</TabsTrigger>
              <TabsTrigger value="alertas" className="relative">
                <Bell className="h-4 w-4 mr-1" />Alertas
                {kpiCriticos > 0 && <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[10px] animate-pulse">{kpiCriticos}</span>}
              </TabsTrigger>
            </>
          )}
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
                    <span className="text-xs text-muted-foreground">{formatDateTimeBR(a.criadoEm)}</span>
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
          {/* Dispositivos online */}
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Network className="h-4 w-4 text-green-500" />Dispositivos monitorados</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(agentesQ.data ?? []).slice(0, 8).map((a: any) => (
                  <div key={a.id} className={`p-2 rounded-lg border cursor-pointer hover:bg-muted/50 ${agentStatus(a) === "online" ? "border-green-200" : "border-gray-200"}`} onClick={() => { setSelectedAgente(a); setTab("monitoramento"); }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`h-2 w-2 rounded-full ${agentStatus(a) === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                      <span className="text-xs font-mono font-medium truncate">{a.hostname}</span>
                    </div>
                    {agentCpuUsage(a) != null && (
                      <div className="text-xs text-muted-foreground">
                        CPU: {agentCpuUsage(a)}% · RAM: {agentRamUsage(a) ?? "—"}%
                      </div>
                    )}
                  </div>
                ))}
                {(agentesQ.data ?? []).length === 0 && (
                  <div className="col-span-4 text-center py-6 text-muted-foreground text-sm">
                    Nenhum dispositivo sincronizado. Vá em <strong>Dispositivos</strong> para baixar o Synapse para Windows.
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
                <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} empresaId={empresaId} isTiManager={isTiManager} />
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
                        <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(t.createdAt)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {isTiManager ? (
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
                          ) : (
                            <Badge className={`text-xs ${STATUS_COLORS[t.status] ?? ""}`}>{String(t.status || "").replace("_", " ")}</Badge>
                          )}
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
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${agentStatus(a) === "online" ? "text-green-600" : agentStatus(a) === "atencao" ? "text-yellow-600" : agentStatus(a) === "critico" ? "text-red-600" : "text-gray-500"}`}>
                        <div className={`h-2 w-2 rounded-full ${agentStatus(a) === "online" ? "bg-green-500" : agentStatus(a) === "atencao" ? "bg-yellow-500" : agentStatus(a) === "critico" ? "bg-red-500" : "bg-gray-400"}`} />
                        {agentStatusLabel(agentStatus(a))}
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
              {filteredAgentes.length} de {(agentesQ.data ?? []).length} dispositivo(s) · Atualização automática a cada 30s
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const result = await agentesQ.refetch();
                toast.success(`Atualização concluída: ${(result.data ?? []).length} dispositivo(s) carregado(s).`);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />Atualizar
            </Button>
          </div>
          {renderAgentFilterBar()}
          {selectedAgente ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono">{selectedAgente.hostname}</CardTitle>
                  <div className="flex items-center gap-1">
                    {renderAgenteActions(selectedAgente)}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAgente(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">IP:</span> <span className="font-mono">{selectedAgente.ip}</span></div>
                  <div><span className="text-muted-foreground">SO:</span> <span>{selectedAgente.so}</span></div>
                  <div><span className="text-muted-foreground">AnyDesk:</span> {agentAnyDesk(selectedAgente) ? (
                    <a href={`anydesk://${agentAnyDesk(selectedAgente)}`} className="text-blue-600 hover:underline font-mono">{agentAnyDesk(selectedAgente)}</a>
                  ) : "—"}</div>
                  <div><span className="text-muted-foreground">Versão:</span> <span>{selectedAgente.versaoAgente}</span></div>
                </div>
                {/* Métricas em tempo real */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "CPU", value: agentCpuUsage(selectedAgente), unit: "%", warn: 80, crit: 90 },
                    { label: "RAM", value: agentRamUsage(selectedAgente), unit: "%", warn: 80, crit: 90 },
                    { label: "Disco", value: agentDiskUsage(selectedAgente), unit: "%", warn: 80, crit: 90 },
                    { label: "Rede", value: null, unit: "", warn: 0, crit: 0 },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{m.label}</span>
                        <span className={(m.value ?? 0) > m.crit ? "text-red-600 font-bold" : (m.value ?? 0) > m.warn ? "text-yellow-600" : "text-muted-foreground"}>
                          {m.label === "Rede"
                            ? `${formatNetworkKb(selectedAgente.rede_enviado_atual_kb)} ↑ / ${formatNetworkKb(selectedAgente.rede_recebido_atual_kb)} ↓`
                            : `${m.value ?? "—"}${m.value != null ? m.unit : ""}`}
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
                          {(agenteMetricas.data?.metricas ?? []).slice(-20).reverse().map((m: any, index: number) => (
                            <TableRow key={m.id ?? metricTimestamp(m) ?? index}>
                              <TableCell className="text-xs font-mono">{formatDateTimeBR(metricTimestamp(m))}</TableCell>
                              <TableCell className={`text-xs ${(metricCpuUsage(m) ?? 0) > 80 ? "text-red-600 font-bold" : ""}`}>{metricCpuUsage(m) ?? "—"}%</TableCell>
                              <TableCell className={`text-xs ${(metricRamUsage(m) ?? 0) > 80 ? "text-red-600 font-bold" : ""}`}>{metricRamUsage(m) ?? "—"}%</TableCell>
                              <TableCell className="text-xs">{metricDiskUsage(m) ?? "—"}%</TableCell>
                              <TableCell className="text-xs">
                                {formatNetworkKb(metricNetworkSent(m))} ↑ / {formatNetworkKb(metricNetworkRecv(m))} ↓
                              </TableCell>
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
              {filteredAgentes.map((a: any) => (
                <Card key={a.id} className={`border-l-4 cursor-pointer hover:shadow-md transition-shadow ${agentStatus(a) === "online" ? "border-l-green-500" : agentStatus(a) === "atencao" ? "border-l-yellow-500" : "border-l-gray-400"}`} onClick={() => setSelectedAgente(a)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-mono">{a.hostname}</CardTitle>
                      <div className="flex items-center gap-2">
                        {agentAnyDesk(a) && (
                          <a href={`anydesk://${agentAnyDesk(a)}`} className="text-blue-600 hover:text-blue-800" title={`AnyDesk: ${agentAnyDesk(a)}`} onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <div className={`h-2.5 w-2.5 rounded-full ${agentStatus(a) === "online" ? "bg-green-500" : "bg-gray-400"}`} />
                        {renderAgenteActions(a)}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.so} · {a.ip}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: "CPU", value: agentCpuUsage(a), icon: <Cpu className="h-3 w-3" /> },
                      { label: "RAM", value: agentRamUsage(a), icon: <Server className="h-3 w-3" /> },
                      { label: "Disco", value: agentDiskUsage(a), icon: <HardDrive className="h-3 w-3" /> },
                      { label: "Rede", value: null, icon: <Wifi className="h-3 w-3" /> },
                    ].map((m) => (
                      <div key={m.label} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1">{m.icon}{m.label}</span>
                          <span className={(m.value ?? 0) > 80 ? "text-red-600 font-bold" : "text-muted-foreground"}>
                            {m.label === "Rede" ? `${formatNetworkKb(a.rede_enviado_atual_kb)} ↑ / ${formatNetworkKb(a.rede_recebido_atual_kb)} ↓` : m.value != null ? `${m.value}%` : "—"}
                          </span>
                        </div>
                        <Progress value={m.value ?? 0} className="h-1.5" />
                      </div>
                    ))}
                    {agentCpuTemp(a) != null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
                        <Thermometer className="h-3 w-3" />{agentCpuTemp(a)}°C
                        {agentAnyDesk(a) && <span className="ml-auto font-mono">{agentAnyDesk(a)}</span>}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Última coleta: {formatDateTimeBR(agentLastCollected(a))}</p>
                  </CardContent>
                </Card>
              ))}
              {filteredAgentes.length === 0 && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum dispositivo encontrado neste filtro</p>
                  <p className="text-sm mt-1">Troque o filtro ou vá em <strong>Dispositivos</strong> para baixar o Synapse para Windows.</p>
                  <Button className="mt-4" size="sm" onClick={() => setTab("agentes")}>Ir para Dispositivos</Button>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm">Solicitações de acesso remoto</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Fluxo de consentimento e execução por chamado.</p>
              </div>
              <Select value={remoteStatusFilter} onValueChange={setRemoteStatusFilter}>
                <SelectTrigger className="w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="autorizado">Autorizado</SelectItem>
                  <SelectItem value="negado">Negado</SelectItem>
                  <SelectItem value="em_acesso">Em acesso</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chamado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AnyDesk</TableHead>
                    <TableHead>Consentimento</TableHead>
                    <TableHead>Solicitado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(remoteAccessQ.data ?? []).map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{req.protocolo ?? `#${req.ticketId}`}</p>
                          <p className="text-xs text-muted-foreground">{req.ticket_titulo ?? "Chamado sem título"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{String(req.status).replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{req.anydeskId || "—"}</TableCell>
                      <TableCell>
                        {req.consentimento === true ? (
                          <Badge className="bg-green-100 text-green-700">Autorizado</Badge>
                        ) : req.consentimento === false ? (
                          <Badge className="bg-red-100 text-red-700">Negado</Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTimeBR(req.solicitadoEm)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.status === "solicitado" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => updateRemoteAccessRequest.mutate({
                                  id: req.id,
                                  status: "autorizado",
                                  consentimento: true,
                                  anydeskId: req.anydeskId ?? undefined,
                                  observacoes: "Consentimento confirmado pelo usuário.",
                                })}
                              >
                                Autorizar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => updateRemoteAccessRequest.mutate({
                                  id: req.id,
                                  status: "negado",
                                  consentimento: false,
                                  observacoes: "Acesso remoto negado pelo usuário.",
                                })}
                              >
                                Negar
                              </Button>
                            </>
                          )}
                          {req.status === "autorizado" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => updateRemoteAccessRequest.mutate({
                                id: req.id,
                                status: "em_acesso",
                                consentimento: true,
                                observacoes: "Sessão remota iniciada pela equipe de TI.",
                              })}
                            >
                              Iniciar sessão
                            </Button>
                          )}
                          {req.status === "em_acesso" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => updateRemoteAccessRequest.mutate({
                                id: req.id,
                                status: "encerrado",
                                consentimento: true,
                                observacoes: "Sessão remota encerrada.",
                              })}
                            >
                              Encerrar sessão
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(remoteAccessQ.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma solicitação de acesso remoto registrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

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
                    <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(a.ultimaSessao)}</TableCell>
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
                      <TableCell className="text-sm">{formatDateBR(c.vencimento)}</TableCell>
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
                    <p className="text-xs text-muted-foreground">{l.tipo} · {l.fornecedor} · Expira: {formatDateBR(l.expiracao)}</p>
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
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createCompra.mutate({
                    item: compraForm.item,
                    fornecedor: compraForm.fornecedor || undefined,
                    quantidade: Number(compraForm.quantidade) || 1,
                    valorUnitario: Number(compraForm.valorUnitario) || undefined,
                    justificativa: [compraForm.categoria, compraForm.urgencia, compraForm.justificativa].filter(Boolean).join(" | "),
                    observacoes: compraForm.observacoes || undefined,
                    status: "em_aprovacao",
                  });
                }} className="space-y-4">
                  <div><Label>Item *</Label><Input value={compraForm.item} onChange={(e) => setCompraForm((p) => ({ ...p, item: e.target.value }))} placeholder="Notebook Dell para RH" required /></div>
                  <div><Label>Justificativa *</Label><Textarea value={compraForm.justificativa} onChange={(e) => setCompraForm((p) => ({ ...p, justificativa: e.target.value }))} placeholder="Explique a necessidade da compra..." rows={3} required /></div>
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
                    <div><Label>Quantidade *</Label><Input type="number" min={1} value={compraForm.quantidade} onChange={(e) => setCompraForm((p) => ({ ...p, quantidade: Number(e.target.value) || 1 }))} required /></div>
                    <div><Label>Valor Unitário (R$)</Label><Input type="number" min={0} step="0.01" value={compraForm.valorUnitario} onChange={(e) => setCompraForm((p) => ({ ...p, valorUnitario: Number(e.target.value) || 0 }))} /></div>
                    <div><Label>Fornecedor</Label><Input value={compraForm.fornecedor} onChange={(e) => setCompraForm((p) => ({ ...p, fornecedor: e.target.value }))} placeholder="Dell, Kabum..." /></div>
                    <div className="col-span-2"><Label>Observações</Label><Textarea value={compraForm.observacoes} onChange={(e) => setCompraForm((p) => ({ ...p, observacoes: e.target.value }))} placeholder="Detalhes adicionais, prazo, link ou orçamento." rows={3} /></div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createCompra.isPending}>Criar Requisição</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Solicitado", value: (comprasQ.data ?? []).filter((c: any) => c.status === "solicitado").length },
              { label: "Em aprovação", value: (comprasQ.data ?? []).filter((c: any) => c.status === "em_aprovacao").length },
              { label: "Aprovado", value: (comprasQ.data ?? []).filter((c: any) => c.status === "aprovado").length },
              { label: "Comprado", value: (comprasQ.data ?? []).filter((c: any) => c.status === "comprado").length },
              { label: "Entregue", value: (comprasQ.data ?? []).filter((c: any) => c.status === "entregue").length },
            ].map((card) => (
              <Card key={card.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <div className="md:hidden space-y-3 p-4">
              {(comprasQ.data ?? []).map((c: any) => (
                <div key={c.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{c.item}</p>
                      <p className="text-xs text-muted-foreground">{c.fornecedor || "Fornecedor não informado"}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                  </div>
                  {c.justificativa && <p className="text-sm text-muted-foreground line-clamp-3">{c.justificativa}</p>}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-muted-foreground">Quantidade</p><p>{c.quantidade ?? 1}</p></div>
                    <div><p className="text-muted-foreground">Valor unitário</p><p>R$ {Number(c.valorUnitario ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                    <div><p className="text-muted-foreground">Valor total</p><p>R$ {Number(c.valorTotal ?? (Number(c.quantidade ?? 1) * Number(c.valorUnitario ?? 0))).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                    <div><p className="text-muted-foreground">Alçada</p><p>Nível {c.nivelAlcada ?? 1}</p></div>
                    <div className="col-span-2"><p className="text-muted-foreground">Aprovador</p><p>{c.aprovador_nome || "—"}</p></div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground mb-1">Fluxo</p>
                      <Select value={c.status} onValueChange={(value) => updateCompra.mutate({ id: c.id, status: value as any })} disabled={updateCompra.isPending}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solicitado">Solicitado</SelectItem>
                          <SelectItem value="em_aprovacao">Em aprovação</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="rejeitado">Rejeitado</SelectItem>
                          <SelectItem value="comprado">Comprado</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              {(comprasQ.data ?? []).length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma requisição criada</p>
              )}
            </div>
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(comprasQ.data ?? []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div>{c.item}</div>
                      {c.justificativa && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.justificativa}</p>}
                    </TableCell>
                    <TableCell>{c.fornecedor || "—"}</TableCell>
                    <TableCell>{c.quantidade ?? 1}</TableCell>
                    <TableCell className="text-sm">R$ {Number(c.valorUnitario ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-sm">
                      <div>R$ {Number(c.valorTotal ?? (Number(c.quantidade ?? 1) * Number(c.valorUnitario ?? 0))).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <p className="text-xs text-muted-foreground">Alçada {c.nivelAlcada ?? 1}</p>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{c.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Select value={c.status} onValueChange={(value) => updateCompra.mutate({ id: c.id, status: value as any })} disabled={updateCompra.isPending}>
                        <SelectTrigger className="w-[150px] ml-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solicitado">Solicitado</SelectItem>
                          <SelectItem value="em_aprovacao">Em aprovação</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="rejeitado">Rejeitado</SelectItem>
                          <SelectItem value="comprado">Comprado</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {(comprasQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma requisição criada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            </div>
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
                    <TableCell className="text-xs text-muted-foreground">{m.dataAgendada ? formatDateTimeBR(m.dataAgendada) : formatDateTimeBR(m.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {(manutencoesQ.data ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma manutenção registrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ DISPOSITIVOS ══ */}
        <TabsContent value="agentes" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Download do Synapse para Windows */}
            <Card className="overflow-hidden border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-2xl shadow-slate-950/20">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="mb-3 border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                      Centro de implantação
                    </Badge>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Download className="h-5 w-5 text-cyan-300" />Baixar Synapse para Windows
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-400">
                      Instalador oficial para conectar este Windows ao Synapse com monitoramento, suporte e pareamento seguro.
                    </p>
                  </div>
                  <Badge className="bg-emerald-400/10 text-emerald-200 border border-emerald-400/20">
                    v{agentVersion}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: "Aplicativo Windows", value: "Tudo em um" },
                    { label: "Status", value: "Pronto" },
                    { label: "Canal", value: "Produção" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-100">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-300">
                  O Synapse para Windows instala suporte local, chat, pareamento, monitoramento, reparo, remoção e limpeza de vínculo antigo em uma experiência única.
                  O modo usuário comum ou TI/Admin é resolvido automaticamente pelas permissões da conta.
                </p>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Como instalar no Windows</p>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-3 space-y-2 text-xs text-slate-300">
                    <p>1. Baixe o Synapse para Windows abaixo.</p>
                    <p>2. Execute o aplicativo e informe o código de pareamento quando solicitado.</p>
                    <p>3. O dispositivo ficará sincronizado com suporte, monitoramento e notificações do Synapse.</p>
                    <div className="space-y-1">
                      <p className="text-slate-500">Servidor Synapse</p>
                      <div className="flex items-center gap-2">
                        <Input value={backendBaseUrl} readOnly className="h-8 text-xs font-mono border-white/10 bg-white/[0.04] text-slate-200" />
                        <Button type="button" variant="outline" size="sm" className="border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/10" onClick={() => copyToClipboard(backendBaseUrl)}>
                          {copiedCode === backendBaseUrl ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                          Copiar
                        </Button>
                      </div>
                    </div>
                    <p>4. O aplicativo também permite reparar, remover ou limpar um vínculo antigo sem expor detalhes técnicos ao usuário.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                    <Button size="sm" className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300" asChild>
                      <a href={`${backendBaseUrl}/api/agent/download${agentDownloadSuffix}`} download={`SynapseSetup-${agentVersion}.exe`}>
                        <Download className="h-4 w-4 mr-2" />Baixar Synapse para Windows
                      </a>
                    </Button>
                    <p className="text-xs text-slate-500">
                      Versão publicada: <span className="font-mono text-slate-300">{agentVersion}</span>. Componentes de compatibilidade ficam disponíveis apenas internamente para suporte técnico.
                    </p>
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
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!hasTiOperationalContext) {
                        toast.error("Selecione uma empresa ativa para continuar.");
                        return;
                      }
                      gerarCodigo.mutate({ ...optionalEmpresaPayload, userId: Number(user?.id || 0) || undefined });
                    }}
                    disabled={gerarCodigo.isPending || !hasTiOperationalContext}
                  >
                    <Plus className="h-4 w-4 mr-1" />Gerar Código
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isMasterAdmin && !hasEmpresaContext && (
                  <div className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-900 dark:text-cyan-100">
                    Contexto global master ativo. O backend resolve a empresa operacional segura para pareamento; usuários comuns e TI continuam filtrados por tenant.
                  </div>
                )}
                {!isMasterAdmin && !hasEmpresaContext && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Nenhuma empresa ativa selecionada. Escolha uma empresa no topo para gerar e listar códigos de pareamento.
                  </div>
                )}
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
                      <p className="text-xs text-muted-foreground">Expira: {formatDateTimeBR(c.expiresAt)}</p>
                      {c.hostnameVinculado && <p className="text-xs text-muted-foreground">PC: {c.hostnameVinculado}</p>}
                    </div>
                    <div className="flex gap-1">
                      {!c.usado && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyToClipboard(c.codigo)}>
                          {copiedCode === c.codigo ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => revogarCodigo.mutate({ id: c.id, ...optionalEmpresaPayload })}>
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
              <div className="space-y-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Monitor className="h-4 w-4" />Ativos Monitorados ({filteredAgentes.length}/{(agentesQ.data ?? []).length})
              </CardTitle>
                {renderAgentFilterBar()}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>SO</TableHead>
                    <TableHead>Hardware</TableHead>
                    <TableHead>AnyDesk</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>24x7 / Rede</TableHead>
                    <TableHead>Última Coleta</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgentes.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-sm font-medium">
                      <button 
                        onClick={() => setLocation(`/ti/dispositivos/${a.id}`)}
                        className="text-primary hover:underline text-left"
                      >
                        {a.hostname}
                      </button>
                    </TableCell>
                      <TableCell className="font-mono text-xs">{a.ip}</TableCell>
                      <TableCell className="text-xs">{a.so}</TableCell>
                      <TableCell className="text-xs max-w-[260px]">
                        <div className="space-y-0.5">
                          <p className="truncate" title={a.cpu_model || a.cpuModel || "CPU não identificada"}>
                            CPU: {a.cpu_model || a.cpuModel || "—"}
                          </p>
                          <p className="truncate" title={a.placa_mae_modelo || a.placaMaeModelo || "Placa-mãe não identificada"}>
                            MB: {a.placa_mae_modelo || a.placaMaeModelo || "—"}
                          </p>
                          <p className="truncate" title={a.socket_cpu || a.socketCpu || "Socket não identificado"}>
                            Socket: {a.socket_cpu || a.socketCpu || "—"}
                          </p>
                          <p className="truncate" title={a.gpu_model || a.gpuModel || "GPU não identificada"}>
                            GPU: {a.gpu_model || a.gpuModel || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {agentAnyDesk(a) ? (
                          <a href={`anydesk://${agentAnyDesk(a)}`} className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />{agentAnyDesk(a)}
                          </a>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{a.versaoAgente}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1.5 text-xs ${agentStatus(a) === "online" ? "text-green-600" : "text-gray-500"}`}>
                          <div className={`h-2 w-2 rounded-full ${agentStatus(a) === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                          {agentStatusLabel(agentStatus(a))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs max-w-[240px]">
                        <div className="space-y-1">
                          {agentIsCritical(a) ? (
                            <Badge className="bg-amber-100 text-amber-700">Crítico 24x7</Badge>
                          ) : (
                            <Badge variant="outline">Padrão</Badge>
                          )}
                          <p className="text-muted-foreground">{agentNetworkDiagnostic(a, agentesQ.data ?? [])}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTimeBR(agentLastCollected(a))}
                      </TableCell>
                      <TableCell>
                        {renderAgenteActions(a, { showView: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAgentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8 space-y-2">
                        <p>Nenhum dispositivo encontrado neste filtro.</p>
                        <p className="text-xs">
                          Verifique se o código de pareamento foi usado e clique em <strong>Atualizar</strong>.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ DISPOSITIVOS ══ */}
        <TabsContent value="dispositivos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Gerenciar vínculos dos ativos monitorados aos usuários. O software instalado e o dispositivo exibido são tratados como o mesmo item.</p>
              <Badge variant="secondary" className="text-xs">{vinculoAgentes.length}/{agentes.length}</Badge>
            </div>
            <div className="flex gap-2">
              <Dialog open={showGenerateCodeModal} onOpenChange={setShowGenerateCodeModal}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><QrCode className="h-4 w-4 mr-2" />Gerar Código</Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle>Gerar Código de Pareamento</DialogTitle></DialogHeader>
                  {!generatedCode ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerateCodeSubmit(); }} className="space-y-4">
                      <div>
                        <Label>Usuário *</Label>
                        <Select value={generateCodeForm.userId} onValueChange={(v) => setGenerateCodeForm((p) => ({ ...p, userId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione um usuário..." /></SelectTrigger>
                          <SelectContent>
                            {usuarios.map((u: any) => (
                              <SelectItem key={u.id} value={u.id.toString()}>{u.name} {u.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Departamento (opcional)</Label>
                        <Input value={generateCodeForm.departmentId} onChange={(e) => setGenerateCodeForm((p) => ({ ...p, departmentId: e.target.value }))} placeholder="Ex: TI, RH" />
                      </div>
                      <Button type="submit" className="w-full" disabled={generatePairingCode.mutateAsync === undefined}>Gerar</Button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-2">Código de Pareamento</p>
                        <p className="text-2xl font-mono font-bold text-primary">{generatedCode.code}</p>
                        <p className="text-xs text-muted-foreground mt-2">Expira em: {formatDateTimeBR(generatedCode.expiresAt)}</p>
                      </div>
                      <Button onClick={handleCopyCode} className="w-full" variant="outline"><Copy className="h-4 w-4 mr-2" />Copiar Código</Button>
                      <Button onClick={() => { setGeneratedCode(null); setShowGenerateCodeModal(false); }} className="w-full" variant="secondary">Fechar</Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={() => agentesQ.refetch()}><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Buscar por hostname..." className="max-w-xs" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showOnlyUnassociated} onChange={(e) => setShowOnlyUnassociated(e.target.checked)} className="rounded" />
              <span className="text-sm text-muted-foreground">Apenas não vinculados</span>
            </label>
          </div>
          {renderAgentFilterBar()}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>SO</TableHead>
                  <TableHead>Usuário Vinculado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Coleta</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentesLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : vinculoAgentes.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum dispositivo sincronizado</TableCell></TableRow>
                ) : vinculoAgentes.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      <button 
                        onClick={() => setLocation(`/ti/dispositivos/${a.id}`)}
                        className="text-primary hover:underline text-left"
                      >
                        {a.hostname}
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.ip}</TableCell>
                    <TableCell className="text-xs">{a.so}</TableCell>
                    <TableCell className="text-sm">{a.userName ? `${a.userName} ${a.userLastName}` : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-sm">{a.department_id || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 text-xs ${agentStatus(a) === "online" ? "text-green-600" : "text-gray-500"}`}>
                        <div className={`h-2 w-2 rounded-full ${agentStatus(a) === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                        {agentStatusLabel(agentStatus(a))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTimeBR(agentLastCollected(a))}
                    </TableCell>
                    <TableCell>{renderAgenteActions(a, { showAssociate: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ══ LIMPEZA DE AGENTES ══ */}
        <TabsContent value="limpeza-agentes" className="space-y-4 mt-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Limpeza de agentes</h2>
              <p className="text-sm text-muted-foreground">
                Encontre duplicados por hostname/fingerprint, escolha qual registro manter e libere o PC para reinstalação sem criar duplicidade.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => agentesQ.refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />Atualizar
            </Button>
          </div>

          {renderAgentFilterBar()}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Duplicados</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{agentDuplicateInfo.ids.size}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Arquivados</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{agentFilterOptions.find((f) => f.value === "arquivados")?.count ?? 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Removidos/descartados</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{agentFilterOptions.find((f) => f.value === "removidos")?.count ?? 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Sem heartbeat</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{agentFilterOptions.find((f) => f.value === "sem_heartbeat")?.count ?? 0}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />Duplicados detectados
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                O Synapse recomenda manter o registro online ou com heartbeat mais recente. Os demais podem ser arquivados, removidos do monitoramento ou ter vínculo/token limpo.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {agentDuplicateInfo.groups.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum duplicado encontrado por hostname ou fingerprint.
                </div>
              )}
              {agentDuplicateInfo.groups.map((group) => {
                const keepId = cleanupKeepByGroup[group.key] ?? Number(group.suggestedKeepId);
                return (
                  <div key={group.key} className="rounded-xl border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {group.reason === "fingerprint" ? "Fingerprint duplicado" : "Hostname duplicado"}: <span className="font-mono">{group.value}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{group.agentes.length} registros encontrados. Escolha um para manter.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => executarAcaoGrupoAgentes(group, keepId, "arquivar")}>
                          <Archive className="h-3.5 w-3.5 mr-1" />Arquivar demais
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => executarAcaoGrupoAgentes(group, keepId, "remover_monitoramento")}>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Remover monitoramento
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => executarAcaoGrupoAgentes(group, keepId, "limpar_vinculo")}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />Limpar vínculos
                        </Button>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Manter</TableHead>
                          <TableHead>Hostname</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Último heartbeat</TableHead>
                          <TableHead>Fingerprint</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.agentes.map((agente: any) => (
                          <TableRow key={`${group.key}-${agente.id}`}>
                            <TableCell>
                              <input
                                type="radio"
                                name={`keep-${group.key}`}
                                checked={Number(agente.id) === Number(keepId)}
                                onChange={() => setCleanupKeepByGroup((prev) => ({ ...prev, [group.key]: Number(agente.id) }))}
                                aria-label={`Manter ${agente.hostname}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{agente.hostname}</TableCell>
                            <TableCell>
                              <Badge variant={agentStatus(agente) === "online" ? "default" : "secondary"} className="text-xs">
                                {agentStatusLabel(agentStatus(agente))}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(agentLastCollected(agente))}</TableCell>
                            <TableCell className="font-mono text-[11px] max-w-[180px] truncate" title={agente.fingerprint || "Sem fingerprint"}>
                              {agente.fingerprint || "—"}
                            </TableCell>
                            <TableCell>{renderAgenteActions(agente, { showView: true })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Registros filtrados para limpeza ({filteredAgentes.length})</CardTitle>
              <p className="text-xs text-muted-foreground">
                Use esta lista para desparear, arquivar, descartar, remover monitoramento ou reativar ativos que não existem mais.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último heartbeat</TableHead>
                    <TableHead>Dias sem heartbeat</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAgentes.map((agente: any) => (
                    <TableRow key={`cleanup-${agente.id}`}>
                      <TableCell className="font-mono text-sm">{agente.hostname}</TableCell>
                      <TableCell className="font-mono text-xs">{agente.ip || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={agentStatus(agente) === "online" ? "default" : "secondary"} className="text-xs">
                          {agentStatusLabel(agentStatus(agente))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(agentLastCollected(agente))}</TableCell>
                      <TableCell className="text-xs">
                        {Number.isFinite(agentDaysSinceHeartbeat(agente)) ? `${agentDaysSinceHeartbeat(agente)} dia(s)` : "sem coleta"}
                      </TableCell>
                      <TableCell className="text-xs">{agente.versaoAgente || "—"}</TableCell>
                      <TableCell>{renderAgenteActions(agente, { showView: true })}</TableCell>
                    </TableRow>
                  ))}
                  {filteredAgentes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum agente encontrado no filtro atual.
                      </TableCell>
                    </TableRow>
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
                  <p className="text-xs text-muted-foreground">{a.hostname && `PC: ${a.hostname} · `}{formatDateTimeBR(a.criadoEm)}</p>
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
