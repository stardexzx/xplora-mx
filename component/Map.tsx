"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { Negocio } from "../types/negocio";
import { LatLng } from "../services/geo";
import { useMaps } from "../context/MapsContext";
import type { RouteResult } from "../app/api/route/route";

export type TravelMode = "WALKING" | "TRANSIT" | "DRIVING";

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  mode: TravelMode;
}

interface MapProps {
  negocios: Negocio[];
  selectedId: string | null;
  userLocation?: LatLng | null;
  onSelectNegocio: (negocio: Negocio | null) => void;
  routeRequest?: RouteRequest | null;
  onRouteResult?: (result: RouteResult | null) => void;
}

// Mapa claro estilo Airbnb
const lightMapStyle = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e0e0e0" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ebebeb" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9e8f0" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#f9f9f9" }],
  },
  { elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
];

// Decodifica polyline encodada (algoritmo estándar de Google)
function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let shift = 0,
      result = 0,
      b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

const MODE_COLOR: Record<TravelMode, string> = {
  TRANSIT: "#1a73e8",
  WALKING: "#34a853",
  DRIVING: "#ea4335",
};

export default function BusinessMap({
  negocios,
  selectedId,
  userLocation,
  onSelectNegocio,
  routeRequest,
  onRouteResult,
}: MapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<
    globalThis.Map<string, google.maps.marker.AdvancedMarkerElement>
  >(new globalThis.Map());
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const [center] = useState<LatLng>({ lat: 20.9674, lng: -89.6237 });
  const { isLoaded } = useMaps();

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Crear/actualizar markers cuando cambian negocios o selección
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !window.google?.maps?.marker) return;

    const { AdvancedMarkerElement } = google.maps.marker;
    const existingIds = new Set(markersRef.current.keys());

    negocios.forEach((negocio) => {
      if (!negocio.lat || !negocio.lng) return;
      const isActive = negocio.id === selectedId;

      if (markersRef.current.has(negocio.id)) {
        const marker = markersRef.current.get(negocio.id)!;
        const el = marker.content as HTMLElement;
        el.className = `map-pin${isActive ? " active" : ""}`;
        existingIds.delete(negocio.id);
      } else {
        const el = document.createElement("div");
        el.className = `map-pin${isActive ? " active" : ""}`;
        el.textContent =
          negocio.name.length > 14
            ? negocio.name.slice(0, 13) + "…"
            : negocio.name;

        const marker = new AdvancedMarkerElement({
          map: mapRef.current!,
          position: { lat: negocio.lat, lng: negocio.lng },
          content: el,
          title: negocio.name,
        });

        marker.addListener("click", () => {
          onSelectNegocio(negocio);
          mapRef.current?.panTo({ lat: negocio.lat, lng: negocio.lng });
        });

        markersRef.current.set(negocio.id, marker);
        existingIds.delete(negocio.id);
      }
    });

    existingIds.forEach((id) => {
      const marker = markersRef.current.get(id);
      if (marker) {
        marker.map = null;
        markersRef.current.delete(id);
      }
    });
  }, [negocios, selectedId, isLoaded, onSelectNegocio]);

  // Marker de ubicación del usuario
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !window.google?.maps?.marker) return;
    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.map = null;
        userMarkerRef.current = null;
      }
      return;
    }

    const el = document.createElement("div");
    el.style.cssText =
      "width:14px;height:14px;border-radius:50%;background:#4285F4;border:3px solid white;box-shadow:0 2px 8px rgba(66,133,244,0.5)";

    if (userMarkerRef.current) userMarkerRef.current.map = null;
    userMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: userLocation,
      content: el,
      title: "Tu ubicación",
    });

    mapRef.current.panTo(userLocation);
  }, [userLocation, isLoaded]);

  // Ruta via Routes API v2 (server-side) → polyline manual
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    // Limpiar polyline previa
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!routeRequest) {
      onRouteResult?.(null);
      return;
    }

    fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: routeRequest.origin,
        destination: routeRequest.destination,
        mode: routeRequest.mode,
      }),
    })
      .then((r) => r.json())
      .then((result: RouteResult) => {
        if (!result.encodedPolyline || !mapRef.current) return;

        const path = decodePolyline(result.encodedPolyline);
        polylineRef.current = new google.maps.Polyline({
          path,
          map: mapRef.current,
          strokeColor: MODE_COLOR[routeRequest.mode],
          strokeWeight: 5,
          strokeOpacity: 0.85,
        });

        const { low, high } = result.bounds;
        const bounds = new google.maps.LatLngBounds(
          { lat: low.latitude, lng: low.longitude },
          { lat: high.latitude, lng: high.longitude },
        );
        mapRef.current.fitBounds(bounds, {
          top: 80,
          bottom: 320,
          left: 40,
          right: 40,
        });

        onRouteResult?.(result);
      })
      .catch((err) => {
        console.error("Error calculando ruta:", err);
        onRouteResult?.(null);
      });
  }, [routeRequest, isLoaded]);

  // Cerrar popup al hacer click en el mapa
  const handleMapClick = useCallback(() => {
    onSelectNegocio(null);
  }, [onSelectNegocio]);

  if (!isLoaded)
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "3px solid #ddd",
            borderTopColor: "#222",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={center}
      zoom={13}
      onLoad={onMapLoad}
      onClick={handleMapClick}
      options={{
        mapId: "localIA-light",
        styles: lightMapStyle,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        clickableIcons: false,
      }}
    />
  );
}
