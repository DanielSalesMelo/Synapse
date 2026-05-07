import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const RUNTIME_RECOVERY_KEY = "synapse-runtime-recovery-once";

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    const message = String(error?.message || "");
    const shouldAutoRecover =
      message.includes("Loading chunk") ||
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("crown is not defined") ||
      message.includes("Crown is not defined");

    if (!shouldAutoRecover) return;

    try {
      if (sessionStorage.getItem(RUNTIME_RECOVERY_KEY) === "1") return;
      sessionStorage.setItem(RUNTIME_RECOVERY_KEY, "1");
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  private recoverPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = String(this.state.error?.message || "");
      const isChunkLikeError =
        errorMessage.includes("Loading chunk") ||
        errorMessage.includes("Failed to fetch dynamically imported module");

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8 text-center">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl font-semibold mb-3">O Synapse encontrou um problema e vai se recuperar.</h2>
            <p className="mb-5 max-w-xl text-sm text-muted-foreground">
              {isChunkLikeError
                ? "Uma atualização foi publicada enquanto a aplicação estava aberta. Recarregue a página para continuar sem perder sua sessão."
                : "A página encontrou um erro inesperado. Você pode recarregar agora sem sair da sua conta."}
            </p>

            <details className="mb-6 w-full rounded bg-muted p-4 text-left">
              <summary className="cursor-pointer text-sm font-medium">Detalhes técnicos</summary>
              <pre className="mt-3 text-xs text-muted-foreground whitespace-break-spaces">
                {this.state.error?.stack}
              </pre>
            </details>

            <button
              onClick={this.recoverPage}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Recarregar agora
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
