import React, { useState } from 'react';
import { useGoogleMaps, type LatLng } from '../hooks/useGoogleMaps';
import MapDisplay from '../components/maps/MapDisplay';
import PlaceSearch from '../components/maps/PlaceSearch';
import MainLayout from '../components/layout/MainLayout';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';

const MapsExamplePage: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<LatLng>({ lat: -23.5505, lng: -46.6333 });
  const [directions, setDirections] = useState<any>(null);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const { getDirections, loading, error } = useGoogleMaps();

  const handleGetDirections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    const result = await getDirections(origin, destination, 'driving');
    setDirections(result);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Integração Google Maps</h1>
          <p className="text-gray-600">Exemplos de uso das integrações com Google Maps e Places API</p>
        </div>

        {/* Erro Global */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Erro</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Grid de Conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seção 1: Busca de Locais */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Buscar Locais</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Procure por empresas, endereços e pontos de interesse usando a API do Google Places.
            </p>
            <PlaceSearch
              onPlaceSelected={(place) => {
                console.log('Local selecionado:', place);
              }}
            />
          </div>

          {/* Seção 2: Mapa */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Visualizar Mapa</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Visualização do mapa com marcadores da localização selecionada.
            </p>
            <MapDisplay
              center={selectedLocation}
              zoom={15}
              markers={[
                {
                  position: selectedLocation,
                  title: 'Localização Selecionada',
                },
              ]}
              height="300px"
            />
          </div>
        </div>

        {/* Seção 3: Rotas e Direções */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">Calcular Rotas</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Obtenha direções e informações de distância/duração entre dois locais.
          </p>

          <form onSubmit={handleGetDirections} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origem
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Ex: Av. Paulista, São Paulo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destino
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex: Pça. da Sé, São Paulo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors font-medium"
            >
              {loading ? 'Calculando...' : 'Calcular Rota'}
            </button>
          </form>

          {directions && (
            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Resultado da Rota</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Distância</p>
                  <p className="text-lg font-semibold text-indigo-600">{directions.distance}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duração</p>
                  <p className="text-lg font-semibold text-indigo-600">{directions.duration}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações de Integração */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">📚 Como Usar as Integrações</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              <strong>useGoogleMaps():</strong> Hook customizado para acessar todas as funcionalidades do Google Maps
            </li>
            <li>
              <strong>MapDisplay:</strong> Componente para visualizar mapas estáticos com marcadores
            </li>
            <li>
              <strong>PlaceSearch:</strong> Componente de busca de locais com resultados em tempo real
            </li>
            <li>
              <strong>Funcionalidades:</strong> Geocoding, reverse geocoding, direções, busca de locais, detalhes de lugares
            </li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
};

export default MapsExamplePage;
