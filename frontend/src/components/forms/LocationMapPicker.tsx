'use client';
import dynamic from 'next/dynamic';

interface LocationMapPickerProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
  centerLat?: number;
  centerLng?: number;
  selectedCity?: string;
  selectedBarangay?: string;
}

// Load Leaflet only on the client — prevents "Map container already initialized"
// caused by React 19 Strict Mode double-invoking effects on the same DOM node.
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] rounded-lg border-2 border-gray-300 flex items-center justify-center bg-gray-100">
      <p className="text-sm text-gray-500">Loading map...</p>
    </div>
  ),
});

export default function LocationMapPicker(props: LocationMapPickerProps) {
  return <LeafletMap {...props} />;
}
