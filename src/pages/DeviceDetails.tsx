import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, RefreshCw, Cpu, HardDrive, Activity, 
  Monitor, User, Building2, Clock, Calendar, Wifi
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDateTimeBR, SYNAPSE_TIME_ZONE } from "@/lib/timezone";
import { useAuth } from "@/hooks/useAuth";

const DEVICE_DETAIL_ROLES = new Set([
  "master_admin",
  "ti_master",
  "admin",
  "admin_empresa",
  "administrador",
  "ti",
  "supervisor_geral",
  "supervisor_ti",
]);

export default function DeviceDetails() {
  const { user } = useAuth();
  const { agentId } = useParams() as any;
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState("24h");
  const canViewDeviceDetails = DEVICE_DETAIL_ROLES.has(String(user?.role || "").toLowerCase());

  useEffect(() => {
    if (user && !canViewDeviceDetails) {
      setLocation("/ti/tickets");
    }
  }, [canViewDeviceDetails, setLocation, user]);

  const agentesQ = trpc.ti.listAgentes.useQuery(undefined, { enabled: canViewDeviceDetails, refetchInterval: 20000 }) as any;
  const metricasQ = trpc.ti.getAgenteMetricas.useQuery(
    { agenteId: Number(agentId), periodo: period === "24h" ? "24h" : period === "7d" ? "7d" : "30d" },
    { enabled: canViewDeviceDetails && !!agentId, refetchInterval: 30000 }
  ) as any;

  const agente = (agentesQ.data ?? []).find((a: any) => a.id === Number(agentId)) ?? null;
  const safeParse = (value: any) => {
    if (!value) return null;
    if (Array.isArray(value) || typeof value === "object") return value;
    try { return JSON.parse(String(value)); } catch { return null; }
  };
  const gpus = safeParse(agente?.gpus) as any[] | null;
  const memoriaSlots = safeParse(agente?.memoria_slots) as any[] | null;
  const formatNetworkKb = (value: any) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return "—";
    if (numeric >= 1024 * 1024) return `${(numeric / 1024 / 1024).toFixed(1)} GB`;
    if (numeric >= 1024) return `${(numeric / 1024).toFixed(1)} MB`;
    return `${numeric.toFixed(0)} KB`;
  };
  const metrics = (metricasQ.data?.metricas ?? []).map((m: any) => ({
    ...m,
    timestamp: m.hora,
    cpuUsage: Number(m.cpu_medio ?? 0),
    ramUsedGb: Number(m.ram_medio ?? 0),
    networkDownloadKb: Number(m.rede_recebido_kb ?? m.redeRecebidoKb ?? 0),
    networkUploadKb: Number(m.rede_enviado_kb ?? m.redeEnviadoKb ?? 0),
    time: new Date(m.hora).toLocaleTimeString("pt-BR", {
      timeZone: SYNAPSE_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      day: period !== "24h" ? "2-digit" : undefined,
      month: period !== "24h" ? "2-digit" : undefined,
    }),
  }));
  const loading = agentesQ.isLoading || metricasQ.isLoading;
  const refreshing = agentesQ.isRefetching || metricasQ.isRefetching;

  const fetchData = async () => {
    try {
      await Promise.all([agentesQ.refetch(), metricasQ.refetch()]);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados do dispositivo");
    }
  };

  if (user && !canViewDeviceDetails) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Acesso restrito</h2>
        <Button variant="link" onClick={() => setLocation("/ti/tickets")}>Voltar para meus chamados</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando detalhes do dispositivo...</p>
        </div>
      </div>
    );
  }

  if (!agente) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Dispositivo não encontrado</h2>
        <Button variant="link" onClick={() => setLocation("/ti")}>Voltar para TI</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/ti")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="h-6 w-6 text-primary" />
              {agente.hostname}
            </h1>
            <p className="text-muted-foreground text-sm">Detalhes e monitoramento de desempenho</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24 horas</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Último mês</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {agente.userName ? `${agente.userName} ${agente.userLastName}` : "Não vinculado"}
            </div>
            <p className="text-xs text-muted-foreground">{agente.department_id || "Sem departamento"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" /> Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={agente.status === "online" ? "default" : "secondary"} className={agente.status === "online" ? "bg-green-500" : ""}>
              {agente.status?.toUpperCase() || "OFFLINE"}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Visto por último: {formatDateTimeBR(agente.ultima_coleta || agente.updatedAt, "Nunca")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" /> Processador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate" title={agente.cpu_model}>{agente.cpu_model || agente.processador || "N/A"}</div>
            <p className="text-xs text-muted-foreground">{agente.so || "Sistema desconhecido"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" /> Memória RAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {agente.ram_total_mb ? `${(Number(agente.ram_total_mb) / 1024).toFixed(1)} GB` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Capacidade total instalada</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inventário de Hardware</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Placa-mãe</span><span className="font-medium text-right">{agente.placa_mae_modelo || agente.placaMaeModelo || "Não informado"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Fabricante</span><span className="font-medium text-right">{agente.placa_mae_fabricante || "Não informado"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Socket CPU</span><span className="font-medium text-right">{agente.socket_cpu || agente.socketCpu || "Não informado"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">BIOS</span><span className="font-medium text-right">{agente.bios_versao || "Não informado"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">GPU principal</span><span className="font-medium text-right">{agente.gpuModel || gpus?.[0]?.name || gpus?.[0]?.model || "Não informado"}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Memória e Slots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">RAM instalada</span><span className="font-medium text-right">{agente.ram_total_mb ? `${(Number(agente.ram_total_mb) / 1024).toFixed(1)} GB` : "Não informado"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-muted-foreground">Slots detectados</span><span className="font-medium text-right">{memoriaSlots?.length ?? 0}</span></div>
            {(memoriaSlots ?? []).slice(0, 4).map((slot: any, idx: number) => (
              <div key={idx} className="rounded border p-2 text-xs">
                Slot {slot.slot || idx + 1}: {slot.size_gb || slot.sizeGb || "?"} GB {slot.speed_mhz || slot.speedMhz ? `· ${slot.speed_mhz || slot.speedMhz} MHz` : ""}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4" /> Uso de CPU (%)
            </CardTitle>
            <CardDescription>Histórico de processamento no período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" fontSize={10} tickMargin={10} />
                <YAxis domain={[0, 100]} fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpuUsage" 
                  name="CPU %" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  dot={false} 
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" /> Uso de RAM (GB)
            </CardTitle>
            <CardDescription>Consumo de memória física no período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" fontSize={10} tickMargin={10} />
                <YAxis fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: '#8884d8' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ramUsedGb" 
                  name="RAM (GB)" 
                  stroke="#8884d8" 
                  strokeWidth={2} 
                  dot={false} 
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wifi className="h-4 w-4" /> Rede
            </CardTitle>
            <CardDescription>Download/upload médio e picos coletados pelo agente</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" fontSize={10} tickMargin={10} />
                <YAxis fontSize={10} tickFormatter={(value) => formatNetworkKb(value)} />
                <Tooltip
                  formatter={(value: any, name: any) => [formatNetworkKb(value), name === "networkDownloadKb" ? "Download" : "Upload"]}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="networkDownloadKb" name="Download" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="networkUploadKb" name="Upload" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
