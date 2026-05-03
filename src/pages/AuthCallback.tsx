import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const AUTH_TOKEN_KEY = "synapse-auth-token";
const AUTH_AT_KEY = "synapse-auth-at";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("social_error");

    if (error) {
      toast.error("Falha no login social. Tente novamente.");
      navigate("/login");
      return;
    }

    if (!token) {
      toast.error("Token de autenticação não encontrado.");
      navigate("/login");
      return;
    }

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_AT_KEY, String(Date.now()));
    toast.success("Login com Google realizado com sucesso!");
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-white/80 text-sm">Conectando sua conta...</div>
    </div>
  );
}

