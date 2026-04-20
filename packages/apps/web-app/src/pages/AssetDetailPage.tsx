import React, { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import MainLayout from '../components/layout/MainLayout';
import { 
  Monitor, 
  Cpu, 
  HardDrive, 
  Network, 
  Info, 
  ArrowLeft, 
  Loader2,
  Calendar,
  Hash,
  Activity
} from 'lucide-react';

interface Asset {
  id: number;
  hostname: string;
  osType: string;
  totalMemory: number;
  cpuModel: string | null;
  cpuCores: number | null;
  totalDiskSpace: string | null;
  diskModel: string | null;
  motherboardModel: string | null;
  serialNumber: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  lastSeen: string | null;
  createdAt: string;
}

const AssetDetailPage = () => {
  const [, params] = useRoute('/dashboard/assets/:id');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const API_URL = `http://localhost:8080/agent/assets/${params?.id}`;
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Ativo não encontrado');
        const data = await response.json();
        setAsset(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) fetchAsset();
  }, [params?.id]);

  const formatBytes = (bytes: string | number | null) => {
    if (!bytes) return 'N/A';
    const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    return (b / 1024 ** 3).toFixed(2) + ' GB';
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error || !asset) {
    return (
      <MainLayout>
        <div className="text-center p-20">
          <p className="text-red-500 text-xl font-semibold">{error || 'Ativo não encontrado'}</p>
          <Link href="/dashboard/assets" className="mt-4 inline-flex items-center text-indigo-600 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para lista
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/assets" className="inline-flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> Voltar para Inventário
          </Link>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              asset.lastSeen && (new Date().getTime() - new Date(asset.lastSeen).getTime()) / 60000 < 2
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
            }`}>
              {asset.lastSeen && (new Date().getTime() - new Date(asset.lastSeen).getTime()) / 60000 < 2 ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-indigo-50 rounded-2xl">
              <Monitor className="w-10 h-10 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{asset.hostname}</h1>
              <p className="text-gray-500 flex items-center gap-2 mt-1">
                <Hash className="w-4 h-4" /> ID: {asset.id} • {asset.osType}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informações Gerais */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" /> Informações Gerais
            </h3>
            <div className="space-y-4">
              <DetailItem label="Sistema Operacional" value={asset.osType} />
              <DetailItem label="Número de Série" value={asset.serialNumber} />
              <DetailItem label="Placa-Mãe" value={asset.motherboardModel} />
              <DetailItem label="Registrado em" value={new Date(asset.createdAt).toLocaleString('pt-BR')} />
              <DetailItem label="Último Contato" value={asset.lastSeen ? new Date(asset.lastSeen).toLocaleString('pt-BR') : 'Nunca'} />
            </div>
          </section>

          {/* Hardware */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-500" /> Hardware
            </h3>
            <div className="space-y-4">
              <DetailItem label="Processador" value={asset.cpuModel} />
              <DetailItem label="Núcleos CPU" value={asset.cpuCores?.toString()} />
              <DetailItem label="Memória RAM" value={formatBytes(asset.totalMemory)} />
              <DetailItem label="Modelo do Disco" value={asset.diskModel} />
              <DetailItem label="Espaço Total em Disco" value={formatBytes(asset.totalDiskSpace)} />
            </div>
          </section>

          {/* Rede */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-green-500" /> Rede
            </h3>
            <div className="space-y-4">
              <DetailItem label="Endereço IP" value={asset.ipAddress} />
              <DetailItem label="Endereço MAC" value={asset.macAddress} />
            </div>
          </section>

          {/* Atividade */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" /> Atividade
            </h3>
            <div className="flex items-center justify-center h-32 text-gray-400 italic">
              Gráficos de performance em tempo real serão implementados em breve.
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

const DetailItem = ({ label, value }: { label: string, value: string | null | undefined }) => (
  <div className="flex justify-between border-b border-gray-50 pb-2">
    <span className="text-gray-500 text-sm">{label}</span>
    <span className="text-gray-900 font-medium text-sm">{value || 'N/A'}</span>
  </div>
);

export default AssetDetailPage;
