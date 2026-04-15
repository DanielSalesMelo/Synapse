import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Users, Check, X } from "lucide-react";
import { toast } from "sonner";

const modulosSistema = [
  { key: "dashboard", label: "Dashboard" },
  { key: "despachante_entrega", label: "Saída de Entrega" },
  { key: "despachante_viagem", label: "Saída de Viagem" },
  { key: "despachante_retorno", label: "Retorno de Veículo" },
  { key: "abastecimentos", label: "Abastecimentos" },
  { key: "checklist", label: "Checklist" },
  { key: "veiculos", label: "Veículos" },
  { key: "funcionarios", label: "Motoristas/Funcionários" },
  { key: "manutencoes", label: "Manutenções" },
  { key: "plano_manutencao", label: "Plano de Manutenção" },
  { key: "estoque_combustivel", label: "Estoque de Combustível" },
  { key: "multas", label: "Multas" },
  { key: "acidentes", label: "Acidentes" },
  { key: "acertos", label: "Acertos" },
  { key: "relatos", label: "Relatos" },
  { key: "documentos", label: "Documentação da Frota" },
  { key: "alertas", label: "Alertas" },
  { key: "calendario", label: "Calendário" },
  { key: "relatorios", label: "Relatórios" },
  { key: "usuarios", label: "Usuários" },
  { key: "empresa", label: "Empresa" },
  { key: "financeiro", label: "Financeiro" },
  { key: "custos", label: "Custos Operacionais" },
  { key: "simulador", label: "Simulador de Viagem" },
  { key: "painel_master", label: "Painel Master" },
];

const perfisIniciais = [
  {
    id: 1, nome: "Administrador", descricao: "Acesso total ao sistema", cor: "bg-red-100 text-red-700 border-red-300",
    permissoes: Object.fromEntries(modulosSistema.map(m => [m.key, { ver: true, criar: true, editar: true, excluir: true }])),
  },
  {
    id: 2, nome: "Gerente", descricao: "Acesso a operações e relatórios", cor: "bg-blue-100 text-blue-700 border-blue-300",
    permissoes: Object.fromEntries(modulosSistema.filter(m => m.key !== "painel_master").map(m => [m.key, { ver: true, criar: true, editar: true, excluir: false }])),
  },
  {
    id: 3, nome: "Despachante", descricao: "Saídas, retornos e abastecimentos", cor: "bg-green-100 text-green-700 border-green-300",
    permissoes: Object.fromEntries([
      ["dashboard", { ver: true, criar: false, editar: false, excluir: false }],
      ["despachante_entrega", { ver: true, criar: true, editar: true, excluir: false }],
      ["despachante_viagem", { ver: true, criar: true, editar: true, excluir: false }],
      ["despachante_retorno", { ver: true, criar: true, editar: true, excluir: false }],
      ["abastecimentos", { ver: true, criar: true, editar: false, excluir: false }],
      ["checklist", { ver: true, criar: true, editar: false, excluir: false }],
      ["veiculos", { ver: true, criar: false, editar: false, excluir: false }],
      ["funcionarios", { ver: true, criar: false, editar: false, excluir: false }],
    ]),
  },
  {
    id: 4, nome: "Motorista", descricao: "Visualização básica e checklist", cor: "bg-yellow-100 text-yellow-700 border-yellow-300",
    permissoes: Object.fromEntries([
      ["dashboard", { ver: true, criar: false, editar: false, excluir: false }],
      ["checklist", { ver: true, criar: true, editar: false, excluir: false }],
      ["abastecimentos", { ver: true, criar: true, editar: false, excluir: false }],
    ]),
  },
];

type Permissao = { ver: boolean; criar: boolean; editar: boolean; excluir: boolean };

