import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type ViewAsMode = "master" | "admin";

export interface ViewAsState {
  mode: ViewAsMode;
  empresaId: number | null;
  empresaNome: string | null;
}

interface ViewAsContextType {
  viewAs: ViewAsState;
  enterAdminView: (empresaId: number, empresaNome: string) => void;
  exitAdminView: () => void;
  isSimulating: boolean;
  /** empresaId efetivo para queries — usa o simulado se estiver simulando */
  effectiveEmpresaId: number;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAs: { mode: "master", empresaId: null, empresaNome: null },
  enterAdminView: () => {},
  exitAdminView: () => {},
  isSimulating: false,
  effectiveEmpresaId: 1,
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAs] = useState<ViewAsState>({
    mode: "master",
    empresaId: null,
    empresaNome: null,
  });

  const enterAdminView = useCallback((empresaId: number, empresaNome: string) => {
    setViewAs({ mode: "admin", empresaId, empresaNome });
  }, []);

  const exitAdminView = useCallback(() => {
    setViewAs({ mode: "master", empresaId: null, empresaNome: null });
  }, []);

  // Pega o empresaId real do usuário logado
  const { data: me } = trpc.auth.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isSimulating = viewAs.mode === "admin";
  // Usa o empresaId do usuário logado como padrão (não hardcoded 1)
  const userEmpresaId = (me as any)?.empresaId ?? 1;
  const effectiveEmpresaId = isSimulating
    ? (viewAs.empresaId ?? userEmpresaId)
    : userEmpresaId;

  return (
    <ViewAsContext.Provider value={{ viewAs, enterAdminView, exitAdminView, isSimulating, effectiveEmpresaId }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
