import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Monitor, Loader2, RefreshCw, Circle } from 'lucide-react';

interface Asset {
  id: number;
  hostname: string;
  osType: string;
  totalMemory: number;
  lastSeen: string | null;
  createdAt: string;
}

const AssetsPage = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const API_URL = 'http://localhost:8080/agent/assets';
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Falha ao carregar ativos');
      }
      const data = await response.json();
      setAssets(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      fetchAssets(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatMemory = (bytes: number) => {
    if (!bytes) return 'N/A';
    return (bytes / 1024 ** 3).toFixed(2) + ' GB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatus = (lastSeen: string | null) => {
    if (!lastSeen) return { label: 'Offline', color: 'text-gray-400', bg: 'bg-gray-100' };
    
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 2) {
      return { label: 'Online', color: 'text-green-500', bg: 'bg-green-50' };
    }
    
    return { label: 'Offline', color: 'text-red-400', bg: 'bg-red-50' };
  };

  return (
    <MainLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Monitor className="w-6 h-6 text-indigo-600" />
              Inventário de Ativos
            </h2>
            <p className="text-gray-500 mt-1">
              Monitoramento em tempo real dos computadores registrados.
            </p>
          </div>
          <button 
            onClick={() => fetchAssets()}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-50"
            title="Atualizar agora"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading && assets.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
              <p>Carregando ativos...</p>
            </div>
          ) : error ? (
            <div className="p-20 text-center">
              <p className="text-red-500 font-medium">{error}</p>
              <button 
                onClick={() => fetchAssets()}
                className="mt-4 text-indigo-600 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-20 text-center text-gray-400">
              <Monitor className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum ativo registrado até o momento.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="px-8 py-4 font-semibold">Status</th>
                  <th className="px-8 py-4 font-semibold">Hostname</th>
                  <th className="px-8 py-4 font-semibold">Sistema Operacional</th>
                  <th className="px-8 py-4 font-semibold">Memória Total</th>
                  <th className="px-8 py-4 font-semibold">Último Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map((asset) => {
                  const status = getStatus(asset.lastSeen);
                  return (
                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color}`}>
                          <Circle className={`w-2 h-2 fill-current`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-8 py-4 font-medium text-gray-900">{asset.hostname}</td>
                      <td className="px-8 py-4 text-gray-600">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {asset.osType || 'Desconhecido'}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-gray-600">{formatMemory(asset.totalMemory)}</td>
                      <td className="px-8 py-4 text-gray-500 text-sm">
                        {asset.lastSeen ? formatDate(asset.lastSeen) : 'Nunca'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AssetsPage;
