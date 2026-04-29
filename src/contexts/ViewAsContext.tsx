
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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

  const isSimulating = viewAs.mode === "admin";
  
  // Se for emergencial ou local, tenta pegar do localStorage ou usa 1
  const getEmpresaId = () => {
    try {
      const raw = localStorage.getItem("app-user-info");
      if (raw) return JSON.parse(raw).empresaId ?? 1;
    } catch {}
    return 1;
  };

  const userEmpresaId = getEmpresaId();
  
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
