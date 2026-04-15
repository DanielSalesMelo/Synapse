import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Truck, CheckCircle, ArrowRight, ArrowLeft,
  Building2, User, Mail, Lock, Phone, MapPin, Eye, EyeOff,
  Star, Shield, Zap, Clock,
} from "lucide-react";

// ─── Benefícios exibidos na lateral ──────────────────────────────────────────
const BENEFICIOS = [
  { icon: <Zap className="w-5 h-5 text-cyan-400" />,    text: "Acesso completo a todos os módulos" },
  { icon: <Shield className="w-5 h-5 text-green-400" />, text: "Sem cartão de crédito necessário" },
  { icon: <Clock className="w-5 h-5 text-purple-400" />, text: "14 dias grátis, cancele quando quiser" },
  { icon: <Star className="w-5 h-5 text-yellow-400" />,  text: "Suporte incluso durante o trial" },
];

// ─── Etapas do formulário ─────────────────────────────────────────────────────
type Etapa = 1 | 2 | 3;

export default function Trial() {
  const [, navigate] = useLocation();
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [sucesso, setSucesso] = useState<{ codigoConvite: string; dataTrialFim: string } | null>(null);

  // Dados do formulário
  const [form, setForm] = useState({
    nomeEmpresa: "",
    cnpj: "",
    cidade: "",
    estado: "",
    nomeUsuario: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const registrarMut = trpc.licenciamento.registrarTrial.useMutation({
    onSuccess: (data) => {
      setSucesso({ codigoConvite: data.codigoConvite, dataTrialFim: data.dataTrialFim });
      setEtapa(3);
    },
    onError: (e) => toast.error(e.message),
  });

  const avancarEtapa1 = () => {
    if (!form.nomeEmpresa.trim()) return toast.error("Informe o nome da empresa");
    setEtapa(2);
  };

  const submeter = () => {
    if (!form.nomeUsuario.trim()) return toast.error("Informe seu nome");
    if (!form.email.trim()) return toast.error("Informe seu e-mail");
    if (!form.senha || form.senha.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres");
    if (form.senha !== form.confirmarSenha) return toast.error("As senhas não coincidem");
    if (!aceite) return toast.error("Você precisa aceitar os termos para continuar");

    registrarMut.mutate({
      nomeEmpresa: form.nomeEmpresa,
      cnpj: form.cnpj || undefined,
      cidade: form.cidade || undefined,
      estado: form.estado || undefined,
      nomeUsuario: form.nomeUsuario,
      email: form.email,
      senha: form.senha,
      telefone: form.telefone || undefined,
      diasTrial: 14,
    });
  };

  const fmtData = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* ── Lateral esquerda (desktop) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-gradient-to-b from-blue-950/60 to-[#0a0a0f] border-r border-white/5 p-10">
        <div>
          {/* Logo */}
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 text-white mb-12 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Synapse</span>
          </button>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              <Star className="w-3.5 h-3.5" /> 14 dias grátis
            </div>
            <h1 className="text-3xl font-extrabold text-white leading-tight mb-3">
              Comece a usar o Synapse hoje mesmo
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              Cadastre sua empresa e tenha acesso imediato a todos os módulos do sistema. Sem cartão de crédito.
            </p>
          </div>

          <div className="space-y-4">
            {BENEFICIOS.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  {b.icon}
                </div>
                <span className="text-sm text-white/70">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Módulos incluídos */}
        <div className="mt-8">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">Módulos incluídos no trial</p>
          <div className="flex flex-wrap gap-1.5">
            {["Viagens", "Carregamento", "NF-e", "Acerto", "Abastecimentos", "Manutenções", "Motoristas", "Checklist", "Financeiro", "Despachante", "Alertas", "Integrações"].map(m => (
              <span key={m} className="text-xs bg-white/5 border border-white/10 text-white/50 px-2 py-1 rounded-lg">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Área principal ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10">
        {/* Header mobile */}
        <div className="lg:hidden flex items-center justify-between w-full max-w-md mb-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Synapse</span>
          </button>
          <span className="text-xs text-white/40 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-medium">14 dias grátis</span>
        </div>

        <div className="w-full max-w-md">
          {/* ── ETAPA 3: SUCESSO ── */}
          {etapa === 3 && sucesso && (
            <div className="text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-green-500/15 border-2 border-green-500/30 flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Conta criada com sucesso!</h2>
                <p className="text-white/50 text-sm">
                  Seu trial de <strong className="text-white">14 dias</strong> está ativo até{" "}
                  <strong className="text-cyan-400">{fmtData(sucesso.dataTrialFim)}</strong>.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left space-y-3">
                <p className="text-xs text-white/40 uppercase tracking-wider">Seu código de convite (para convidar equipe)</p>
                <div className="flex items-center gap-3">
                  <code className="text-xl font-mono font-bold text-cyan-400 tracking-widest">{sucesso.codigoConvite}</code>
                  <button
                    className="text-xs text-white/40 hover:text-white/70 transition-colors border border-white/10 rounded-lg px-2 py-1"
                    onClick={() => { navigator.clipboard.writeText(sucesso.codigoConvite); toast.success("Código copiado!"); }}>
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-white/30">Compartilhe este código com sua equipe para que eles possam criar contas na sua empresa.</p>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 py-6 text-base font-semibold rounded-xl"
                  onClick={() => navigate("/login")}>
                  Fazer login agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-xs text-white/30 text-center">
                  Use o e-mail e senha que você acabou de cadastrar
                </p>
              </div>
            </div>
          )}

          {/* ── ETAPAS 1 e 2 ── */}
          {etapa !== 3 && (
            <>
              {/* Indicador de etapas */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2].map(n => (
                  <div key={n} className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      etapa === n ? "bg-blue-600 text-white" :
                      etapa > n  ? "bg-green-500/20 border border-green-500/40 text-green-400" :
                      "bg-white/5 border border-white/10 text-white/30"
                    }`}>
                      {etapa > n ? <CheckCircle className="w-3.5 h-3.5" /> : n}
                    </div>
                    <span className={`text-xs font-medium ${etapa === n ? "text-white" : "text-white/30"}`}>
                      {n === 1 ? "Empresa" : "Acesso"}
                    </span>
                    {n < 2 && <div className="h-px w-8 bg-white/10 mx-1" />}
                  </div>
                ))}
              </div>

              {/* ── ETAPA 1: DADOS DA EMPRESA ── */}
              {etapa === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Dados da empresa</h2>
                    <p className="text-white/40 text-sm">Informe os dados básicos da sua transportadora ou frota.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 block">Nome da empresa *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input
                          placeholder="Ex: Transportadora Silva Ltda"
                          value={form.nomeEmpresa}
                          onChange={set("nomeEmpresa")}
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl"
                          onKeyDown={e => e.key === "Enter" && avancarEtapa1()}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 block">CNPJ <span className="text-white/30">(opcional)</span></Label>
                      <Input
                        placeholder="00.000.000/0001-00"
                        value={form.cnpj}
                        onChange={set("cnpj")}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Label className="text-white/70 text-sm mb-1.5 block">Cidade <span className="text-white/30">(opcional)</span></Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                          <Input
                            placeholder="São Paulo"
                            value={form.cidade}
                            onChange={set("cidade")}
                            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/70 text-sm mb-1.5 block">UF</Label>
                        <Input
                          placeholder="SP"
                          maxLength={2}
                          value={form.estado}
                          onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl text-center uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 py-6 text-base font-semibold rounded-xl mt-2"
                    onClick={avancarEtapa1}>
                    Continuar
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>

                  <p className="text-center text-xs text-white/30">
                    Já tem conta?{" "}
                    <button className="text-blue-400 hover:text-blue-300 underline" onClick={() => navigate("/login")}>
                      Fazer login
                    </button>
                  </p>
                </div>
              )}

              {/* ── ETAPA 2: DADOS DE ACESSO ── */}
              {etapa === 2 && (
                <div className="space-y-5">
                  <div>
                    <button onClick={() => setEtapa(1)} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
                      <ArrowLeft className="h-4 w-4" /> Voltar
                    </button>
                    <h2 className="text-2xl font-bold text-white mb-1">Criar seu acesso</h2>
                    <p className="text-white/40 text-sm">Você será o administrador da empresa <strong className="text-white/70">{form.nomeEmpresa}</strong>.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 block">Seu nome *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input
                          placeholder="João Silva"
                          value={form.nomeUsuario}
                          onChange={set("nomeUsuario")}
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 block">E-mail *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input
                          type="email"
                          placeholder="joao@empresa.com.br"
                          value={form.email}
                          onChange={set("email")}
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 block">Telefone <span className="text-white/30">(opcional)</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input
                          placeholder="(11) 99999-9999"
                          value={form.telefone}
                          onChange={set("telefone")}
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 block">Senha *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input
                          type={mostrarSenha ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={form.senha}
                          onChange={set("senha")}
                          className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                          onClick={() => setMostrarSenha(v => !v)}>
                          {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 block">Confirmar senha *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input
                          type="password"
                          placeholder="Repita a senha"
                          value={form.confirmarSenha}
                          onChange={set("confirmarSenha")}
                          className={`pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 h-11 rounded-xl ${
                            form.confirmarSenha && form.confirmarSenha !== form.senha ? "border-red-500/50" : ""
                          }`}
                        />
                      </div>
                      {form.confirmarSenha && form.confirmarSenha !== form.senha && (
                        <p className="text-red-400 text-xs mt-1">As senhas não coincidem</p>
                      )}
                    </div>
                  </div>

                  {/* Aceite de termos */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                        aceite ? "bg-blue-600 border-blue-600" : "border-white/20 bg-white/5 group-hover:border-white/40"
                      }`}
                      onClick={() => setAceite(v => !v)}>
                      {aceite && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span className="text-xs text-white/40 leading-relaxed">
                      Concordo com os{" "}
                      <span className="text-blue-400 underline cursor-pointer">Termos de Uso</span>{" "}
                      e{" "}
                      <span className="text-blue-400 underline cursor-pointer">Política de Privacidade</span>{" "}
                      do Synapse. Entendo que o trial é gratuito por 14 dias.
                    </span>
                  </label>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 py-6 text-base font-semibold rounded-xl"
                    onClick={submeter}
                    disabled={registrarMut.isPending}>
                    {registrarMut.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Criando sua conta...
                      </span>
                    ) : (
                      <>
                        Criar conta grátis
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-center text-xs text-white/30">
                    Já tem conta?{" "}
                    <button className="text-blue-400 hover:text-blue-300 underline" onClick={() => navigate("/login")}>
                      Fazer login
                    </button>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
