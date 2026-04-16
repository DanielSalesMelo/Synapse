import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Send, Search, UserPlus, MessageSquare,
  Loader2, ChevronLeft, Users, Image, Paperclip,
  Phone, Video, MoreVertical, Check, CheckCheck,
  Download, X, ZoomIn, FileText, Film, Plus, Hash,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Tipos ──────────────────────────────────────────────────────────────────
type AttachmentPreview = {
  file: File;
  url: string;
  type: "image" | "file" | "video";
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function getFileType(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Lightbox ───────────────────────────────────────────────────────────────
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      <img
        src={src}
        alt="Imagem ampliada"
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Componente de Mensagem ──────────────────────────────────────────────────
function MessageBubble({ msg, isOwn, onImageClick }: { msg: any; isOwn: boolean; onImageClick: (url: string) => void }) {
  const hasImage = msg.attachmentType === "image" && msg.attachmentUrl;
  const hasFile = msg.attachmentType === "file" && msg.attachmentUrl;
  const hasVideo = msg.attachmentType === "video" && msg.attachmentUrl;

  return (
    <div className={cn("flex flex-col max-w-[75%]", isOwn ? "ml-auto items-end" : "mr-auto items-start")}>
      {!isOwn && (
        <p className="text-[10px] font-semibold text-primary mb-1 px-1">{msg.senderName}</p>
      )}
      <div className={cn(
        "rounded-2xl shadow-sm overflow-hidden",
        isOwn ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-foreground rounded-tl-none border",
        hasImage ? "p-0" : "p-3"
      )}>
        {/* Imagem — clicável para lightbox */}
        {hasImage && (
          <div
            className="relative group cursor-zoom-in"
            onClick={() => onImageClick(msg.attachmentUrl)}
          >
            <img
              src={msg.attachmentUrl}
              alt="Imagem"
              className="max-w-[280px] max-h-[220px] object-cover rounded-2xl block"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-2xl flex items-center justify-center">
              <ZoomIn className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
          </div>
        )}

        {/* Vídeo inline */}
        {hasVideo && (
          <video
            src={msg.attachmentUrl}
            controls
            className="max-w-[280px] rounded-2xl block"
          />
        )}

        {/* Arquivo — preview inline sem download obrigatório */}
        {hasFile && (
          <div className="flex items-center gap-3 p-3 min-w-[200px]">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.attachmentName ?? "Arquivo"}</p>
              <p className="text-xs opacity-70">{msg.attachmentSize ?? ""}</p>
            </div>
            <div className="flex gap-1">
              {/* Visualizar inline (abre em nova aba) */}
              <a
                href={msg.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                title="Visualizar"
              >
                <ZoomIn className="h-4 w-4" />
              </a>
              {/* Download */}
              <a
                href={msg.attachmentUrl}
                download={msg.attachmentName}
                className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                title="Baixar"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Texto */}
        {msg.content && (
          <p className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap",
            (hasImage || hasFile || hasVideo) ? "px-3 pb-3 pt-2" : ""
          )}>
            {msg.content}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 mt-1 px-1">
        <span className="text-[10px] text-muted-foreground">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        {isOwn && (
          msg.readAt
            ? <CheckCheck className="h-3 w-3 text-blue-500" />
            : <Check className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function Chat() {
  const { user } = useAuth();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchConv, setSearchConv] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<number[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // ← REF para o campo de texto — usado para manter o foco após envio
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } =
    trpc.chat.listConversations.useQuery(undefined, { refetchInterval: 5000 });

  const { data: messages, isLoading: loadingMsgs, refetch: refetchMsgs } =
    trpc.chat.listMessages.useQuery(
      { conversationId: selectedConvId as number },
      { enabled: !!selectedConvId, refetchInterval: 3000 }
    );

  const { data: allUsers } = trpc.chat.listUsers.useQuery(undefined, {
    enabled: showUserList || showGroupCreate,
  });

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      // Estado já limpo em handleSendMessage — apenas refetch
      refetchMsgs();
      refetchConvs();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao enviar mensagem");
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  });

  const startChatMutation = trpc.chat.getOrCreatePrivateConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConvId(data.conversationId);
      setShowUserList(false);
      refetchConvs();
      setTimeout(() => inputRef.current?.focus(), 100);
    },
  });

  const createGroupMutation = trpc.chat.createGroupConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConvId(data.conversationId);
      setShowGroupCreate(false);
      setGroupName("");
      setSelectedGroupMembers([]);
      refetchConvs();
      toast.success("Grupo criado com sucesso!");
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar grupo");
    },
  });

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Abrir conversa direta via URL param ?userId=X (vindo do módulo TI)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    if (userId) {
      startChatMutation.mutate({ targetUserId: parseInt(userId) });
      // Limpar o param da URL sem recarregar a página
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Foco automático ao selecionar conversa
  useEffect(() => {
    if (selectedConvId) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedConvId]);

  // Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  // Paste (Ctrl+V para colar prints) — sem toast intrusivo
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!selectedConvId) return;
      // Se o foco está em outro input (ex: busca), não interceptar
      const active = document.activeElement;
      if (active && active !== inputRef.current && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (imageItems.length > 0) {
        const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
        addFiles(files);
        // Sem toast — o preview visual já é feedback suficiente
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [selectedConvId]);

  const addFiles = (files: File[]) => {
    const newAttachments: AttachmentPreview[] = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      type: getFileType(file),
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    // Foco no input após adicionar arquivo
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!message.trim() && attachments.length === 0) || !selectedConvId) return;
    const content = message.trim();
    const currentAttachments = [...attachments];
    // Limpar imediatamente para melhor UX
    setMessage("");
    setAttachments([]);
    requestAnimationFrame(() => inputRef.current?.focus());

    const getApiBase = () => {
      if (typeof window === "undefined") return "";
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        return "http://localhost:3000";
      return (import.meta.env.VITE_API_URL as string) || "https://synapse-producion.up.railway.app";
    };

    if (currentAttachments.length > 0) {
      for (const attachment of currentAttachments) {
        try {
          const formData = new FormData();
          formData.append("file", attachment.file);
          const authToken = localStorage.getItem("synapse-auth-token");
          const resp = await fetch(`${getApiBase()}/api/upload`, {
            method: "POST",
            body: formData,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          });
          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error || `Upload falhou (${resp.status})`);
          }
          const data = await resp.json();
          sendMutation.mutate({
            conversationId: selectedConvId,
            content: content || "",
            fileUrl: data.url,
            fileName: attachment.file.name,
            fileSize: attachment.file.size,
            mimeType: attachment.file.type,
          });
        } catch (err: any) {
          toast.error(err?.message || "Erro ao enviar arquivo");
        }
      }
      // Se também há texto, envia mensagem de texto separada
      if (content) {
        sendMutation.mutate({ conversationId: selectedConvId, content });
      }
    } else {
      sendMutation.mutate({ conversationId: selectedConvId, content });
    }
  };

  // Enter envia, Shift+Enter quebra linha
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      // O foco é restaurado pelo onSuccess do sendMutation
    }
  };

  const toggleGroupMember = (userId: number) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) { toast.error("Digite um nome para o grupo"); return; }
    if (selectedGroupMembers.length < 1) { toast.error("Selecione ao menos 1 membro"); return; }
    createGroupMutation.mutate({ name: groupName.trim(), memberIds: selectedGroupMembers });
  };

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);

  const filteredConvs = conversations?.filter((c) =>
    c.displayName.toLowerCase().includes(searchConv.toLowerCase())
  );

  const filteredUsers = allUsers?.filter((u: any) =>
    `${u.name} ${u.lastName ?? ""} ${u.email}`.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <TooltipProvider>
      {/* Lightbox global */}
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div
        className="flex h-[calc(100vh-120px)] gap-0 overflow-hidden rounded-xl border shadow-sm"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* ── Sidebar de Conversas ── */}
        <div className={cn(
          "flex flex-col w-full md:w-80 border-r bg-card",
          selectedConvId ? "hidden md:flex" : "flex"
        )}>
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-base flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Mensagens
            </h2>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setShowGroupCreate(true)} className="rounded-full h-8 w-8">
                    <Hash className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Criar grupo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" onClick={() => setShowUserList(true)} className="rounded-full h-8 w-8">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nova conversa</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Busca */}
          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-9 h-8 text-sm bg-muted/40 border-0"
                value={searchConv}
                onChange={(e) => setSearchConv(e.target.value)}
              />
            </div>
          </div>

          {/* Lista */}
          <ScrollArea className="flex-1">
            {loadingConvs ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : (filteredConvs ?? []).length === 0 ? (
              <div className="text-center p-8 text-muted-foreground text-sm">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>Nenhuma conversa</p>
                <Button variant="link" size="sm" onClick={() => setShowUserList(true)}>Iniciar chat</Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredConvs?.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left",
                      selectedConvId === conv.id ? "bg-primary/10 border-l-2 border-primary" : ""
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={cn(
                          "text-sm",
                          conv.isGroup ? "bg-violet-100 text-violet-600" : "bg-primary/10 text-primary"
                        )}>
                          {conv.isGroup ? <Users className="h-4 w-4" /> : conv.displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-semibold text-sm truncate">{conv.displayName}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                          {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.isGroup ? "Grupo" : "Conversa privada"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Área do Chat ── */}
        <div className={cn(
          "flex-1 flex flex-col bg-background relative",
          !selectedConvId ? "hidden md:flex" : "flex"
        )}>
          {selectedConvId ? (
            <>
              {/* Header do Chat */}
              <div className="px-4 py-3 border-b flex items-center gap-3 bg-card/50 backdrop-blur-sm">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedConvId(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn(
                    "text-sm",
                    selectedConv?.isGroup ? "bg-violet-100 text-violet-600" : "bg-primary/10 text-primary"
                  )}>
                    {selectedConv?.isGroup ? <Users className="h-4 w-4" /> : selectedConv?.displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{selectedConv?.displayName}</p>
                  <p className="text-[10px] text-green-500 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {selectedConv?.isGroup ? "Grupo" : "Online"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Ligar</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Videochamada</TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Mais opções</TooltipContent></Tooltip>
                </div>
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-3xl mx-auto">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                  ) : (messages ?? []).length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Nenhuma mensagem ainda.</p>
                      <p className="text-xs opacity-60 mt-1">Seja o primeiro a enviar uma mensagem!</p>
                    </div>
                  ) : (
                    messages?.map((msg: any) => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isOwn={msg.senderId === user?.id}
                        onImageClick={setLightboxSrc}
                      />
                    ))
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Preview de Anexos */}
              {attachments.length > 0 && (
                <div className="px-4 py-2 border-t bg-muted/30 flex gap-2 flex-wrap">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative group">
                      {att.type === "image" ? (
                        <img
                          src={att.url}
                          alt="preview"
                          className="h-16 w-16 object-cover rounded-lg border cursor-zoom-in"
                          onClick={() => setLightboxSrc(att.url)}
                        />
                      ) : att.type === "video" ? (
                        <div className="h-16 w-16 rounded-lg border bg-card flex flex-col items-center justify-center gap-1">
                          <Film className="h-6 w-6 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground truncate w-14 text-center">{att.file.name}</span>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-lg border bg-card flex flex-col items-center justify-center gap-1">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground truncate w-14 text-center">{att.file.name}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <Image className="h-12 w-12 mx-auto text-primary mb-2" />
                    <p className="font-semibold text-primary">Solte para enviar</p>
                  </div>
                </div>
              )}

              {/* Input — foco mantido após Enter */}
              <div className="p-3 border-t bg-card">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
                  {/* Imagem */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Foto/vídeo (ou Cole com Ctrl+V)</TooltipContent>
                  </Tooltip>

                  {/* Arquivo */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Anexar arquivo</TooltipContent>
                  </Tooltip>

                  {/* Campo de texto com ref para foco */}
                  <Input
                    ref={inputRef}
                    placeholder={
                      attachments.length > 0
                        ? "Adicione uma legenda... (Enter para enviar)"
                        : "Digite uma mensagem... (Enter para enviar, Ctrl+V para colar prints)"
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sendMutation.isPending}
                    className="flex-1 h-10 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full px-4 text-sm"
                    autoComplete="off"
                  />

                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 rounded-full shrink-0"
                    disabled={(!message.trim() && attachments.length === 0) || sendMutation.isPending}
                  >
                    {sendMutation.isPending
                      ? <Loader2 className="animate-spin h-4 w-4" />
                      : <Send className="h-4 w-4" />
                    }
                  </Button>
                </form>

                <p className="text-[10px] text-muted-foreground text-center mt-1.5 select-none">
                  <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Enter</kbd> envia ·{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Ctrl+V</kbd> cola prints ·{" "}
                  Arraste arquivos para enviar
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 opacity-20" />
              </div>
              <p className="font-semibold">Selecione uma conversa</p>
              <p className="text-sm opacity-60 mt-1">Ou inicie um novo chat</p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => setShowGroupCreate(true)}>
                  <Hash className="h-4 w-4 mr-2" />Criar Grupo
                </Button>
                <Button size="sm" onClick={() => setShowUserList(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />Nova Conversa
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Dialog: Nova Conversa Privada ── */}
        <Dialog open={showUserList} onOpenChange={setShowUserList}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Nova Conversa
              </DialogTitle>
            </DialogHeader>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-9"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                autoFocus
              />
            </div>
            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-1">
                {(filteredUsers ?? []).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado</p>
                ) : (
                  filteredUsers?.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => startChatMutation.mutate({ targetUserId: u.id })}
                      className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-xl transition-colors text-left group"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {(u.name ?? "?")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{u.name} {u.lastName ?? ""}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Send className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Criar Grupo ── */}
        <Dialog open={showGroupCreate} onOpenChange={(open) => {
          setShowGroupCreate(open);
          if (!open) { setGroupName(""); setSelectedGroupMembers([]); setSearchUser(""); }
        }}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-violet-600" />
                Criar Grupo
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Nome do grupo */}
              <div>
                <Label className="text-sm font-medium">Nome do Grupo</Label>
                <Input
                  placeholder="Ex: Equipe Financeiro, Suporte TI..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1"
                  autoFocus
                />
              </div>

              {/* Busca de membros */}
              <div>
                <Label className="text-sm font-medium">Adicionar Membros</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    className="pl-9"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                  />
                </div>
              </div>

              {/* Membros selecionados */}
              {selectedGroupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedGroupMembers.map((id) => {
                    const u = allUsers?.find((u: any) => u.id === id);
                    if (!u) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                      >
                        {u.name}
                        <button onClick={() => toggleGroupMember(id)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Lista de usuários */}
              <ScrollArea className="h-[220px] border rounded-lg">
                <div className="p-1 space-y-0.5">
                  {(filteredUsers ?? []).length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">Nenhum usuário encontrado</p>
                  ) : (
                    filteredUsers?.map((u: any) => {
                      const selected = selectedGroupMembers.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleGroupMember(u.id)}
                          className={cn(
                            "w-full p-2.5 flex items-center gap-3 rounded-lg transition-colors text-left",
                            selected ? "bg-primary/10 text-primary" : "hover:bg-accent"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={cn(
                              "text-xs",
                              selected ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              {(u.name ?? "?")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{u.name} {u.lastName ?? ""}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Botão criar */}
              <Button
                className="w-full"
                onClick={handleCreateGroup}
                disabled={createGroupMutation.isPending || !groupName.trim() || selectedGroupMembers.length === 0}
              >
                {createGroupMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Criar Grupo ({selectedGroupMembers.length} membros)</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
