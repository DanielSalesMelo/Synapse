import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, Search, UserPlus, MessageSquare, 
  Loader2, ChevronLeft, User
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: conversations, isLoading: loadingConvs, refetch: refetchConvs } = trpc.chat.listConversations.useQuery(undefined, {
    refetchInterval: 5000, // Atualiza lista de conversas a cada 5s
  });

  const { data: messages, isLoading: loadingMsgs, refetch: refetchMsgs } = trpc.chat.listMessages.useQuery(
    { conversationId: selectedConvId as number },
    { 
      enabled: !!selectedConvId,
      refetchInterval: 3000, // Atualiza mensagens a cada 3s
    }
  );

  const { data: allUsers } = trpc.chat.listUsers.useQuery(undefined, { enabled: showUserList });

  // Mutations
  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMsgs();
      refetchConvs();
    }
  });

  const startChatMutation = trpc.chat.getOrCreatePrivateConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConvId(data.conversationId);
      setShowUserList(false);
      refetchConvs();
    }
  });

  // Auto-scroll para o fim das mensagens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedConvId) return;
    sendMutation.mutate({ conversationId: selectedConvId, content: message });
  };

  const selectedConv = conversations?.find(c => c.id === selectedConvId);

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 overflow-hidden">
      {/* Sidebar - Lista de Conversas */}
      <Card className={cn(
        "flex-col w-full md:w-80 border shadow-sm",
        selectedConvId ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-4 border-b flex items-center justify-between bg-background">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chat Interno
          </h2>
          <Button size="icon" variant="ghost" onClick={() => setShowUserList(true)} className="rounded-full">
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-4 bg-background">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar conversa..." className="pl-9 h-9 bg-muted/30 border-none" />
          </div>
        </div>
        <ScrollArea className="flex-1 bg-muted/10">
          {loadingConvs ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : conversations?.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhuma conversa iniciada</p>
              <Button variant="link" size="sm" onClick={() => setShowUserList(true)}>Iniciar novo chat</Button>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={cn(
                    "w-full p-4 flex items-center gap-3 hover:bg-primary/5 transition-colors text-left",
                    selectedConvId === conv.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                  )}
                >
                  <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarFallback className="bg-primary/5 text-primary">
                      {conv.isGroup ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className="font-semibold text-sm truncate">{conv.displayName}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">Clique para ver mensagens</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className={cn(
        "flex-1 flex flex-col border shadow-sm overflow-hidden",
        !selectedConvId ? 'hidden md:flex' : 'flex'
      )}>
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3 bg-background/50 backdrop-blur-sm">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConvId(null)}>
                <ChevronLeft />
              </Button>
              <Avatar className="h-9 w-9 border shadow-sm">
                <AvatarFallback className="bg-primary/5 text-primary">
                  {selectedConv?.isGroup ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">{selectedConv?.displayName}</p>
                <p className="text-[10px] text-green-500 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online agora
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-muted/5">
              <div className="space-y-4">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[75%]",
                        msg.senderId === user?.id ? 'ml-auto items-end' : 'mr-auto items-start'
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-2xl text-sm shadow-sm",
                        msg.senderId === user?.id 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-card text-foreground rounded-tl-none border'
                      )}>
                        {msg.senderId !== user?.id && (
                          <p className="text-[10px] font-bold mb-1 opacity-70">{msg.senderName}</p>
                        )}
                        <p className="leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t bg-background">
              <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={sendMutation.isPending}
                  className="flex-1 h-11 bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary"
                />
                <Button type="submit" size="icon" className="h-11 w-11 rounded-full shadow-lg" disabled={!message.trim() || sendMutation.isPending}>
                  {sendMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-10 w-10 opacity-20" />
            </div>
            <p className="font-medium">Selecione uma conversa para começar</p>
            <p className="text-sm opacity-60">Escolha um usuário na lista ao lado</p>
          </div>
        )}
      </Card>

      {/* User List Dialog */}
      <Dialog open={showUserList} onOpenChange={setShowUserList}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-1">
              {allUsers?.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startChatMutation.mutate({ targetUserId: u.id })}
                  className="w-full p-3 flex items-center gap-3 hover:bg-primary/5 rounded-xl transition-colors text-left group"
                >
                  <Avatar className="h-10 w-10 border group-hover:border-primary/30 transition-colors">
                    <AvatarFallback className="bg-primary/5 text-primary">{u.name[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{u.name} {u.lastName || ""}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft className="h-4 w-4 rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