export default function Permissoes() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Guard: somente master_admin pode acessar este módulo
  useEffect(() => {
    if (!loading && user && (user as any).role !== "master_admin") {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) return null;
  if (!user || (user as any).role !== "master_admin") return null;

  const [perfis, setPerfis] = useState<any[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("synapse_perfis") || "null");
      return saved || perfisIniciais;
    } catch { return perfisIniciais; }
  });

  const [perfilSelecionado, setPerfilSelecionado] = useState<number>(1);
  const [modalNovoPerfil, setModalNovoPerfil] = useState(false);
  const [novoPerfilNome, setNovoPerfilNome] = useState("");
  const [novoPerfilDesc, setNovoPerfilDesc] = useState("");

  const perfil = perfis.find(p => p.id === perfilSelecionado);

  const togglePermissao = (modulo: string, tipo: keyof Permissao) => {
    if (!perfil) return;
    // Master Admin tem controle total - sem restrições

    const atualizados = perfis.map(p => {
      if (p.id !== perfilSelecionado) return p;
      const perms = { ...p.permissoes };
      if (!perms[modulo]) perms[modulo] = { ver: false, criar: false, editar: false, excluir: false };
      perms[modulo] = { ...perms[modulo], [tipo]: !perms[modulo][tipo] };
      return { ...p, permissoes: perms };
    });
    setPerfis(atualizados);
    localStorage.setItem("synapse_perfis", JSON.stringify(atualizados));
  };

  const criarPerfil = () => {
    if (!novoPerfilNome) { toast.error("Informe o nome do perfil"); return; }
    const novo = {
      id: Date.now(),
      nome: novoPerfilNome,
      descricao: novoPerfilDesc,
      cor: "bg-gray-100 text-gray-700 border-gray-300",
      permissoes: {},
    };
    const novos = [...perfis, novo];
    setPerfis(novos);
    localStorage.setItem("synapse_perfis", JSON.stringify(novos));
    setPerfilSelecionado(novo.id);
    setModalNovoPerfil(false);
    setNovoPerfilNome("");
    setNovoPerfilDesc("");
    toast.success("Perfil criado!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            Gestão de Permissões
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Configure perfis de acesso e permissões por módulo</p>
        </div>
        <Dialog open={modalNovoPerfil} onOpenChange={setModalNovoPerfil}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Perfil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Perfil de Acesso</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Nome do Perfil *</Label>
                <Input placeholder="Ex: Supervisor" value={novoPerfilNome} onChange={e => setNovoPerfilNome(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input placeholder="Descrição do perfil" value={novoPerfilDesc} onChange={e => setNovoPerfilDesc(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setModalNovoPerfil(false)}>Cancelar</Button>
              <Button onClick={criarPerfil}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de perfis */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Perfis</CardTitle></CardHeader>
          <CardContent className="p-2 space-y-1">
            {perfis.map(p => (
              <button
                key={p.id}
                onClick={() => setPerfilSelecionado(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                  perfilSelecionado === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                }`}
              >
                <span className="font-medium block">{p.nome}</span>
                <span className={`text-xs ${perfilSelecionado === p.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{p.descricao}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Tabela de permissões */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                Permissões: <Badge className={`ml-2 border ${perfil?.cor || ""}`}>{perfil?.nome || ""}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase">
                    <th className="text-left px-4 py-3">Módulo</th>
                    <th className="text-center px-4 py-3 w-20">Ver</th>
                    <th className="text-center px-4 py-3 w-20">Criar</th>
                    <th className="text-center px-4 py-3 w-20">Editar</th>
                    <th className="text-center px-4 py-3 w-20">Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {modulosSistema.map(mod => {
                    const perm = perfil?.permissoes?.[mod.key] || { ver: false, criar: false, editar: false, excluir: false };
                    return (
                      <tr key={mod.key} className="border-b hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium">{mod.label}</td>
                        {(["ver", "criar", "editar", "excluir"] as const).map(tipo => (
                          <td key={tipo} className="text-center px-4 py-2.5">
                            <button
                              onClick={() => togglePermissao(mod.key, tipo)}
                              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                                perm[tipo]
                                  ? "bg-green-100 text-green-600 hover:bg-green-200"
                                  : "bg-muted/30 text-muted-foreground/30 hover:bg-muted/50"
                              }`}
                            >
                              {perm[tipo] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
