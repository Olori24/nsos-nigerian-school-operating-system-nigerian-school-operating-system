/**
 * NSOS Google Maps frontend integration.
 * The browser key must be restricted to NSOS referrers and Maps APIs only.
 */
/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let mapsScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (!API_KEY) return Promise.reject(new Error("VITE_GOOGLE_MAPS_API_KEY is not configured."));
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: API_KEY,
      v: "weekly",
      libraries: "marker,places,geocoding,geometry",
    });
    script.src = "https://maps.googleapis.com/maps/api/js?" + params.toString();
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.remove();
      if (window.google?.maps) resolve();
      else {
        mapsScriptPromise = null;
        reject(new Error("Google Maps loaded without its Maps JavaScript API."));
      }
    };
    script.onerror = () => {
      script.remove();
      mapsScriptPromise = null;
      reject(new Error("Google Maps JavaScript API failed to load."));
    };
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
      if (!mapContainer.current) return;
      const mapsApi = window.google?.maps;
      if (!mapsApi) throw new Error("Google Maps JavaScript API is unavailable.");
      map.current = new mapsApi.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      setLoadError(null);
      onMapReady?.(map.current);
    } catch (error) {
      console.error("[NSOS Maps] Initialization failed:", error);
      setLoadError("Map is temporarily unavailable. Check the Google Maps key and API restrictions.");
    }
  });

  useEffect(() => {
    void init();
    return () => {
      map.current = null;
    };
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("relative w-full h-[500px]", className)}>
      {loadError && (
        <div role="alert" className="absolute inset-0 grid place-items-center rounded-xl bg-[#f4f7f4] px-6 text-center text-sm text-[#53675b]">
          {loadError}
        </div>
      )}
    </div>
  );
}
