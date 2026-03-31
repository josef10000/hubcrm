import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, Users } from 'lucide-react';
import { Client } from '../App';

declare const L: any;

interface ClientMapViewProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

interface GeoCache {
  [cep: string]: { lat: number; lng: number } | null;
}

const STATUS_COLORS: Record<string, string> = {
  'Ativo': '#22c55e',
  'Em Desenvolvimento': '#eab308',
  'Inadimplente': '#ef4444',
  'Cancelado': '#6b7280',
};

function createColorIcon(color: string, name: string) {
  const initial = name ? name.charAt(0).toUpperCase() : '';
  const isDark = color === '#000000' || color === '#1a1a1a' || color === '#6b7280'; // Simplistic check
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transition: transform 0.2s;
      " class="hover:scale-110">
        <div style="
          width: 44px; 
          height: 44px; 
          border-radius: 50%;
          background: ${color}; 
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex; 
          align-items: center; 
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 18px;
          z-index: 2;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">${initial}</div>
        <div style="
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 14px solid ${color};
          margin-top: -3px;
          z-index: 1;
          filter: drop-shadow(0 4px 4px rgba(0,0,0,0.3));
        "></div>
      </div>
    `,
    iconSize: [44, 55],
    iconAnchor: [22, 55],
    popupAnchor: [0, -55],
  });
}

// Geocode via Nominatim (OpenStreetMap) — free, no key needed
async function geocodeCep(cep: string): Promise<{ lat: number; lng: number } | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${digits}&country=BR&format=json&limit=1`, {
      headers: { 'Accept-Language': 'pt-BR' },
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}

export default function ClientMapView({ clients, onClientClick }: ClientMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [geoCache] = useState<GeoCache>({});
  const [mappedCount, setMappedCount] = useState(0);

  const clientsWithCep = clients.filter(c => c.cep && c.cep.replace(/\D/g, '').length === 8);

  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    // Initialize map centered on Brazil
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([-14.235, -51.925], 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // Geocode and place markers
    const placeMarkers = async () => {
      setLoading(true);
      let count = 0;
      const bounds: any[] = [];

      for (const client of clientsWithCep) {
        const cepKey = client.cep!.replace(/\D/g, '');
        
        if (!(cepKey in geoCache)) {
          // Rate-limit Nominatim (1 req/sec max)
          await new Promise(r => setTimeout(r, 1100));
          geoCache[cepKey] = await geocodeCep(cepKey);
        }

        const coords = geoCache[cepKey];
        if (coords) {
          const color = STATUS_COLORS[client.status || ''] || '#6b7280';
          const icon = createColorIcon(color, client.name);

          const marker = L.marker([coords.lat, coords.lng], { icon })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: system-ui; min-width: 180px;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${client.name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 2px;">📋 ${client.plan} • <span style="color: ${color}; font-weight: 600;">${client.status}</span></div>
                ${client.endereco ? `<div style="font-size: 12px; color: #888; margin-bottom: 2px;">📍 ${client.endereco}${client.bairro ? `, ${client.bairro}` : ''}</div>` : ''}
                ${client.cidade ? `<div style="font-size: 12px; color: #888; margin-bottom: 2px;">🏙️ ${client.cidade}/${client.estado}</div>` : ''}
                ${client.cep ? `<div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">CEP: ${client.cep}</div>` : ''}
                ${client.whatsapp ? `<div style="font-size: 12px; color: #888;">📱 ${client.whatsapp}</div>` : ''}
              </div>
            `);

          marker.on('click', () => onClientClick(client));
          bounds.push([coords.lat, coords.lng]);
          count++;
        }
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }

      setMappedCount(count);
      setLoading(false);
    };

    placeMarkers();

    return () => {};
  }, [clients.length, clientsWithCep.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0a0a0a] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-primary-500/10 text-primary-500 rounded-xl">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Mapa de Clientes</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {loading ? 'Carregando...' : `${mappedCount} clientes mapeados de ${clientsWithCep.length} com CEP`}
            </p>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-gray-600 dark:text-gray-400 hidden sm:inline">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[500] bg-white/80 dark:bg-black/60 flex items-center justify-center backdrop-blur-sm" style={{ top: 60 }}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-primary-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Geocodificando endereços...</p>
          </div>
        </div>
      )}

      {/* No CEP message */}
      {clientsWithCep.length === 0 && !loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center" style={{ top: 60 }}>
          <div className="text-center p-8 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl max-w-sm">
            <Users size={40} className="text-gray-400 mx-auto mb-3" />
            <h4 className="font-bold text-gray-900 dark:text-white mb-2">Nenhum cliente com CEP</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Adicione o CEP nos cadastros de clientes para visualizá-los no mapa.
            </p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="flex-1" style={{ minHeight: 400 }} />
    </div>
  );
}
