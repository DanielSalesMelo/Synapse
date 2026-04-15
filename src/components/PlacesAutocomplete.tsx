/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
const FORGE_BASE_URL =
  import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
  "https://forge.butterfly-effect.dev";
const MAPS_PROXY_URL = `${FORGE_BASE_URL}/v1/maps/proxy`;

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function ensureMapScript(): Promise<void> {
  if (scriptLoaded && window.google?.maps) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `${MAPS_PROXY_URL}/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      scriptLoaded = true;
      resolve();
      script.remove();
    };
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  iconColor?: string;
  disabled?: boolean;
}

export function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Cidade, endereço ou empresa...",
  className,
  iconColor = "text-green-500",
  disabled = false,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureMapScript().then(() => setReady(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "br" },
      fields: ["formatted_address", "name", "geometry"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.formatted_address) {
        onChange(place.formatted_address);
      } else if (place?.name) {
        onChange(place.name);
      }
    });
  }, [ready, onChange]);

  return (
    <div className="relative">
      <MapPin className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 z-10 pointer-events-none", iconColor)} />
      <Input
        ref={inputRef}
        defaultValue={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("pl-8", className)}
        disabled={disabled}
      />
    </div>
  );
}
