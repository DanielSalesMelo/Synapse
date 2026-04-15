import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import {
  Send, Truck, User, MapPin, Clock, CheckCircle2,
  AlertCircle, Play, Square, RefreshCw, Plus, Eye
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<string, string> = {
  planejada: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  em_andamento: "bg-blue-500/10 text-blue-600 border-blue-200",
  concluida: "bg-green-500/10 text-green-600 border-green-200",
  cancelada: "bg-red-500/10 text-red-600 border-red-200",
};

export default function Despachante() {
  const { t } = useTranslation();
  const [modalSaida, setModalSaida] = useState(false);
  const [modalChegada, setModalChegada] = useState(false);
  const [modalNova, setModalNova] = useState(false);
  const [viagemSelecionada, setViagemSelecionada] = useState<any>(null);
  const [kmSaida, setKmSaida] = useState("");
  const [kmChegada, setKmChegada] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  // Nova viagem
  const [novaViagem, setNovaViagem] = useState({
    veiculoId: "",
    motoristaPrincipalId: "",
    ajudante1Id: "",
    ajudante2Id: "",
    ajudante3Id: "",
    cavaloCoplado: "",
    origem: "",
    destino: "",
    kmSaida: "",
    observacoes: "",
  });

  const { data: viagens, refetch } = trpc.viagens.list.useQuery({ empresaId: 1 });
  const { data: veiculos } = trpc.veiculos.list.useQuery({ empresaId: 1 });
  const { data: funcionarios } = trpc.funcionarios.list.useQuery({ empresaId: 1 });

  const registrarSaida = trpc.viagens.update.useMutation({
    onSuccess: () => { toast.success("Saída registrada!"); setModalSaida(false); refetch(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const registrarChegada = trpc.viagens.update.useMutation({
    onSuccess: () => { toast.success("Chegada registrada!"); setModalChegada(false); refetch(); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const criarViagem = trpc.viagens.create.useMutation({
    onSuccess: () => { toast.success("Viagem criada!"); setModalNova(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const motoristas = funcionarios?.filter(f =>
    f.funcao === "motorista"
  ) ?? [];

  const ajudantes = funcionarios?.filter(f =>
    f.funcao === "ajudante"
  ) ?? [];

  const viagensFiltradas = (viagens ?? []).filter(v =>
    filterStatus === "todos" ? true : v.status === filterStatus
  );

  const emAndamento = (viagens ?? []).filter(v => v.status === "em_andamento");
  const planejadas = (viagens ?? []).filter(v => v.status === "planejada");
  const concluidas = (viagens ?? []).filter(v => v.status === "concluida");

  // Veículos tipo cavalo/carreta para acoplamento
  const cavalos = (veiculos ?? []).filter(v =>
    v.tipo === "cavalo"
  );

  const handleSaida = (viagem: any) => {
    setViagemSelecionada(viagem);
    setKmSaida(viagem.kmSaida?.toString() ?? "");
    setModalSaida(true);
  };

  const handleChegada = (viagem: any) => {
    setViagemSelecionada(viagem);
    setKmChegada(viagem.kmChegada?.toString() ?? "");
    setModalChegada(true);
  };

  const handleCriarViagem = () => {
    if (!novaViagem.veiculoId || !novaViagem.motoristaPrincipalId) {
      toast.error("Veículo e motorista são obrigatórios");
      return;
    }
    criarViagem.mutate({
      empresaId: 1,
      veiculoId: parseInt(novaViagem.veiculoId),
      motoristaId: parseInt(novaViagem.motoristaPrincipalId),
      ajudante1Id: novaViagem.ajudante1Id ? parseInt(novaViagem.ajudante1Id) : undefined,
      ajudante2Id: novaViagem.ajudante2Id ? parseInt(novaViagem.ajudante2Id) : undefined,
      ajudante3Id: novaViagem.ajudante3Id ? parseInt(novaViagem.ajudante3Id) : undefined,
      cavaloPrincipalId: novaViagem.cavaloCoplado ? parseInt(novaViagem.cavaloCoplado) : undefined,
      origem: novaViagem.origem || undefined,
      destino: novaViagem.destino || undefined,
      kmSaida: novaViagem.kmSaida ? parseFloat(novaViagem.kmSaida) : undefined,
      observacoes: novaViagem.observacoes || undefined,
    });
  };

  return (
    <>
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Send className="h-6 w-6 text-primary" />
              Painel do Despachante
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Controle de saída e chegada de veículos em tempo real
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setModalNova(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Viagem
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{emAndamento.length}</p>
                  <p className="text-xs text-muted-foreground">Em Andamento</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{planejadas.length}</p>
                  <p className="text-xs text-muted-foreground">Planejadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-500/5 col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{concluidas.length}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtro de status */}
        <div className="flex flex-wrap gap-2">
          {["todos", "planejada", "em_andamento", "concluida", "cancelada"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {s === "todos" ? "Todas" : STATUS_LABELS[s]}
              {s !== "todos" && (
                <span className="ml-1.5 opacity-70">
                  ({(viagens ?? []).filter(v => v.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista de viagens */}
        <div className="space-y-3">
          {viagensFiltradas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma viagem encontrada</p>
              </CardContent>
            </Card>
          ) : (
            viagensFiltradas.map((viagem: any) => (
              <Card key={viagem.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`text-xs border ${STATUS_COLORS[viagem.status] ?? ""}`}>
                          {STATUS_LABELS[viagem.status] ?? viagem.status}
                        </Badge>
                        <span className="font-semibold text-sm">
                          {viagem.placa ?? `Viagem #${viagem.id}`}
                        </span>
                        {viagem.cavaloCoplado && (
                          <span className="text-xs text-muted-foreground">
                            + Cavalo: {viagem.cavaloCoplado}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {viagem.motoristaNome && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {viagem.motoristaNome}
                          </span>
                        )}
                        {(viagem.origem || viagem.destino) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {viagem.origem ?? "—"} → {viagem.destino ?? "—"}
                          </span>
                        )}
                        {viagem.kmSaida && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            KM Saída: {viagem.kmSaida.toLocaleString("pt-BR")}
                          </span>
                        )}
                        {viagem.kmChegada && (
                          <span>
                            KM Chegada: {viagem.kmChegada.toLocaleString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 shrink-0">
                      {viagem.status === "planejada" && (
                        <Button size="sm" onClick={() => handleSaida(viagem)} className="gap-1">
                          <Play className="h-3.5 w-3.5" />
                          Registrar Saída
                        </Button>
                      )}
                      {viagem.status === "em_andamento" && (
                        <Button size="sm" variant="outline" onClick={() => handleChegada(viagem)} className="gap-1 border-green-300 text-green-700 hover:bg-green-50">
                          <Square className="h-3.5 w-3.5" />
                          Registrar Chegada
                        </Button>
                      )}
                      {viagem.status === "concluida" && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Concluída
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal: Registrar Saída */}
      <Dialog open={modalSaida} onOpenChange={setModalSaida}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600" />
              Registrar Saída
            </DialogTitle>
          </DialogHeader>
          {viagemSelecionada && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Veículo:</span> <strong>{viagemSelecionada.placa}</strong></p>
                <p><span className="text-muted-foreground">Motorista:</span> {viagemSelecionada.motoristaNome ?? "—"}</p>
              </div>
              <div className="space-y-2">
                <Label>KM de Saída *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 125000"
                  value={kmSaida}
                  onChange={e => setKmSaida(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalSaida(false)}>Cancelar</Button>
            <Button
              onClick={() => registrarSaida.mutate({ id: viagemSelecionada.id, kmSaida: parseFloat(kmSaida), status: "em_andamento" })}
              disabled={!kmSaida || registrarSaida.isPending}
            >
              {registrarSaida.isPending ? "Salvando..." : "Confirmar Saída"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Chegada */}
      <Dialog open={modalChegada} onOpenChange={setModalChegada}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Registrar Chegada
            </DialogTitle>
          </DialogHeader>
          {viagemSelecionada && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Veículo:</span> <strong>{viagemSelecionada.placa}</strong></p>
                <p><span className="text-muted-foreground">KM Saída:</span> {viagemSelecionada.kmSaida?.toLocaleString("pt-BR") ?? "—"}</p>
              </div>
              <div className="space-y-2">
                <Label>KM de Chegada *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 126500"
                  value={kmChegada}
                  onChange={e => setKmChegada(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalChegada(false)}>Cancelar</Button>
            <Button
              onClick={() => registrarChegada.mutate({ id: viagemSelecionada.id, kmChegada: parseFloat(kmChegada), status: "concluida" })}
              disabled={!kmChegada || registrarChegada.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {registrarChegada.isPending ? "Salvando..." : "Confirmar Chegada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nova Viagem */}
      <Dialog open={modalNova} onOpenChange={setModalNova}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova Viagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Veículo *</Label>
                <Select value={novaViagem.veiculoId} onValueChange={v => setNovaViagem(p => ({ ...p, veiculoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(veiculos ?? []).filter(v => v.tipo !== "cavalo").map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.placa} — {v.modelo ?? v.tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motorista *</Label>
                <Select value={novaViagem.motoristaPrincipalId} onValueChange={v => setNovaViagem(p => ({ ...p, motoristaPrincipalId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {motoristas.map((m: any) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ajudantes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="space-y-2">
                  <Label className="text-xs">Ajudante {n}</Label>
                  <Select
                    value={(novaViagem as any)[`ajudante${n}Id`]}
                    onValueChange={v => setNovaViagem(p => ({ ...p, [`ajudante${n}Id`]: v }))}
                  >
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {ajudantes.map((a: any) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Cavalo acoplado (só aparece se veículo for carreta) */}
            {cavalos.length > 0 && (
              <div className="space-y-2">
                <Label>Cavalo Acoplado <span className="text-muted-foreground text-xs">(para carretas)</span></Label>
                <Select value={novaViagem.cavaloCoplado} onValueChange={v => setNovaViagem(p => ({ ...p, cavaloCoplado: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cavalo (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {cavalos.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.placa} — {v.modelo ?? "Cavalo"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem</Label>
                <PlacesAutocomplete
                  value={novaViagem.origem}
                  onChange={v => setNovaViagem(p => ({ ...p, origem: v }))}
                  placeholder="Cidade, endereço ou empresa..."
                  iconColor="text-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <PlacesAutocomplete
                  value={novaViagem.destino}
                  onChange={v => setNovaViagem(p => ({ ...p, destino: v }))}
                  placeholder="Cidade, endereço ou empresa..."
                  iconColor="text-red-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>KM de Saída</Label>
              <Input type="number" placeholder="Odômetro atual" value={novaViagem.kmSaida} onChange={e => setNovaViagem(p => ({ ...p, kmSaida: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input placeholder="Informações adicionais" value={novaViagem.observacoes} onChange={e => setNovaViagem(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button onClick={handleCriarViagem} disabled={criarViagem.isPending}>
              {criarViagem.isPending ? "Criando..." : "Criar Viagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
