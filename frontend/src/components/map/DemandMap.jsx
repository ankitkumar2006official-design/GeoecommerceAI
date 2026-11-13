import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { MapPin, TrendingUp, Package } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Component to handle dynamic map panning when filters change
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function DemandMap({ points = [], selectedState = 'All', onSelectPoint }) {
  const [mapCenter, setMapCenter] = useState([21.7679, 78.8718]); // India center
  const [zoomLevel, setZoomLevel] = useState(5);

  useEffect(() => {
    if (selectedState !== 'All' && points.length > 0) {
      // Find average lat/lng for the selected state
      const statePoints = points.filter((p) => p.state === selectedState);
      if (statePoints.length > 0) {
        const avgLat = statePoints.reduce((acc, p) => acc + p.lat, 0) / statePoints.length;
        const avgLng = statePoints.reduce((acc, p) => acc + p.lng, 0) / statePoints.length;
        setMapCenter([avgLat, avgLng]);
        setZoomLevel(7);
        return;
      }
    }
    setMapCenter([21.7679, 78.8718]);
    setZoomLevel(5);
  }, [selectedState, points]);

  // Find max units to scale circle radius proportionally
  const maxUnits = Math.max(1, ...points.map((p) => p.units || 1));

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-800/90 shadow-card bg-slate-900">
      <MapContainer
        center={mapCenter}
        zoom={zoomLevel}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <MapRecenter center={mapCenter} zoom={zoomLevel} />

        {/* Clean OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((pt, idx) => {
          // Proportional radius between 6px and 22px
          const ratio = (pt.units || 1) / maxUnits;
          const radius = Math.max(7, Math.min(24, 7 + ratio * 17));

          // Semantic color palette
          let color = '#2563eb';
          let fillColor = '#60a5fa';
          if (ratio > 0.6) {
            color = '#e11d48';
            fillColor = '#fb7185';
          } else if (ratio > 0.3) {
            color = '#d97706';
            fillColor = '#fbbf24';
          }

          return (
            <CircleMarker
              key={`${pt.pincode}-${idx}`}
              center={[pt.lat, pt.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: fillColor,
                fillOpacity: 0.8,
                weight: 2
              }}
              eventHandlers={{
                click: () => onSelectPoint && onSelectPoint(pt)
              }}
            >
              <Popup>
                <div className="p-3 min-w-[210px] space-y-2 text-slate-800 dark:text-slate-100 font-sans">
                  <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs leading-none">{pt.city} ({pt.pincode})</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{pt.state}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-medium">Demand</span>
                      <span className="font-semibold tabular-nums">{pt.units} units</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-medium">Revenue</span>
                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        ₹{Math.round(pt.revenue).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                    <span className="text-slate-400 block text-[9px] uppercase font-medium">Top Product:</span>
                    <p className="font-medium text-brand-600 dark:text-brand-400 truncate mt-0.5">{pt.topProduct}</p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Demand Intensity Legend */}
      <div className="absolute bottom-4 right-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-card text-[10px] space-y-1.5 pointer-events-auto">
        <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Demand Density</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Surging Volume (&gt;60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Moderate Volume (30-60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Baseline Demand (&lt;30%)</span>
        </div>
      </div>
    </div>
  );
}