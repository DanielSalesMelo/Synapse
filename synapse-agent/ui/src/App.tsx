import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { 
  Send, 
  MessageSquare, 
  Paperclip, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

export default function App() {
  const [tab, setTab] = useState<'ticket' | 'chat'>('ticket');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Lógica para colar imagem da área de transferência
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setImage(event.target?.result as string);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setLoading(true);
    setStatus(null);

    try {
      const result = await invoke('submit_ticket', {
        payload: {
          title,
          description,
          image_base64: image
        }
      });
      
      setStatus({ type: 'success', message: result as string });
      setTitle('');
      setDescription('');
      setImage(null);
    } catch (err) {
      setStatus({ type: 'error', message: err as string });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      {/* Header */}
      <div className="bg-slate-900 p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <h1 className="font-bold text-lg">Suporte Synapse</h1>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1">
          <button 
            onClick={() => setTab('ticket')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${tab === 'ticket' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chamado
          </button>
          <button 
            onClick={() => setTab('chat')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${tab === 'chat' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Chat
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'ticket' ? (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
            {status && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-green-900/30 border border-green-800 text-green-400' : 'bg-red-900/30 border border-red-800 text-red-400'}`}>
                {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                <p className="text-sm font-medium">{status.message}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Título do Problema</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Impressora não funciona, Erro no sistema..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Descrição Detalhada</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que está acontecendo..."
                rows={5}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-400">Anexo (Cole uma imagem com Ctrl+V)</label>
              {image ? (
                <div className="relative group rounded-lg overflow-hidden border border-slate-800">
                  <img src={image} alt="Preview" className="w-full h-48 object-cover" />
                  <button 
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-slate-500 hover:border-slate-700 transition-colors">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Pressione <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Ctrl+V</kbd> para colar um print</p>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading || !title || !description}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Enviar Chamado
            </button>
          </form>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
            <div className="bg-slate-900 p-6 rounded-full">
              <MessageSquare className="h-12 w-12 opacity-20" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-bold">Chat em Tempo Real</h3>
              <p className="text-sm max-w-xs mx-auto">O chat será ativado assim que um técnico assumir o seu chamado.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-900/50 p-3 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Synapse Agent v0.1.0 • Monitoramento Ativo</p>
      </div>
    </div>
  );
}

function Activity(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
