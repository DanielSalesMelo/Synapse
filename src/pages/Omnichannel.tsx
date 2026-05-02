import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Send, Smartphone, Instagram, MessageSquare, Filter } from "lucide-react";
import { toast } from "sonner";

function providerLabel(provider?: string) {
  if (provider === "whatsapp") return "WhatsApp";
  if (provider === "telegram") return "Telegram";
  if (provider === "instagram") return "Instagram";
  if (provider === "evolution_api") return "Evolution API";
  return provider || "Canal";
}

function providerIcon(provider?: string) {
  if (provider === "whatsapp") return <Smartphone className="h-4 w-4 text-green-500" />;
  if (provider === "instagram") return <Instagram className="h-4 w-4 text-pink-500" />;
  return <MessageCircle className="h-4 w-4 text-sky-500" />;
}

export default function Omnichannel() {
  const { effectiveEmpresaId } = useViewAs();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [provider, setProvider] = useState<"all" | "whatsapp" | "telegram" | "instagram">("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const providersQ = trpc.omnichannel.listConnectedProviders.useQuery(
    { empresaId: effectiveEmpresaId || undefined },
    { enabled: !!effectiveEmpresaId },
  ) as any;

  const conversationsQ = trpc.omnichannel.listConversations.useQuery(
    {
      empresaId: effectiveEmpresaId || undefined,
      provider: provider === "all" ? undefined : provider,
      onlyUnread,
    },
    { enabled: !!effectiveEmpresaId, refetchInterval: 10000 },
  ) as any;

  const selectedConversation = (conversationsQ.data ?? []).find((item: any) => item.id === selectedConversationId) ?? null;

  const messagesQ = trpc.omnichannel.listMessages.useQuery(
    { conversationId: selectedConversationId as number },
    { enabled: !!selectedConversationId, refetchInterval: 5000 },
  ) as any;

  const sendMessage = trpc.omnichannel.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      messagesQ.refetch();
      conversationsQ.refetch();
      toast.success("Mensagem enviada para o canal externo.");
    },
    onError: (error) => toast.error(error.message || "Falha ao enviar mensagem."),
  });

  const filteredConversations = useMemo(() => {
    const items = conversationsQ.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((conv: any) =>
      [conv.displayName, conv.phone, conv.username, conv.lastMessagePreview]
        .filter(Boolean)
        .some((value: any) => String(value).toLowerCase().includes(term)),
    );
  }, [conversationsQ.data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Omnichannel Externo
          </h1>
          <p className="text-sm text-muted-foreground">
            Atendimento real para WhatsApp, Telegram e Instagram com histórico persistido por empresa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(providersQ.data ?? []).map((item: any, index: number) => (
            <Badge key={`${item.tipo}-${index}`} variant="outline" className="gap-1">
              {providerIcon(item.tipo)}
              {providerLabel(item.tipo)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Conversas externas</CardTitle>
              <Badge variant="secondary">{filteredConversations.length}</Badge>
            </div>
            <Input
              placeholder="Buscar contato, telefone ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
              <Button variant={onlyUnread ? "default" : "outline"} onClick={() => setOnlyUnread((prev) => !prev)}>
                Não lidas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[65vh]">
              <div className="divide-y">
                {filteredConversations.map((conv: any) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={`w-full p-4 text-left transition-colors hover:bg-muted/40 ${
                      selectedConversationId === conv.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {providerIcon(conv.provider)}
                          <p className="font-medium truncate">{conv.displayName || conv.phone || conv.externalId}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {providerLabel(conv.provider)} {conv.phone ? `• ${conv.phone}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{Number(conv.inboundCount ?? 0)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-2">
                      {conv.lastMessagePreview || "Sem mensagem recente"}
                    </p>
                  </button>
                ))}
                {filteredConversations.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground text-center">
                    Nenhuma conversa externa encontrada.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedConversation ? selectedConversation.displayName || selectedConversation.phone || "Conversa" : "Selecione uma conversa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedConversation ? (
              <div className="flex h-[65vh] flex-col">
                <div className="border-b px-4 py-3 text-sm text-muted-foreground">
                  Canal: {providerLabel(selectedConversation.provider)}
                  {selectedConversation.phone ? ` • ${selectedConversation.phone}` : ""}
                  {selectedConversation.username ? ` • @${selectedConversation.username}` : ""}
                </div>
                <ScrollArea className="flex-1 px-4 py-4">
                  <div className="space-y-3">
                    {(messagesQ.data ?? []).map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          msg.direction === "out" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          {msg.content || (msg.mediaUrl ? "Mensagem com mídia" : "Mensagem vazia")}
                          <div className={`mt-2 text-[11px] ${msg.direction === "out" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(messagesQ.data ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">Sem mensagens nesta conversa.</p>
                    )}
                  </div>
                </ScrollArea>
                <div className="border-t p-3">
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!message.trim()) return;
                      sendMessage.mutate({ conversationId: selectedConversation.id, content: message.trim() });
                    }}
                  >
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Responder no canal externo..."
                    />
                    <Button type="submit" disabled={sendMessage.isPending || !message.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="h-[65vh] flex items-center justify-center text-sm text-muted-foreground">
                Escolha uma conversa para atender o contato.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
