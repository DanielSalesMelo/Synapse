import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri_apps/api/tauri';
import './App.css';

interface TicketPayload {
  assetId: string;
  description: string;
  screenshots: string[];
}

function App() {
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [status, setStatus] = useState('Conectado');
  const [hostname, setHostname] = useState('Carregando...');
  const [assetId, setAssetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // No mundo real, buscaríamos essas informações do backend Tauri
    // Para este protótipo, vamos simular ou buscar via invoke se implementado
    setHostname(window.location.hostname || 'Desktop-Client');
    // Simulando um assetId que viria da configuração do agente
    setAssetId('1'); 
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setScreenshots((prev) => [...prev, base64]);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    setIsSubmitting(true);
    setMessage('');

    try {
      const payload: TicketPayload = {
        assetId,
        description,
        screenshots,
      };

      const result = await invoke<string>('submit_ticket', { payload });
      setMessage(result);
      setDescription('');
      setScreenshots([]);
    } catch (error) {
      setMessage(`Erro: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="container">
      <header>
        <div className="status-bar">
          <span className={`status-indicator ${status === 'Conectado' ? 'online' : 'offline'}`}></span>
          {status} | {hostname}
        </div>
        <h1>Synapse Agent</h1>
      </header>

      <main>
        <section className="support-section">
          <h2>Precisa de Ajuda?</h2>
          <p>Descreva seu problema abaixo e anexe capturas de tela se necessário.</p>
          
          <form onSubmit={handleSubmit}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={handlePaste}
              placeholder="Descreva o problema aqui... (Dica: Você pode colar imagens com Ctrl+V)"
              required
              rows={5}
            />

            <div className="screenshots-preview">
              {screenshots.map((src, index) => (
                <div key={index} className="screenshot-item">
                  <img src={src} alt={`Anexo ${index + 1}`} />
                  <button type="button" onClick={() => removeScreenshot(index)} className="remove-btn">×</button>
                </div>
              ))}
            </div>

            <button type="submit" disabled={isSubmitting || !description} className="submit-btn">
              {isSubmitting ? 'Enviando...' : 'Abrir um Chamado'}
            </button>
          </form>

          {message && <div className={`message ${message.includes('Erro') ? 'error' : 'success'}`}>{message}</div>}
        </section>
      </main>
    </div>
  );
}

export default App;
