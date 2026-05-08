
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getBackendBaseUrl } from "@/lib/backend";
import { Mail, Lock, LogIn, Building2, Key, CheckCircle, AlertCircle, Zap, Eye, EyeOff, RefreshCcw } from "lucide-react";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";
const AUTH_AT_KEY = "synapse-auth-at";
const SOCIAL_PROVIDER_KEY = "synapse-social-provider";

export default function Login() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [empresaValidada, setEmpresaValidada] = useState<{ id: number; nome: string; codigoConvite: string | null } | null>(null);
  const [validandoEmpresa, setValidandoEmpresa] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const socialError = params.get("social_error");
    const socialProvider =
      params.get("social_provider") ||
      sessionStorage.getItem(SOCIAL_PROVIDER_KEY) ||
      "google";
    if (!socialError) return;
    const providerLabel =
      socialProvider === "microsoft"
        ? "Microsoft"
        : socialProvider === "apple"
          ? "Apple"
          : "Google";
    toast.error(`Não foi possível entrar com ${providerLabel} no momento.`);
    sessionStorage.removeItem(SOCIAL_PROVIDER_KEY);
    params.delete("social_error");
    params.delete("social_provider");
    const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", cleaned);
  }, []);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(AUTH_AT_KEY, String(Date.now()));
      }
      if (data.user) {
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
        utils.auth.me.setData(undefined, data.user);
      }
      toast.success("Login realizado com sucesso!");
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Cadastro realizado! Aguarde a aprovação do administrador.");
      setIsLogin(true);
      setEmail("");
      setPassword("");
      setName("");
      setCompanyCode("");
      setEmpresaValidada(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar");
    },
  });

  const validarEmpresa = async () => {
    if (!companyCode.trim()) { setEmpresaValidada(null); return; }
    setValidandoEmpresa(true);
    try {
      const result = await utils.empresas.validarConvite.fetch({ codigo: companyCode.trim() });
      if (result.valido && result.empresa) {
        setEmpresaValidada(result.empresa as any);
      } else {
        setEmpresaValidada(null);
      }
    } catch {
      setEmpresaValidada(null);
    } finally {
      setValidandoEmpresa(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }
    if (isLogin) {
      loginMutation.mutate({ email, password });
    } else {
      if (!name) { toast.error("Informe seu nome"); return; }
      if (!companyCode.trim()) { toast.error("Informe o código da empresa"); return; }
      registerMutation.mutate({ email, password, name, companyCode: companyCode.trim() });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const handleSocialLogin = (provider: "google" | "microsoft" | "apple") => {
    sessionStorage.setItem(SOCIAL_PROVIDER_KEY, provider);
    const params = new URLSearchParams({ provider, force_account: "1" });
    window.location.href = `${getBackendBaseUrl()}/api/auth/auth0/start?${params.toString()}`;
  };

  const limparSessaoAntiga = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    localStorage.removeItem("manus-runtime-user-info");
    localStorage.removeItem("synapse-user");
    toast.success("Sessão antiga removida. Tente entrar novamente.");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block group" aria-label="Voltar para a página inicial">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-105">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight group-hover:text-blue-300 transition-colors">Synapse</h1>
            <p className="text-white/40 mt-1 text-sm group-hover:text-white/60 transition-colors">Plataforma de operações inteligentes</p>
          </a>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              {isLogin ? "Bem-vindo de volta" : "Criar sua conta"}
            </h2>
            <p className="text-white/40 text-sm mt-1">
              {isLogin ? "Acesse sua conta para continuar" : "Preencha os dados para se cadastrar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">Nome de Usuário *</label>
                  <Input
                    type="text"
                    placeholder="Seu nome ou apelido"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 focus:ring-blue-500/20 h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Código da Empresa *
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ex: ABCD1234"
                      value={companyCode}
                      onChange={(e) => { setCompanyCode(e.target.value); setEmpresaValidada(null); }}
                      onBlur={validarEmpresa}
                      disabled={isLoading}
                      className={`bg-white/5 border-white/10 text-white placeholder:text-white/25 uppercase h-11 ${
                        empresaValidada ? "border-green-500/50" : companyCode && !validandoEmpresa ? "border-red-500/30" : ""
                      }`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-white/10 text-white/60 hover:bg-white/10 h-11 px-4"
                      onClick={validarEmpresa}
                      disabled={isLoading || validandoEmpresa || !companyCode.trim()}
                    >
                      {validandoEmpresa ? "..." : "Verificar"}
                    </Button>
                  </div>
                  {empresaValidada && (
                    <div className="flex items-center gap-2 p-2.5 bg-green-500/10 rounded-lg border border-green-500/20">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      <div>
                        <p className="text-xs text-green-300 font-medium">Empresa encontrada!</p>
                        <p className="text-xs text-green-400/70 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{empresaValidada.nome}
                        </p>
                      </div>
                    </div>
                  )}
                  {companyCode && !empresaValidada && !validandoEmpresa && (
                    <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg border border-white/10">
                      <AlertCircle className="w-4 h-4 text-white/30 shrink-0" />
                      <p className="text-xs text-white/30">Clique em "Verificar" para validar o código</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Senha *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 pr-11 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-3 text-white/40 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!isLogin && <p className="text-xs text-white/30">Mínimo 6 caracteres</p>}
            </div>

            {!isLogin && (
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-xs text-blue-300/80">
                  <strong className="text-blue-300">Atenção:</strong> Após o cadastro, sua conta ficará pendente até aprovação do administrador.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? "Entrando..." : "Cadastrando..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {isLogin ? "Entrar" : "Criar Conta"}
                </span>
              )}
            </Button>

            {isLogin && (
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  onClick={() => handleSocialLogin("google")}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-white/15 text-white hover:bg-white/10 h-11 rounded-xl"
                >
                  Entrar com Google
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSocialLogin("microsoft")}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-white/15 text-white hover:bg-white/10 h-11 rounded-xl"
                >
                  Entrar com Microsoft
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSocialLogin("apple")}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-white/15 text-white hover:bg-white/10 h-11 rounded-xl"
                >
                  Entrar com Apple
                </Button>
              </div>
            )}

            <div className="text-center text-sm text-white/30">
              {isLogin ? "Não tem conta? " : "Já tem conta? "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail(""); setPassword(""); setName(""); setCompanyCode(""); setEmpresaValidada(null);
                }}
                disabled={isLoading}
                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                {isLogin ? "Cadastre-se" : "Faça login"}
              </button>
            </div>

            {isLogin && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={limparSessaoAntiga}
                  className="inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Limpar sessão antiga
                </button>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Synapse — Plataforma segura de suporte, TI e operações inteligentes
        </p>
      </div>
    </div>
  );
}
