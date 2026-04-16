import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send, Search, UserPlus, MessageSquare,
  Loader2, ChevronLeft, User, Users, Image, Paperclip,
  Smile, Phone, Video, MoreVertical, Check, CheckCheck,
  Download, X, ZoomIn, FileText, Film,
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

// ─── Componente de Mensagem ──────────────────────────────────────────────────
function MessageBubble({ msg, isOwn }: { msg: any; isOwn: boolean }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const hasImage = msg.attachmentType === "image" && msg.attachmentUrl;
  const hasFile = msg.attachmentType === "file" && msg.attachmentUrl;
  const hasVideo = msg.attachmentType === "video" && msg.attachmentUrl;

  return (
    <>
      <div className={cn("flex flex-col max-w-[75%]", isOwn ? "ml-auto items-end" : "mr-auto items-start")}>
        {!isOwn && (
          <p className="text-[10px] font-semibold text-primary mb-1 px-1">{msg.senderName}</p>
        )}
        <div className={cn(
          "rounded-2xl shadow-sm overflow-hidden",
          isOwn ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-foreground rounded-tl-none border",
          hasImage ? "p-0" : "p-3"
        )}>
          {/* Imagem */}
          {hasImage && (
            <div className="relative group cursor-pointer" onClick={() => setLightboxOpen(true)}>
              <img
                src={msg.attachmentUrl}
                alt="Imagem"
                className="max-w-[280px] max-h-[200px] object-cover rounded-2xl"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-2xl flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          {/* Vídeo */}
          {hasVideo && (
            <video
              src={msg.attachmentUrl}
              controls
              className="max-w-[280px] rounded-2xl"
            />
          )}

          {/* Arquivo */}
          {hasFile && (
            <div className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{msg.attachmentName ?? "Arquivo"}</p>
                <p className="text-xs opacity-70">{msg.attachmentSize ?? ""}</p>
              </div>
              <a href={msg.attachmentUrl} download className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                <Download className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Texto */}
          {msg.content && (
            <p className={cn("text-sm leading-relaxed", (hasImage || hasFile || hasVideo) ? "px-3 pb-3 pt-2" : "")}>
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

      {/* Lightbox */}
      {lightboxOpen && hasImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white p-2 rounded-full hover:bg-white/10">
            <X className="h-6 w-6" />
          </button>
          <img src={msg.attachmentUrl} alt="Imagem ampliada" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function Chat() {
  const { user } = useAuth();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchConv, setSearchConv] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } =
    trpc.chat.listConversations.useQuery(undefined, { refetchInterval: 5000 });

  const { data: messages, isLoading: loadingMsgs, refetch: refetchMsgs } =
    trpc.chat.listMessages.useQuery(
      { conversationId: selectedConvId as number },
      { enabled: !!selectedConvId, refetchInterval: 3000 }
    );

  const { data: allUsers } = trpc.chat.listUsers.useQuery(undefined, { enabled: showUserList });

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => { setMessage(""); setAttachments([]); refetchMsgs(); refetchConvs(); },
  });

  const startChatMutation = trpc.chat.getOrCreatePrivateConversation.useMutation({
    onSuccess: (data) => { setSelectedConvId(data.conversationId); setShowUserList(false); refetchConvs(); },
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  // Paste (Ctrl+V para colar prints)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!selectedConvId) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (imageItems.length > 0) {
        const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
        addFiles(files);
        toast.info("Imagem colada! Clique em Enviar para compartilhar.");
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
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachments.length === 0) || !selectedConvId) return;
    // Por ora envia apenas o texto; a lógica de upload de arquivos será integrada ao backend
    sendMutation.mutate({ conversationId: selectedConvId, content: message || "📎 Arquivo" });
  };

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);

  const filteredConvs = conversations?.filter((c) =>
    c.displayName.toLowerCase().includes(searchConv.toLowerCase())
  );

  return (
    <TooltipProvider>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => setShowUserList(true)} className="rounded-full h-8 w-8">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nova conversa</TooltipContent>
            </Tooltip>
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
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
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
                      <p className="text-xs text-muted-foreground truncate">Toque para ver mensagens</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* ── Área do Chat ── */}
        <div className={cn(
          "flex-1 flex flex-col bg-background",
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
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {selectedConv?.isGroup ? <Users className="h-4 w-4" /> : selectedConv?.displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{selectedConv?.displayName}</p>
                  <p className="text-[10px] text-green-500 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Online
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
                  ) : (
                    messages?.map((msg: any) => (
                      <MessageBubble key={msg.id} msg={msg} isOwn={msg.senderId === user?.id} />
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
                        <img src={att.url} alt="preview" className="h-16 w-16 object-cover rounded-lg border" />
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

              {/* Input */}
              <div className="p-3 border-t bg-card">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-3xl mx-auto">
                  {/* Botão de imagem */}
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
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => imageInputRef.current?.click()}>
                        <Image className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Enviar foto/vídeo (ou Cole com Ctrl+V)</TooltipContent>
                  </Tooltip>

                  {/* Botão de arquivo */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Anexar arquivo</TooltipContent>
                  </Tooltip>

                  <Input
                    placeholder={attachments.length > 0 ? "Adicione uma legenda..." : "Digite uma mensagem... (Cole prints com Ctrl+V)"}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={sendMutation.isPending}
                    className="flex-1 h-10 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full px-4"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e as any);
                      }
                    }}
                  />

                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 rounded-full shrink-0"
                    disabled={(!message.trim() && attachments.length === 0) || sendMutation.isPending}
                  >
                    {sendMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                  Cole prints com <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Ctrl+V</kbd> · Arraste arquivos para enviar
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
              <Button className="mt-4" size="sm" onClick={() => setShowUserList(true)}>
                <UserPlus className="h-4 w-4 mr-2" />Nova Conversa
              </Button>
            </div>
          )}
        </div>

        {/* ── Dialog: Nova Conversa ── */}
        <Dialog open={showUserList} onOpenChange={setShowUserList}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader><DialogTitle>Nova Conversa</DialogTitle></DialogHeader>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuário..." className="pl-9" />
            </div>
            <ScrollArea className="h-[320px] pr-2">
              <div className="space-y-1">
                {allUsers?.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => startChatMutation.mutate({ targetUserId: u.id })}
                    className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-xl transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {u.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{u.name} {u.lastName ?? ""}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Send className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
                {(allUsers ?? []).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">Nenhum usuário encontrado</p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
