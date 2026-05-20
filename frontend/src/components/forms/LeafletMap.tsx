'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import { MapPin, Maximize, Navigation, Search, Loader } from 'lucide-react';
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
  readOnly?: boolean;
}

function LocationMarker({
  position,
  setPosition,
  readOnly,
  address,
}: {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
  readOnly?: boolean;
  address?: string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  useMapEvents({
    dragstart() { setIsDragging(true); },
    dragend() { setTimeout(() => setIsDragging(false), 100); },
    click(e) {
      if (!isDragging && !readOnly) setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.openPopup();
    }
  }, [position]);

  return position ? (
    <Marker position={position} draggable={!readOnly} ref={markerRef}>
      <Popup>
        <div className="text-xs">
          <p className="font-semibold text-gray-900 mb-1">📍 Location Confirmed</p>
          <p className="text-gray-700">{address || 'Loading address...'}</p>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

function MapCenterController({ center, setMapInstance }: { center: [number, number]; setMapInstance?: (map: L.Map) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (setMapInstance) {
      setMapInstance(map);
    }
  }, [map, setMapInstance]);
  
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
  readOnly = false,
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

  const [humanAddress, setHumanAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [useSatellite, setUseSatellite] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialLat && initialLng) {
      const lat = parseFloat(String(initialLat));
      const lng = parseFloat(String(initialLng));
      if (!isNaN(lat) && !isNaN(lng)) setPosition([lat, lng]);
    }
  }, [initialLat, initialLng]);

  // Reverse geocoding to get human-readable address with retry mechanism
  useEffect(() => {
    if (position) {
      setIsLoadingAddress(true);
      
      const reverseGeocode = async (retries = 3): Promise<string> => {
        for (let i = 0; i < retries; i++) {
          try {
            // Add User-Agent header and delay between retries
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position[0]}&lon=${position[1]}&zoom=18&addressdetails=1`,
              {
                headers: {
                  'Accept': 'application/json',
                },
                referrerPolicy: 'no-referrer-when-downgrade',
              }
            );
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.display_name) {
              return data.display_name;
            }
            
            // If no display_name, throw to retry
            throw new Error('No display_name in response');
          } catch (error) {
            console.warn(`Geocoding attempt ${i + 1} failed:`, error);
            
            // Wait before retry (exponential backoff)
            if (i < retries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
          }
        }
        
        // All retries failed - return a descriptive fallback
        return `Near Gordon College, Olongapo City (${position[0].toFixed(4)}, ${position[1].toFixed(4)})`;
      };
      
      reverseGeocode()
        .then(address => {
          setHumanAddress(address);
          onLocationSelect(position[0], position[1], address);
        })
        .finally(() => setIsLoadingAddress(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // Search address function
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Olongapo City')}&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
          referrerPolicy: 'no-referrer-when-downgrade',
        }
      );
      const data = await response.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setPosition([lat, lng]);
        if (mapInstance) {
          mapInstance.setView([lat, lng], 18);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Get current location
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition([lat, lng]);
          if (mapInstance) {
            mapInstance.setView([lat, lng], 18);
          }
        },
        (error) => {
          alert('Unable to get your location. Please enable location services.');
        }
      );
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change (e.g., when user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="w-full rounded-lg overflow-hidden border-2 border-gray-300 relative z-0" style={{ height: isFullscreen ? '100vh' : '400px' }}>
      {/* Header with Search Bar */}
      {!readOnly && (
        <div className="bg-white p-3 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search address (e.g., Gordon College Library)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
            >
              {isSearching ? <Loader className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
            <button
              onClick={handleCurrentLocation}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Use my current location"
            >
              <Navigation className="h-4 w-4 text-gray-700" />
            </button>
          </div>
          <p className="text-xs text-gray-600">
            {position ? (
              <span className="flex items-center gap-1 text-green-700 font-medium">
                ✓ Location Confirmed
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Click on the map to pin the incident location
              </span>
            )}
          </p>
        </div>
      )}

      {/* Map Container */}
      <div style={{ height: readOnly ? '100%' : 'calc(100% - 110px)', width: '100%', position: 'relative' }}>
        <MapContainer
          center={mapCenter}
          zoom={16}
          scrollWheelZoom={!readOnly}
          doubleClickZoom={!readOnly}
          touchZoom={!readOnly}
          dragging={!readOnly}
          zoomControl={!readOnly}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution={useSatellite ? '&copy; Esri' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            url={useSatellite 
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />
          <MapCenterController center={mapCenter} setMapInstance={setMapInstance} />
          <LocationMarker position={position} setPosition={setPosition} readOnly={readOnly} address={humanAddress} />
        </MapContainer>

        {/* Map Controls Overlay */}
        {!readOnly && (
          <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => setUseSatellite(!useSatellite)}
              className="bg-white px-3 py-2 rounded-lg shadow-md text-xs font-medium hover:bg-gray-50 transition-colors border border-gray-200"
              title={useSatellite ? 'Street View' : 'Satellite View'}
            >
              {useSatellite ? '🗺️ Street' : '🛰️ Satellite'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
              title="Fullscreen"
            >
              <Maximize className="h-4 w-4 text-gray-700" />
            </button>
          </div>
        )}
      </div>

      {/* Footer with Address */}
      {position && (
        <div className="bg-green-50 p-3 border-t border-green-200">
          {isLoadingAddress ? (
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <Loader className="h-3 w-3 animate-spin" />
              Getting address...
            </p>
          ) : (
            <p className="text-xs text-green-800 font-medium">
              📍 {humanAddress}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
