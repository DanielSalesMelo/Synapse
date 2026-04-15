import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function SeletorEmpresa() {
  const { user } = useAuth();
  const [empresaAtiva, setEmpresaAtiva] = useState<number | null>(null);
  const [hierarquia, setHierarquia] = useState<any>(null);

  // Buscar hierarquia de empresas
  const { data: hier } = trpc.grupos.getHierarquia.useQuery(
    { empresaId: user?.empresaId || 1 },
    { enabled: !!user?.empresaId }
  );

  useEffect(() => {
    if (hier) {
      setHierarquia(hier);
      setEmpresaAtiva(hier.atual?.id || user?.empresaId);
    }
  }, [hier, user?.empresaId]);

  const handleChangeEmpresa = (id: number) => {
    setEmpresaAtiva(id);
    // Aqui você poderia fazer um reload da página ou atualizar o contexto
    // Por enquanto, apenas muda localmente
    toast.success("Empresa alterada. Recarregando dados...");
    window.location.reload();
  };

  if (!hierarquia) return null;

  // Se não há filiais, não mostra o seletor
  if (!hierarquia.filiais || hierarquia.filiais.length === 0) {
    return null;
  }

  const todasEmpresas = [
    hierarquia.matriz,
    ...hierarquia.filiais,
  ].filter(Boolean);

  const empresaAtualNome = todasEmpresas.find((e: any) => e.id === empresaAtiva)?.nome;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8 text-xs"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline max-w-[120px] truncate">{empresaAtualNome}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
          Grupo de Empresas
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Matriz */}
        <DropdownMenuItem
          onClick={() => handleChangeEmpresa(hierarquia.matriz.id)}
          className={`cursor-pointer ${empresaAtiva === hierarquia.matriz.id ? "bg-blue-500/10 text-blue-400" : ""}`}
        >
          <div className="flex items-center gap-2 w-full">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{hierarquia.matriz.nome}</div>
              <div className="text-xs text-muted-foreground">Matriz</div>
            </div>
            {empresaAtiva === hierarquia.matriz.id && (
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            )}
          </div>
        </DropdownMenuItem>

        {/* Filiais */}
        {hierarquia.filiais && hierarquia.filiais.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {hierarquia.filiais.map((filial: any) => (
              <DropdownMenuItem
                key={filial.id}
                onClick={() => handleChangeEmpresa(filial.id)}
                className={`cursor-pointer ${empresaAtiva === filial.id ? "bg-purple-500/10 text-purple-400" : ""}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{filial.nome}</div>
                    <div className="text-xs text-muted-foreground">Filial</div>
                  </div>
                  {empresaAtiva === filial.id && (
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
