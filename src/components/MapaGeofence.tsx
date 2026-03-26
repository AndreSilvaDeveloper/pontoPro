'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Polyline, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

interface LocalAdicional {
  lat: number | string;
  lng: number | string;
  raio?: number | string;
  nome?: string;
}

interface MapaGeofenceProps {
  latBase: number;
  lngBase: number;
  raio: number;
  latAtual: number;
  lngAtual: number;
  locaisAdicionais?: LocalAdicional[];
}

function getDistanceFromLatLonInMeters(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ajusta o mapa para mostrar todos os pontos
function AjustarVisao({ latBase, lngBase, latAtual, lngAtual }: {
  latBase: number; lngBase: number; latAtual: number; lngAtual: number;
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = [
      [latBase, lngBase] as [number, number],
      [latAtual, lngAtual] as [number, number],
    ];
    try {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
    } catch {
      map.setView([latBase, lngBase], 16);
    }
  }, [map, latBase, lngBase, latAtual, lngAtual]);
  return null;
}

export default function MapaGeofence({
  latBase,
  lngBase,
  raio,
  latAtual,
  lngAtual,
  locaisAdicionais,
}: MapaGeofenceProps) {
  const distanciaBase = useMemo(
    () => Math.round(getDistanceFromLatLonInMeters(latAtual, lngAtual, latBase, lngBase)),
    [latAtual, lngAtual, latBase, lngBase]
  );

  // Verifica se esta dentro de algum local (base ou adicionais)
  const dentroBase = distanciaBase <= raio;

  const dentroAlgumAdicional = useMemo(() => {
    if (!locaisAdicionais || locaisAdicionais.length === 0) return false;
    return locaisAdicionais.some((loc) => {
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      const r = Number(loc.raio) || 100;
      if (!lat || !lng) return false;
      const dist = getDistanceFromLatLonInMeters(latAtual, lngAtual, lat, lng);
      return dist <= r;
    });
  }, [latAtual, lngAtual, locaisAdicionais]);

  const estaDentro = dentroBase || dentroAlgumAdicional;

  const borderColor = estaDentro ? 'border-emerald-500/50' : 'border-red-500/50';

  return (
    <div className="space-y-1.5">
      <div
        className={`w-full rounded-xl overflow-hidden border-2 ${borderColor} relative z-0`}
        style={{ height: '200px' }}
      >
        <MapContainer
          center={[latBase, lngBase]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CartoDB'
          />

          {/* Geofence principal */}
          <Circle
            center={[latBase, lngBase]}
            radius={raio}
            pathOptions={{
              color: '#7c3aed',
              fillColor: '#7c3aed',
              fillOpacity: 0.2,
              opacity: 0.6,
              weight: 2,
            }}
          />

          {/* Locais adicionais */}
          {locaisAdicionais?.map((loc, idx) => {
            const lat = Number(loc.lat);
            const lng = Number(loc.lng);
            const r = Number(loc.raio) || 100;
            if (!lat || !lng) return null;
            return (
              <Circle
                key={idx}
                center={[lat, lng]}
                radius={r}
                pathOptions={{
                  color: '#8b5cf6',
                  fillColor: '#8b5cf6',
                  fillOpacity: 0.12,
                  opacity: 0.4,
                  weight: 1.5,
                }}
              />
            );
          })}

          {/* Linha entre posicao atual e base */}
          <Polyline
            positions={[
              [latAtual, lngAtual],
              [latBase, lngBase],
            ]}
            pathOptions={{
              color: estaDentro ? '#10b981' : '#ef4444',
              weight: 2,
              dashArray: '6, 8',
              opacity: 0.7,
            }}
          />

          {/* Ponto do funcionario (dot pulsante azul via CSS) */}
          <CircleMarker
            center={[latAtual, lngAtual]}
            radius={8}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
              opacity: 1,
              weight: 3,
            }}
          />
          {/* Halo externo para efeito de pulso */}
          <CircleMarker
            center={[latAtual, lngAtual]}
            radius={14}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.15,
              opacity: 0.3,
              weight: 1,
            }}
          />

          <AjustarVisao
            latBase={latBase}
            lngBase={lngBase}
            latAtual={latAtual}
            lngAtual={lngAtual}
          />
        </MapContainer>
      </div>

      {/* Texto de distancia */}
      <div className="flex items-center justify-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            estaDentro ? 'bg-emerald-400' : 'bg-red-400'
          }`}
        />
        <p className="text-xs text-text-muted">
          {estaDentro ? (
            <span className="text-emerald-400 font-semibold">
              Dentro da zona permitida
            </span>
          ) : (
            <>
              <span className="text-red-400 font-semibold">
                Fora da zona permitida
              </span>
              {' - '}
            </>
          )}
          {' '}
          <span className="text-text-faint">
            {distanciaBase >= 1000
              ? `${(distanciaBase / 1000).toFixed(1)}km`
              : `${distanciaBase}m`}{' '}
            do local
          </span>
        </p>
      </div>
    </div>
  );
}
