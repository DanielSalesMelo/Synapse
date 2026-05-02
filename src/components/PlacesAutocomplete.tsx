/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGoogleMapsApiKey } from "@/lib/backend";

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function ensureMapScript(): Promise<void> {
  if (scriptLoaded && window.google?.maps) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise((resolve, reject) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      reject(new Error("Google Maps API key não configurada"));
      return;
    }

    if (window.google?.maps) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      scriptLoaded = true;
      resolve();
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
