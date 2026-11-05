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
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-900">
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
          // Calculate proportional radius between 6px and 24px
          const ratio = (pt.units || 1) / maxUnits;
          const radius = Math.max(7, Math.min(26, 7 + ratio * 19));

          // Color scale: Red/Orange for very high intensity, Blue for moderate
          let color = '#0284c7'; // default brand blue
          let fillColor = '#38bdf8';
          if (ratio > 0.6) {
            color = '#e11d48'; // crimson
            fillColor = '#fb7185';
          } else if (ratio > 0.3) {
            color = '#f59e0b'; // amber
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
                fillOpacity: 0.75,
                weight: 2
              }}
              eventHandlers={{
                click: () => onSelectPoint && onSelectPoint(pt)
              }}
            >
              <Popup>
                <div className="p-2 min-w-[210px] space-y-1.5 text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <MapPin className="w-4 h-4 text-brand-500" />
                    <div>
                      <p className="font-bold text-xs">{pt.city} ({pt.pincode})</p>
                      <p className="text-[10px] text-slate-400">{pt.state}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Demand</span>
                      <span className="font-bold font-mono">{pt.units} units</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase">Revenue</span>
                      <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{Math.round(pt.revenue).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-[10px]">
                    <span className="text-slate-400 block">Top Area Product:</span>
                    <p className="font-semibold text-brand-600 dark:text-brand-400 truncate">{pt.topProduct}</p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Demand Intensity Legend */}
      <div className="absolute bottom-4 right-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-[10px] space-y-1.5 pointer-events-auto">
        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">Demand Intensity</p>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Surging Volume (&gt;60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">High Volume (30-60%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Steady Baseline (&lt;30%)</span>
        </div>
      </div>
    </div>
  );
}

