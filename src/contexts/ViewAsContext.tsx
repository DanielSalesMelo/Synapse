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

const DEFAULT_EMPRESA_ID = 1;

const ViewAsContext = createContext<ViewAsContextType>({
  viewAs: { mode: "master", empresaId: null, empresaNome: null },
  enterAdminView: () => {},
  exitAdminView: () => {},
  isSimulating: false,
  effectiveEmpresaId: DEFAULT_EMPRESA_ID,
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
  const effectiveEmpresaId = isSimulating ? (viewAs.empresaId ?? DEFAULT_EMPRESA_ID) : DEFAULT_EMPRESA_ID;

  return (
    <ViewAsContext.Provider value={{ viewAs, enterAdminView, exitAdminView, isSimulating, effectiveEmpresaId }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
