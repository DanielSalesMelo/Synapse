import React, { useState, useCallback } from 'react';
import { Search, MapPin, Star, Phone, Globe, Loader2 } from 'lucide-react';
import { useGoogleMaps, type PlaceDetails } from '../../hooks/useGoogleMaps';

interface PlaceSearchProps {
  onPlaceSelected?: (place: PlaceDetails) => void;
  onLocationSelected?: (lat: number, lng: number) => void;
}

const PlaceSearch: React.FC<PlaceSearchProps> = ({ onPlaceSelected, onLocationSelected }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceDetails[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const { searchPlaces, getPlaceDetails, loading, error } = useGoogleMaps();

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const places = await searchPlaces(query);
    setResults(places);
  }, [query, searchPlaces]);

  const handlePlaceClick = useCallback(async (place: PlaceDetails) => {
    setSelectedPlace(place);
    onPlaceSelected?.(place);
  }, [onPlaceSelected]);

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar locais, endereços, empresas..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Buscar
        </button>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {selectedPlace && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">{selectedPlace.name}</h3>
          <div className="space-y-1 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-600" />
              <span>{selectedPlace.formatted_address}</span>
            </div>
            {selectedPlace.rating && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                <span>{selectedPlace.rating.toFixed(1)} ⭐</span>
              </div>
            )}
            {selectedPlace.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>{selectedPlace.phone}</span>
              </div>
            )}
            {selectedPlace.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <a href={selectedPlace.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                  Visitar site
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Resultados ({results.length})</h3>
          <div className="grid gap-2 max-h-96 overflow-y-auto">
            {results.map((place, index) => (
              <button
                key={index}
                onClick={() => handlePlaceClick(place)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedPlace?.name === place.name
                    ? 'bg-indigo-100 border border-indigo-300'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-gray-900">{place.name}</div>
                <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {place.formatted_address}
                </div>
                {place.rating && (
                  <div className="text-sm text-yellow-600 mt-1">
                    ⭐ {place.rating.toFixed(1)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceSearch;
