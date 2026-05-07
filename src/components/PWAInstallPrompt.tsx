import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (window.navigator as any).standalone === true
  );
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (hidden || isStandalone()) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    if (isIos()) {
      setShowIosHelp(true);
      return;
    }
    setHidden(true);
  };

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
        <Smartphone className="h-4 w-4" />
        Instale o App Synapse no celular
      </div>
      <p className="text-xs text-blue-100/90">
        Abra chamados TI, chat, operação e demandas sem precisar abrir navegador toda hora.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleInstall} className="h-8 text-xs">
          <Download className="h-3.5 w-3.5 mr-1" />
          Instalar App
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs border-blue-300/30 text-blue-100" onClick={() => setHidden(true)}>
          Agora não
        </Button>
      </div>
      {showIosHelp && (
        <p className="text-[11px] text-blue-100/95">
          iPhone: Safari → Compartilhar → Adicionar à Tela de Início.
        </p>
      )}
    </div>
  );
}

