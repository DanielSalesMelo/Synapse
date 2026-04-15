import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, LogIn, Building2, Key, CheckCircle, AlertCircle } from "lucide-react";

export default function Login() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [empresaValidada, setEmpresaValidada] = useState<{ id: number; nome: string; codigoConvite: string | null } | null>(null);
  const [validandoEmpresa, setValidandoEmpresa] = useState(false);
  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("rotiq-auth-token", data.token);
      }
      utils.auth.me.setData(undefined, data.user);
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
      // Voltar para login após cadastro bem-sucedido
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

  // Validar código de empresa em tempo real
  const validarEmpresa = async () => {
    if (!companyCode.trim()) {
      setEmpresaValidada(null);
      return;
    }
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

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (isLogin) {
      loginMutation.mutate({ email, password });
    } else {
      if (!name) {
        toast.error("Informe seu nome");
        return;
      }
      if (!companyCode.trim()) {
        toast.error("Informe o código da empresa ou convite para se cadastrar");
        return;
      }
      registerMutation.mutate({ email, password, name, companyCode: companyCode.trim() });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-primary mb-4">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Rotiq</h1>
          <p className="text-slate-400 mt-2">Sistema de Gestão de Frota</p>
        </div>

        {/* Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-white">
              {isLogin ? "Entrar" : "Criar Conta"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Faça login para acessar o sistema"
                : "Crie sua conta para acessar o sistema da empresa"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campos apenas para cadastro */}
              {!isLogin && (
                <>
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">
                      Nome de Usuário *
                    </label>
                    <Input
                      type="text"
                      placeholder="Seu nome ou apelido"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Código de Empresa/Convite */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-400" />
                      Código da Empresa ou Convite *
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Ex: ABCD1234 ou ID da empresa"
                        value={companyCode}
                        onChange={(e) => {
                          setCompanyCode(e.target.value);
                          setEmpresaValidada(null);
                        }}
                        onBlur={validarEmpresa}
                        disabled={isLoading}
                        className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 uppercase ${
                          empresaValidada
                            ? "border-green-500 focus-visible:ring-green-500"
                            : companyCode && !validandoEmpresa
                            ? "border-red-500/50"
                            : ""
                        }`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={validarEmpresa}
                        disabled={isLoading || validandoEmpresa || !companyCode.trim()}
                      >
                        {validandoEmpresa ? "..." : "Verificar"}
                      </Button>
                    </div>

                    {/* Feedback de validação */}
                    {empresaValidada && (
                      <div className="flex items-center gap-2 p-2 bg-green-900/30 rounded-lg border border-green-700/50">
                        <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        <div>
                          <p className="text-xs text-green-300 font-medium">Empresa encontrada!</p>
                          <p className="text-xs text-green-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {empresaValidada.nome}
                          </p>
                        </div>
                      </div>
                    )}
                    {companyCode && !empresaValidada && !validandoEmpresa && (
                      <div className="flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg border border-slate-600/50">
                        <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-400">
                          Clique em "Verificar" para validar o código
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-slate-500">
                      Solicite o código ao administrador da empresa. Sem ele, não é possível se cadastrar.
                    </p>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Senha *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                {!isLogin && (
                  <p className="text-xs text-slate-500">Mínimo 6 caracteres</p>
                )}
              </div>

              {/* Aviso de aprovação para cadastro */}
              {!isLogin && (
                <div className="p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
                  <p className="text-xs text-blue-300">
                    <strong>Atenção:</strong> Após o cadastro, sua conta ficará pendente até que o administrador da empresa aprove seu acesso.
                  </p>
                </div>
              )}

              {/* Botão de submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-10"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {isLogin ? "Entrando..." : "Cadastrando..."}
                  </>
                ) : (
                  isLogin ? "Entrar" : "Criar Conta"
                )}
              </Button>

              {/* Alternar entre login e cadastro */}
              <div className="text-center text-sm text-slate-400">
                {isLogin ? "Não tem conta? " : "Já tem conta? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setEmail("");
                    setPassword("");
                    setName("");
                    setCompanyCode("");
                    setEmpresaValidada(null);
                  }}
                  disabled={isLoading}
                  className="text-primary hover:text-primary/90 font-semibold transition-colors"
                >
                  {isLogin ? "Cadastre-se" : "Faça login"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Informação de segurança */}
        <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
          <p className="text-xs text-slate-400 text-center">
            {isLogin
              ? <><span className="font-semibold text-slate-300">Rotiq</span> — Sistema seguro de gestão de frota</>
              : <><span className="font-semibold text-slate-300">Precisa de um código?</span> Entre em contato com o administrador da sua empresa</>
            }
          </p>
        </div>
      </div>
    </div>
  );
}
