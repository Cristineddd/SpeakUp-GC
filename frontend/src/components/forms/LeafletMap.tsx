'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Patch Leaflet to handle React 19 Strict Mode double-invoke.
// React mounts → unmounts → remounts in dev, but react-leaflet doesn't clean
// up _leaflet_id on the container div, causing "Map container is already initialized".
// This patch clears the stale _leaflet_id before every map initialization.
const _origInitContainer = (L.Map.prototype as any)._initContainer;
(L.Map.prototype as any)._initContainer = function (id: string | HTMLElement) {
  const container = typeof id === 'string' ? document.getElementById(id) : id;
  if (container && (container as any)._leaflet_id) {
    delete (container as any)._leaflet_id;
  }
  _origInitContainer.call(this, id);
};

interface LeafletMapProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  centerLat?: number;
  centerLng?: number;
  selectedCity?: string;
  selectedBarangay?: string;
}

function LocationMarker({
  position,
  setPosition,
}: {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  useMapEvents({
    dragstart() { setIsDragging(true); },
    dragend() { setTimeout(() => setIsDragging(false), 100); },
    click(e) {
      if (!isDragging) setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.panTo(center); }, [center[0], center[1]]);
  return null;
}

const defaultCenter: [number, number] = [14.8283, 120.2812]; // Gordon College, Tapinac, Olongapo City

export default function LeafletMap({
  onLocationSelect,
  initialLat,
  initialLng,
  centerLat,
  centerLng,
  selectedCity,
  selectedBarangay,
}: LeafletMapProps) {
  const mapCenter: [number, number] =
    centerLat && centerLng ? [centerLat, centerLng] : defaultCenter;

  const [position, setPosition] = useState<[number, number] | null>(() => {
    if (initialLat && initialLng) {
      const lat = parseFloat(String(initialLat));
      const lng = parseFloat(String(initialLng));
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return defaultCenter;
  });

  // Ref to the container div — kept for future use but cleanup now handled by the global patch above
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLat && initialLng) {
      const lat = parseFloat(String(initialLat));
      const lng = parseFloat(String(initialLng));
      if (!isNaN(lat) && !isNaN(lng)) setPosition([lat, lng]);
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (position) {
      const address = `Gordon College Campus — ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`;
      onLocationSelect(position[0], position[1], address);
    }
  }, [position]);

  return (
    <div className="w-full h-[300px] rounded-lg overflow-hidden border-2 border-gray-300 relative z-0">
      <div className="bg-blue-50 p-2 border-b border-blue-200">
        <p className="text-xs text-blue-800 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {selectedCity && selectedBarangay
            ? `Location pinned in ${selectedBarangay}, ${selectedCity}. Click to adjust.`
            : 'Click on the map to pin the exact location of the incident.'}
        </p>
      </div>
      {/* The ref div wraps MapContainer so we can clear _leaflet_id on unmount */}
      <div ref={containerRef} style={{ height: 'calc(100% - 36px)', width: '100%' }}>
        <MapContainer
          center={mapCenter}
          zoom={17}
          scrollWheelZoom
          doubleClickZoom
          touchZoom
          dragging
          zoomControl
          style={{ height: '100%', width: '100%' }}
          maxBounds={[[14.8260, 120.2790], [14.8310, 120.2840]]}
          maxBoundsViscosity={1.0}
          minZoom={16}
          maxZoom={19}
          zoomSnap={0.5}
          zoomDelta={0.5}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterController center={mapCenter} />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>
      {position && (
        <div className="bg-green-50 p-2 border-t border-green-200">
          <p className="text-xs text-green-800">
            📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
