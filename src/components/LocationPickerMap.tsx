'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  venueName?: string;
}

export default function LocationPickerMap({
  lat,
  lng,
  onLocationChange,
  venueName,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = Number.isFinite(lat) ? lat : 40.7306;
    const initialLng = Number.isFinite(lng) ? lng : -73.9982;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const pinIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
          <div style="background:#EA580C;color:white;padding:3px 8px;border-radius:10px;font-size:11px;font-weight:800;letter-spacing:0.02em;box-shadow:0 4px 14px rgba(234,88,12,0.45);border:2px solid white;white-space:nowrap;display:flex;align-items:center;gap:4px;">
            <span>Meetup Spot</span>
          </div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #EA580C;"></div>
          <div style="width:8px;height:4px;border-radius:50%;background:rgba(0,0,0,0.3);margin-top:-2px;"></div>
        </div>
      `,
      iconSize: [0, 0],
    });

    const marker = L.marker([initialLat, initialLng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onLocationChange(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onLocationChange(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position when lat/lng change from presets or GPS
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - lat) > 0.0001 || Math.abs(currentPos.lng - lng) > 0.0001) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
      }
    }
  }, [lat, lng]);

  return (
    <div className="relative isolate z-0 w-full h-[360px] sm:h-[420px] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700/80 shadow-inner bg-stone-100 dark:bg-stone-900">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-2 left-2 right-2 z-[1000] pointer-events-none">
        <div className="bg-stone-950/85 backdrop-blur-md text-stone-200 text-[11px] font-semibold px-3 py-1.5 rounded-xl text-center shadow-md border border-white/10">
          Tap or drag the pin to set the meetup spot ({lat.toFixed(4)}, {lng.toFixed(4)})
        </div>
      </div>
    </div>
  );
}
