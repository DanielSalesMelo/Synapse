import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Building2, Users, Truck, MapPin, Phone, Mail, FileText, Shield, Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Empresa() {
  const { t } = useTranslation();
  const { data: stats } = trpc.dashboard.resumo.useQuery({ empresaId: 1 });
  const [editMode, setEditMode] = useState(false);
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    nome: "BSB Transportes",
    cnpj: "",
    endereco: "",
    cidade: "",
    estado: "DF",
    telefone: "",
    email: "",
    responsavel: "",
  });

  function handleSave() {
    toast.success("Configurações salvas com sucesso!");
    setEditMode(false);
  }

  return (
<div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Empresa
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configurações e informações da empresa
            </p>
          </div>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditMode(true)}>Editar Informações</Button>
            )}
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.veiculos?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Veículos Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.funcionarios?.motoristas ?? 0}</p>
                <p className="text-xs text-muted-foreground">Motoristas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats?.viagens?.emAndamento ?? 0}</p>
                <p className="text-xs text-muted-foreground">Viagens Ativas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  <Badge variant="outline" className="text-green-500 border-green-500">Ativo</Badge>
                </p>
                <p className="text-xs text-muted-foreground">Status do Plano</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações da empresa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Dados Cadastrais
              </CardTitle>
              <CardDescription>Informações legais e de registro</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Razão Social / Nome</Label>
                {editMode ? (
                  <Input
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome da empresa"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.nome || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                {editMode ? (
                  <Input
                    value={form.cnpj}
                    onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.cnpj || "Não informado"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                {editMode ? (
                  <Input
                    value={form.responsavel}
                    onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                    placeholder="Nome do responsável"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.responsavel || "Não informado"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Contato e Localização
              </CardTitle>
              <CardDescription>Endereço e formas de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Endereço</Label>
                {editMode ? (
                  <Input
                    value={form.endereco}
                    onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                    placeholder="Rua, número, bairro"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.endereco || "Não informado"}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  {editMode ? (
                    <Input
                      value={form.cidade}
                      onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                      placeholder="Cidade"
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.cidade || "—"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  {editMode ? (
                    <Input
                      value={form.estado}
                      onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                      placeholder="UF"
                      maxLength={2}
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.estado || "—"}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
                {editMode ? (
                  <Input
                    value={form.telefone}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    placeholder="(61) 99999-0000"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.telefone || "Não informado"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</Label>
                {editMode ? (
                  <Input
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contato@empresa.com.br"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground bg-muted/30 px-3 py-2 rounded-md">{form.email || "Não informado"}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Módulo de permissões — placeholder */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Gerenciamento de Acesso
            </CardTitle>
            <CardDescription>
              Controle quem pode acessar o sistema e com quais permissões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Gerenciamento de Usuários</p>
              <p className="text-xs text-muted-foreground mb-4">
                Defina níveis de acesso para cada membro da equipe: Operador, Despachante, Monitor ou Admin.
              </p>
              <Button variant="outline" onClick={() => navigate("/usuarios")}>
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Usuários
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plano e auditoria */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Segurança e Auditoria</CardTitle>
            <CardDescription>Proteção de dados e rastreabilidade de ações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Soft Delete ativo</p>
                <p className="text-xs text-muted-foreground">Nenhum dado é deletado permanentemente sem aprovação do Admin</p>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Log de Auditoria</p>
                <p className="text-xs text-muted-foreground">Todas as ações são registradas com usuário, data e IP</p>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Backup automático</p>
                <p className="text-xs text-muted-foreground">Dados replicados automaticamente na nuvem</p>
              </div>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Ativo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
);
}
