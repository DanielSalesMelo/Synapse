import React, { useEffect, useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import type { LatLng } from '../../hooks/useGoogleMaps';

interface MapDisplayProps {
  center?: LatLng;
  zoom?: number;
  markers?: Array<{ position: LatLng; title: string }>;
  width?: string;
  height?: string;
  className?: string;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  center = { lat: -23.5505, lng: -46.6333 }, // São Paulo
  zoom = 13,
  markers = [],
  width = '100%',
  height = '400px',
  className = '',
}) => {
  const [mapUrl, setMapUrl] = useState<string>('');

  useEffect(() => {
    // Construir URL do mapa estático do Google Maps
    const params = new URLSearchParams();
    params.append('center', `${center.lat},${center.lng}`);
    params.append('zoom', String(zoom));
    params.append('size', '600x400');
    params.append('maptype', 'roadmap');

    // Adicionar marcadores
    markers.forEach((marker) => {
      params.append('markers', `${marker.position.lat},${marker.position.lng}`);
    });

    // Nota: A URL real será construída pelo backend
    // Por enquanto, usamos um placeholder que será substituído
    setMapUrl(`/api/maps/staticmap?${params.toString()}`);
  }, [center, zoom, markers]);

  return (
    <div className={`rounded-lg overflow-hidden shadow-md ${className}`} style={{ width, height }}>
      {mapUrl ? (
        <img
          src={mapUrl}
          alt="Mapa"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Erro ao carregar mapa</p>
              </div>
            </div>
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Carregando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;
