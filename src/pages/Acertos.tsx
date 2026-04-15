import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calculator, Plus, Search, DollarSign, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const EMPRESA_ID = 1;

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Acertos() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    motoristaId: "",
    viagemId: "",
    dataAcerto: new Date().toISOString().split("T")[0],
    freteRecebido: "",
    adiantamento: "",
    combustivelPago: "",
    pedagioPago: "",
    refeicaoPago: "",
    outrosDescontos: "",
    outrosCreditos: "",
    observacoes: "",
  });

  const { data: motoristas = [] } = trpc.funcionarios.listMotoristas.useQuery({ empresaId: EMPRESA_ID });
  const { data: viagens = [] } = trpc.viagens.list.useQuery({ empresaId: EMPRESA_ID });

  const [acertos, setAcertos] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem("rotiq_acertos") || "[]"); } catch { return []; }
  });

  const viagensMotorista = viagens.filter((v: any) =>
    form.motoristaId && String(v.motoristaId) === form.motoristaId && v.status === "concluida"
  );

  const freteRecebido = Number(form.freteRecebido) || 0;
  const adiantamento = Number(form.adiantamento) || 0;
  const combustivel = Number(form.combustivelPago) || 0;
  const pedagio = Number(form.pedagioPago) || 0;
  const refeicao = Number(form.refeicaoPago) || 0;
  const outrosDesc = Number(form.outrosDescontos) || 0;
  const outrosCred = Number(form.outrosCreditos) || 0;

  const totalDescontos = adiantamento + combustivel + pedagio + refeicao + outrosDesc;
  const saldoFinal = freteRecebido + outrosCred - totalDescontos;

  const salvarAcerto = () => {
    if (!form.motoristaId) { toast.error("Selecione o motorista"); return; }
    if (!form.freteRecebido) { toast.error("Informe o valor do frete"); return; }

    const motorista = motoristas.find((m: any) => String(m.id) === form.motoristaId);
    const viagem = viagens.find((v: any) => String(v.id) === form.viagemId);

    const novoAcerto = {
      id: Date.now(),
      ...form,
      motoristaNome: motorista?.nome || "Motorista",
      viagemInfo: viagem ? `${viagem.origem || ""} → ${viagem.destino || ""}` : null,
      freteRecebido, adiantamento, combustivel, pedagio, refeicao,
      outrosDescontos: outrosDesc, outrosCreditos: outrosCred,
      totalDescontos, saldoFinal,
      status: saldoFinal >= 0 ? "a_pagar" : "a_receber",
      createdAt: new Date().toISOString(),
    };
    const novos = [novoAcerto, ...acertos];
    setAcertos(novos);
    localStorage.setItem("rotiq_acertos", JSON.stringify(novos));
    toast.success("Acerto registrado com sucesso!");
    setModalOpen(false);
    setForm({ motoristaId: "", viagemId: "", dataAcerto: new Date().toISOString().split("T")[0], freteRecebido: "", adiantamento: "", combustivelPago: "", pedagioPago: "", refeicaoPago: "", outrosDescontos: "", outrosCreditos: "", observacoes: "" });
  };

  const pagarAcerto = (id: number) => {
    const atualizados = acertos.map((a: any) => a.id === id ? { ...a, status: "pago" } : a);
    setAcertos(atualizados);
    localStorage.setItem("rotiq_acertos", JSON.stringify(atualizados));
    toast.success("Acerto marcado como pago!");
  };

  const acertosFiltrados = acertos.filter((a: any) =>
    !busca || a.motoristaNome?.toLowerCase().includes(busca.toLowerCase())
  );

  const totalAPagar = acertos.filter((a: any) => a.status === "a_pagar").reduce((s: number, a: any) => s + a.saldoFinal, 0);
  const totalAReceber = acertos.filter((a: any) => a.status === "a_receber").reduce((s: number, a: any) => s + Math.abs(a.saldoFinal), 0);

  return (
<div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-green-600" />
            Acertos com Motoristas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Fechamento financeiro de viagens</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4" /> Novo Acerto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Acerto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label>Motorista *</Label>
                <Select value={form.motoristaId} onValueChange={(v) => setForm(f => ({ ...f, motoristaId: v, viagemId: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {motoristas.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data do Acerto</Label>
                <Input type="date" value={form.dataAcerto} onChange={e => setForm(f => ({ ...f, dataAcerto: e.target.value }))} />
              </div>
              {viagensMotorista.length > 0 && (
                <div className="space-y-1 col-span-2">
                  <Label>Viagem (opcional)</Label>
                  <Select value={form.viagemId} onValueChange={(v) => {
                    const viagem = viagens.find((vg: any) => String(vg.id) === v);
                    setForm(f => ({
                      ...f,
                      viagemId: v,
                      adiantamento: viagem?.adiantamento ? String(viagem.adiantamento) : f.adiantamento,
                    }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione a viagem" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem viagem específica</SelectItem>
                      {viagensMotorista.map((v: any) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.origem || "?"} → {v.destino || "?"} ({new Date(v.dataSaida || v.createdAt).toLocaleDateString("pt-BR")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="col-span-2 border-t pt-3">
                <p className="text-sm font-medium text-muted-foreground mb-3">RECEITAS</p>
              </div>
              <div className="space-y-1">
                <Label>Frete Recebido (R$) *</Label>
                <Input type="number" placeholder="0,00" value={form.freteRecebido} onChange={e => setForm(f => ({ ...f, freteRecebido: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Outros Créditos (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.outrosCreditos} onChange={e => setForm(f => ({ ...f, outrosCreditos: e.target.value }))} />
              </div>

              <div className="col-span-2 border-t pt-3">
                <p className="text-sm font-medium text-muted-foreground mb-3">DESCONTOS</p>
              </div>
              <div className="space-y-1">
                <Label>Adiantamento (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.adiantamento} onChange={e => setForm(f => ({ ...f, adiantamento: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Combustível Pago (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.combustivelPago} onChange={e => setForm(f => ({ ...f, combustivelPago: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Pedágio Pago (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.pedagioPago} onChange={e => setForm(f => ({ ...f, pedagioPago: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Refeição (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.refeicaoPago} onChange={e => setForm(f => ({ ...f, refeicaoPago: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Outros Descontos (R$)</Label>
                <Input type="number" placeholder="0,00" value={form.outrosDescontos} onChange={e => setForm(f => ({ ...f, outrosDescontos: e.target.value }))} />
              </div>

              {/* Resumo */}
              <div className="col-span-2 p-4 rounded-lg border-2 space-y-2" style={{ borderColor: saldoFinal >= 0 ? "#16a34a" : "#dc2626" }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Receitas</span>
                  <span className="font-medium text-green-600">{fmt(freteRecebido + outrosCred)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Descontos</span>
                  <span className="font-medium text-red-500">- {fmt(totalDescontos)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>{saldoFinal >= 0 ? "A PAGAR ao Motorista" : "A RECEBER do Motorista"}</span>
                  <span style={{ color: saldoFinal >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(Math.abs(saldoFinal))}</span>
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Input placeholder="Observações opcionais" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={salvarAcerto} className="bg-green-600 hover:bg-green-700 text-white">Registrar Acerto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de Acertos</p>
            <p className="text-2xl font-bold mt-1">{acertos.length}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">A Pagar (motoristas)</p>
                <p className="text-xl font-bold mt-1 text-green-600">{fmt(totalAPagar)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200 mt-1" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">A Receber (motoristas)</p>
                <p className="text-xl font-bold mt-1 text-red-600">{fmt(totalAReceber)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-200 mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por motorista..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {acertosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum acerto registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase">
                    <th className="text-left px-4 py-3">Data</th>
                    <th className="text-left px-4 py-3">Motorista</th>
                    <th className="text-left px-4 py-3">Viagem</th>
                    <th className="text-right px-4 py-3">Frete</th>
                    <th className="text-right px-4 py-3">Descontos</th>
                    <th className="text-right px-4 py-3">Saldo Final</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {acertosFiltrados.map((a: any) => (
                    <tr key={a.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3">{new Date(a.dataAcerto).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 font-medium">{a.motoristaNome}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{a.viagemInfo || "—"}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{fmt(a.freteRecebido)}</td>
                      <td className="px-4 py-3 text-right text-red-500">- {fmt(a.totalDescontos)}</td>
                      <td className="px-4 py-3 text-right font-bold" style={{ color: a.saldoFinal >= 0 ? "#16a34a" : "#dc2626" }}>
                        {a.saldoFinal >= 0 ? "" : "- "}{fmt(Math.abs(a.saldoFinal))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={
                          a.status === "pago" ? "bg-green-100 text-green-700 border border-green-300" :
                          a.status === "a_receber" ? "bg-red-100 text-red-700 border border-red-300" :
                          "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        }>
                          {a.status === "pago" ? "Pago" : a.status === "a_receber" ? "A Receber" : "A Pagar"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {a.status !== "pago" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                            onClick={() => pagarAcerto(a.id)}>
                            <CheckCircle className="w-3 h-3" /> Pago
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
);
}
