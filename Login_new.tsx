
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Lock, LogIn, Zap } from "lucide-react";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const USER_INFO_KEY = "app-user-info";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Login 100% local via localStorage
    localStorage.setItem(AUTH_TOKEN_KEY, "local-master-token");

    localStorage.setItem(USER_INFO_KEY, JSON.stringify({
      id: "admin-local",
      email: "admin@local",
      name: "Daniel Sales",
      role: "MASTER",
      isMasterAdmin: true
    }));

    toast.success("Login realizado com sucesso!");
    
    // Redirecionamento direto
    window.location.href = "/dashboard";
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
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-lg shadow-blue-500/30">
            <Zap className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Synapse</h1>
          <p className="text-white/40 mt-1 text-sm">Gestão Inteligente de Logística</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">
              Bem-vindo de volta
            </h2>
            <p className="text-white/40 text-sm mt-1">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white/70">Senha *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/30" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-blue-500/50 h-11"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Entrar
              </span>
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Synapse — Plataforma segura de gestão de logística
        </p>
      </div>
    </div>
  );
}
