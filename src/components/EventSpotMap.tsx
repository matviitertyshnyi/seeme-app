'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface EventSpotMapProps {
  lat: number;
  lng: number;
  venueName: string;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createVenueIcon(venueName: string): L.DivIcon {
  const safeName = escapeHtml(venueName || 'Meetup Spot');
  return L.divIcon({
    className: 'event-spot-pin-icon',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:none;">
        <div style="background:#18181b;color:#f4f4f5;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:700;line-height:1.2;box-shadow:0 4px 14px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.18);white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;text-align:center;">
          ${safeName}
        </div>
        <div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:24px;height:24px;border-radius:50%;background:#EA580C;opacity:0.35;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:relative;width:12px;height:12px;border-radius:50%;background:#EA580C;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.45);"></div>
        </div>
        <div style="width:8px;height:3px;border-radius:50%;background:rgba(0,0,0,0.28);margin-top:2px;"></div>
      </div>
    `,
    iconSize: [0, 0],
  });
}

export default function EventSpotMap({ lat, lng, venueName }: EventSpotMapProps) {
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
      zoomControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      icon: createVenueIcon(venueName),
      interactive: false,
    }).addTo(map);

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Trigger map invalidation in case of modal transition animation
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position & view when lat/lng/venueName changes
  useEffect(() => {
    if (mapInstanceRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setIcon(createVenueIcon(venueName));
      }
      mapInstanceRef.current.setView([lat, lng], 15);
    }
  }, [lat, lng, venueName]);

  return (
    <div className="relative isolate z-0 w-full h-40 sm:h-44 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 dark:[&_.leaflet-tile-pane]:brightness-[0.82] dark:[&_.leaflet-tile-pane]:contrast-[1.08] dark:[&_.leaflet-tile-pane]:saturate-[0.85]"
      />
    </div>
  );
}
