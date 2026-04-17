import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronLeft, RefreshCw, Cpu, HardDrive, Activity, 
  Monitor, User, Building2, Clock, Calendar
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { toast } from "sonner";

export default function DeviceDetails() {
  const { agentId } = useParams();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState("24h");
  const [agente, setAgente] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem("synapse-auth-token") ?? "";
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:3001" : "";
      
      // Buscar dados do agente
      const agentsRes = await fetch(`${baseUrl}/api/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const agents = await agentsRes.json();
      const currentAgent = agents.find((a: any) => a.id === parseInt(agentId || "0"));
      setAgente(currentAgent);

      // Buscar métricas
      const metricsRes = await fetch(`${baseUrl}/api/agents/${agentId}/metrics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const metricsData = await metricsRes.json();
      
      // Formatar timestamps para o gráfico
      const formattedMetrics = metricsData.map((m: any) => ({
        ...m,
        time: new Date(m.timestamp).toLocaleTimeString("pt-BR", { 
          hour: '2-digit', 
          minute: '2-digit',
          day: period !== '24h' ? '2-digit' : undefined,
          month: period !== '24h' ? '2-digit' : undefined
        })
      }));
      
      setMetrics(formattedMetrics);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados do dispositivo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [agentId, period]);

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
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
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
              Visto por último: {agente.updatedAt ? new Date(agente.updatedAt).toLocaleString("pt-BR") : "Nunca"}
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
            <div className="text-sm font-medium truncate" title={agente.cpu_model}>{agente.cpu_model || "N/A"}</div>
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
              {agente.total_ram ? `${(agente.total_ram / 1024 / 1024 / 1024).toFixed(1)} GB` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Capacidade total instalada</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
}
