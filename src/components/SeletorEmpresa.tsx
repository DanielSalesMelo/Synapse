import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type AccessibleCompany = {
  empresaId: number;
  empresaNome?: string | null;
  roleCode?: string;
  canViewGroup?: boolean;
  isDefault?: boolean;
};

export function SeletorEmpresa() {
  const { user, refresh } = useAuth();
  const utils = trpc.useUtils();
  const setEmpresaAtiva = trpc.grupos.setEmpresaAtiva.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      await refresh();
      toast.success("Empresa ativa alterada com sucesso.");
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível trocar a empresa ativa.");
    },
  });

  const empresas = useMemo(() => {
    const list = ((user as any)?.accessibleCompanies ?? []) as AccessibleCompany[];
    return [...list].sort((a, b) => {
      if (a.empresaId === (user as any)?.empresaId) return -1;
      if (b.empresaId === (user as any)?.empresaId) return 1;
      return (a.empresaNome || "").localeCompare(b.empresaNome || "");
    });
  }, [user]);

  if (empresas.length <= 1) {
    return null;
  }

  const empresaAtual = empresas.find(item => item.empresaId === (user as any)?.empresaId) ?? empresas[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
          <Building2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline max-w-[160px] truncate">
            {empresaAtual?.empresaNome || "Selecionar empresa"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
          Empresas autorizadas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {empresas.map((empresa) => {
          const isActive = empresa.empresaId === (user as any)?.empresaId;
          return (
            <DropdownMenuItem
              key={empresa.empresaId}
              onClick={() => setEmpresaAtiva.mutate({ empresaId: empresa.empresaId })}
              disabled={isActive || setEmpresaAtiva.isPending}
              className={`cursor-pointer ${isActive ? "bg-blue-500/10 text-blue-400" : ""}`}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={`w-2 h-2 rounded-full ${isActive ? "bg-blue-400" : "bg-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{empresa.empresaNome || `Empresa ${empresa.empresaId}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {(empresa.roleCode || "acesso").replaceAll("_", " ")}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
