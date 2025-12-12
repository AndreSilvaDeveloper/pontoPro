'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, MapPin } from 'lucide-react';

// Corrige o ícone padrão do Leaflet que quebra no Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Componente para atualizar o centro do mapa quando busca
function MoverMapa({ coords }: { coords: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], 16);
  }, [coords, map]);
  return null;
}

// Componente para capturar clique no mapa
function CliqueMapa({ setPos }: { setPos: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      setPos(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapaCaptura({ latInicial, lngInicial, aoSelecionar }: any) {
  // Posição inicial (Se não tiver, usa o centro do Brasil ou SP)
  const [posicao, setPosicao] = useState({ 
    lat: Number(latInicial) || -23.55052, 
    lng: Number(lngInicial) || -46.63330 
  });
  
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Atualiza posição interna se o pai mandar novos props
  useEffect(() => {
    if (latInicial && lngInicial) {
        setPosicao({ lat: Number(latInicial), lng: Number(lngInicial) });
    }
  }, [latInicial, lngInicial]);

  const buscarEndereco = async () => {
    if (!busca) return;
    setCarregando(true);
    try {
      // Usa API gratuita do OpenStreetMap (Nominatim)
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busca)}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const novaLat = parseFloat(data[0].lat);
        const novaLng = parseFloat(data[0].lon);
        const novaPos = { lat: novaLat, lng: novaLng };
        
        setPosicao(novaPos);
        aoSelecionar(novaLat, novaLng); // Manda pro formulário pai
      } else {
        alert('Endereço não encontrado!');
      }
    } catch (error) {
      alert('Erro ao buscar endereço.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-2">
        {/* BARRA DE BUSCA */}
        <div className="flex gap-2">
            <div className="relative flex-1">
                <input 
                    type="text" 
                    placeholder="Digite o endereço (Ex: Av Paulista, 1000)" 
                    className="w-full bg-slate-800 border border-slate-700 p-2.5 pl-10 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarEndereco()}
                />
                <MapPin className="absolute left-3 top-3 text-slate-500" size={16} />
            </div>
            <button 
                type="button" 
                onClick={buscarEndereco} 
                disabled={carregando}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 rounded-lg text-sm font-bold flex items-center gap-2"
            >
                <Search size={16} /> {carregando ? '...' : 'Buscar'}
            </button>
        </div>

        {/* MAPA */}
        <div className="h-64 w-full rounded-xl overflow-hidden border-2 border-slate-700 relative z-0">
            <MapContainer center={[posicao.lat, posicao.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                <Marker position={[posicao.lat, posicao.lng]} icon={icon} />
                <MoverMapa coords={posicao} />
                <CliqueMapa setPos={(lat, lng) => {
                    setPosicao({ lat, lng });
                    aoSelecionar(lat, lng);
                }} />
            </MapContainer>
        </div>
        <p className="text-[10px] text-slate-400 text-center">
            * Clique no mapa para ajustar a posição exata do pino.
        </p>
    </div>
  );
}