import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapLocation {
    lat: number;
    lng: number;
    label: string;
    role: string;
    timestamp: string;
    isActive: boolean;
}

interface TrackingMapProps {
    locations: MapLocation[];
}

function MapBounds({ locations }: { locations: MapLocation[] }) {
    const map = useMap();
    useEffect(() => {
        if (locations.length > 0) {
            const bounds = L.latLngBounds(locations.map(loc => [loc.lat, loc.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
    }, [locations, map]);
    return null;
}

export function TrackingMap({ locations }: TrackingMapProps) {
    if (locations.length === 0) return null;

    // Default center: India
    const INDIA_CENTER: [number, number] = [22.5937, 78.9629];

    const getIcon = (isActive: boolean) => {
        const iconColor = isActive ? '#10b981' : '#6366f1';
        const iconSize = isActive ? 18 : 12;

        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: ${iconSize}px;
                height: ${iconSize}px;
                background: ${iconColor};
                border: 2.5px solid white;
                border-radius: 50%;
                box-shadow: 0 0 ${isActive ? '14px' : '6px'} ${iconColor}, 0 2px 6px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize / 2, iconSize / 2],
        });
    };

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden relative z-0">
            <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-200">🇮🇳 India Medicine Shipment Map</h2>
                <div className="flex gap-4">
                    <span className="flex items-center gap-2 text-xs font-medium text-gray-400"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div> Active</span>
                    <span className="flex items-center gap-2 text-xs font-medium text-gray-400"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Previous</span>
                </div>
            </div>
            <div className="w-full h-[450px]">
                <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 10 }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />

                    {locations.length > 1 && (
                        <Polyline
                            positions={locations.map(loc => [loc.lat, loc.lng])}
                            color="#6366f1"
                            weight={3}
                            opacity={0.7}
                            dashArray="10, 6"
                        />
                    )}

                    {locations.map((loc, idx) => (
                        <Marker
                            key={idx}
                            position={[loc.lat, loc.lng]}
                            icon={getIcon(loc.isActive)}
                        >
                            <Popup className="!rounded-xl min-w-[220px]">
                                <div className="p-1">
                                    <strong className="text-gray-900 block text-base font-bold capitalize">{loc.role}</strong>
                                    <span className="text-gray-700 block my-1 font-medium text-sm">{loc.label}</span>
                                    <span className="text-gray-500 text-xs block mt-2 border-t border-gray-200 pt-2">{new Date(loc.timestamp).toLocaleString()}</span>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    <MapBounds locations={locations} />
                </MapContainer>
            </div>
            <style jsx global>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 12px;
                    padding: 4px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
                }
                .leaflet-popup-content {
                    margin: 10px 14px;
                }
            `}</style>
        </div>
    );
}
