import { useState, useCallback } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  formatted_address: string;
  location: LatLng;
  place_id: string;
}

export interface DirectionsResult {
  distance: string;
  duration: string;
  polyline: string;
}

export interface PlaceDetails {
  name: string;
  formatted_address: string;
  rating?: number;
  phone?: string;
  website?: string;
}

interface UseGoogleMapsReturn {
  geocode: (address: string) => Promise<GeocodingResult | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<GeocodingResult | null>;
  getDirections: (origin: string, destination: string, mode?: 'driving' | 'walking' | 'bicycling' | 'transit') => Promise<DirectionsResult | null>;
  searchPlaces: (query: string, location?: LatLng, radius?: number) => Promise<PlaceDetails[]>;
  getPlaceDetails: (placeId: string) => Promise<PlaceDetails | null>;
  loading: boolean;
  error: string | null;
}

export const useGoogleMaps = (): UseGoogleMapsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeRequest = useCallback(async (endpoint: string, params: Record<string, any>) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, String(value));
        }
      });

      const response = await fetch(`/api/maps${endpoint}?${queryString.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const geocode = useCallback(async (address: string): Promise<GeocodingResult | null> => {
    const result = await makeRequest('/geocode', { address });
    if (result?.results?.[0]) {
      const place = result.results[0];
      return {
        formatted_address: place.formatted_address,
        location: place.geometry.location,
        place_id: place.place_id,
      };
    }
    return null;
  }, [makeRequest]);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<GeocodingResult | null> => {
    const result = await makeRequest('/geocode', { latlng: `${lat},${lng}` });
    if (result?.results?.[0]) {
      const place = result.results[0];
      return {
        formatted_address: place.formatted_address,
        location: place.geometry.location,
        place_id: place.place_id,
      };
    }
    return null;
  }, [makeRequest]);

  const getDirections = useCallback(async (
    origin: string,
    destination: string,
    mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
  ): Promise<DirectionsResult | null> => {
    const result = await makeRequest('/directions', { origin, destination, mode });
    if (result?.routes?.[0]) {
      const route = result.routes[0];
      const leg = route.legs[0];
      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        polyline: route.overview_polyline.points,
      };
    }
    return null;
  }, [makeRequest]);

  const searchPlaces = useCallback(async (
    query: string,
    location?: LatLng,
    radius?: number
  ): Promise<PlaceDetails[]> => {
    const params: Record<string, any> = { query };
    if (location) {
      params.location = `${location.lat},${location.lng}`;
    }
    if (radius) {
      params.radius = radius;
    }

    const result = await makeRequest('/places/search', params);
    return result?.results?.map((place: any) => ({
      name: place.name,
      formatted_address: place.formatted_address,
      rating: place.rating,
      phone: place.formatted_phone_number,
      website: place.website,
    })) || [];
  }, [makeRequest]);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    const result = await makeRequest('/places/details', { place_id: placeId });
    if (result?.result) {
      const place = result.result;
      return {
        name: place.name,
        formatted_address: place.formatted_address,
        rating: place.rating,
        phone: place.formatted_phone_number,
        website: place.website,
      };
    }
    return null;
  }, [makeRequest]);

  return {
    geocode,
    reverseGeocode,
    getDirections,
    searchPlaces,
    getPlaceDetails,
    loading,
    error,
  };
};
