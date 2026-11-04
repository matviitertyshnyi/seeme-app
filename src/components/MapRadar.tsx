'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  ExternalLink,
  MessageCircle,
  UserPlus,
  LocateFixed,
} from 'lucide-react';
import { LobbyWithDistance, UserPersona } from '@/types/lobby';
import { SeatBubbles } from '@/components/SeatBubbles';
import { StatusBadge } from '@/components/StatusBadge';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface MapRadarProps {
  lobbies: LobbyWithDistance[];
  userLat: number;
  userLng: number;
  radiusKm: number;
  activeUser: UserPersona;
  onSelectLobby: (lobby: LobbyWithDistance) => void;
  onQuickJoin: (lobby: LobbyWithDistance, e: React.MouseEvent) => void;
}

export default function MapRadar({
  lobbies,
  userLat,
  userLng,
  radiusKm,
  activeUser,
  onSelectLobby,
  onQuickJoin,
}: MapRadarProps) {
  if (typeof window === 'undefined') {
    return null;
  }

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [hoveredLobbyId, setHoveredLobbyId] = useState<string | null>(
    lobbies[0]?.id || null
  );

  const selectedPreviewLobby =
    lobbies.find((l) => l.id === hoveredLobbyId) || lobbies[0] || null;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLat, userLng],
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Render pulsing concentric radar circles around user in warm orange/amber
    const rings = [
      { radius: radiusKm * 1000, color: '#EA580C', opacity: 0.65, fillOpacity: 0.05, dash: '6 6' },
      { radius: radiusKm * 600, color: '#EA580C', opacity: 0.45, fillOpacity: 0.03, dash: '4 4' },
      { radius: radiusKm * 250, color: '#F59E0B', opacity: 0.35, fillOpacity: 0.02, dash: '2 4' },
    ];
    rings.forEach((ring) => {
      L.circle([userLat, userLng], {
        radius: ring.radius,
        color: ring.color,
        weight: 1.5,
        opacity: ring.opacity,
        fillColor: ring.color,
        fillOpacity: ring.fillOpacity,
        dashArray: ring.dash,
      }).addTo(layerGroup);
    });

    // 2. Render User "YOU" radar marker with warm styling
    const userIcon = L.divIcon({
      className: 'lobby-user-marker-wrapper',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:48px;height:48px;">
          <span style="position:absolute;width:44px;height:44px;border-radius:9999px;background:rgba(234,88,12,0.18);border:2px solid rgba(234,88,12,0.35);"></span>
          <span style="position:absolute;width:32px;height:32px;border-radius:9999px;background:rgba(245,158,11,0.25);"></span>
          <div style="position:relative;z-index:2;padding:3px 8px;border-radius:9999px;background:#EA580C;color:#FFFFFF;font-size:10px;font-weight:800;letter-spacing:0.06em;border:2px solid #FFFFFF;box-shadow:0 6px 16px rgba(234,88,12,0.35);">
            YOU
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 200 }).addTo(
      layerGroup
    );

    // 3. Render status-color-coded pill markers
    lobbies.forEach((lobby) => {
      const isSelected = selectedPreviewLobby?.id === lobby.id;
      const statusDotHex =
        lobby.computedStatus === 'LIVE'
          ? '#10B981'
          : lobby.computedStatus === 'UPCOMING'
          ? '#F59E0B'
          : '#F43F5E';

      const borderHex = isSelected ? '#EA580C' : statusDotHex;

      const bgStyle = isSelected
        ? 'background:#EA580C;color:#FFFFFF;border:2px solid #FFFFFF;box-shadow:0 12px 28px rgba(234,88,12,0.35);transform:scale(1.08);'
        : `background:#FFFFFF;color:#0F172A;border:2px solid ${borderHex};box-shadow:0 8px 20px rgba(15,23,42,0.14);`;

      const pillIcon = L.divIcon({
        className: 'lobby-pill-marker-wrapper',
        html: `
          <div style="display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;">
            <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:9999px;font-size:11px;font-weight:800;letter-spacing:0.04em;white-space:nowrap;transition:all 0.18s ease;${bgStyle}">
              <span style="width:7px;height:7px;border-radius:9999px;background:${statusDotHex};display:inline-block;flex-shrink:0;"></span>
              <span>${escapeHtml(lobby.mapPinLabel || '')}</span>
              <span style="opacity:0.85;font-weight:600;font-size:10px;padding-left:2px;border-left:1px solid currentColor;">${lobby.participants.length}/${lobby.maxParticipants}</span>
            </div>
            <div style="width:7px;height:7px;background:${isSelected ? '#EA580C' : '#FFFFFF'};transform:rotate(45deg);margin-top:-4px;border-right:2px solid ${borderHex};border-bottom:2px solid ${borderHex};"></div>
          </div>
        `,
        iconSize: [110, 38],
        iconAnchor: [55, 34],
      });

      const marker = L.marker([lobby.lat, lobby.lng], {
        icon: pillIcon,
        zIndexOffset: isSelected ? 1000 : 500,
      }).addTo(layerGroup);

      marker.on('click', () => {
        setHoveredLobbyId(lobby.id);
        onSelectLobby(lobby);
      });

      marker.on('mouseover', () => {
        setHoveredLobbyId(lobby.id);
      });
    });
  }, [
    lobbies,
    userLat,
    userLng,
    radiusKm,
    activeUser.id,
    selectedPreviewLobby?.id,
    onSelectLobby,
  ]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([userLat, userLng], 14, { duration: 0.6 });
    }
  };

  return (
    /* CRITICAL: isolate + z-0 creates a strict stacking context so Leaflet panes and internal overlays NEVER bleed over modals */
    <div className="relative isolate z-0 w-full h-[calc(100dvh-175px)] min-h-[520px] rounded-[26px] overflow-hidden bg-white dark:bg-[#141210] shadow-ambient dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_12px_40px_rgba(0,0,0,0.6)] border border-stone-200 dark:border-stone-800">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-md dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.4)] border border-stone-200 dark:border-stone-700/80 flex items-center gap-3 text-xs font-extrabold text-stone-900 dark:text-stone-100">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Live
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Upcoming
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Finished
          </span>
        </div>

        <button
          type="button"
          onClick={handleRecenter}
          className="min-h-[44px] bg-white/95 dark:bg-[#1C1917]/95 hover:bg-white dark:hover:bg-stone-800 backdrop-blur-md px-4 py-2 rounded-full shadow-md dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.4)] border border-stone-200 dark:border-stone-700/80 hover:border-orange-500/50 dark:hover:border-orange-500/60 dark:hover:shadow-[0_0_12px_rgba(234,88,12,0.25)] inline-flex items-center gap-1.5 text-xs font-extrabold text-stone-900 dark:text-stone-100 transition-all cursor-pointer"
        >
          <LocateFixed className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          Center
        </button>
      </div>

      {selectedPreviewLobby && (
        <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-4 md:w-[420px] z-[1000] bg-white/95 dark:bg-[#1C1917]/95 backdrop-blur-md rounded-[24px] p-4 shadow-ambient-lg dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(234,88,12,0.12)] border border-stone-200 dark:border-stone-700/80">
          <div className="flex items-start gap-3">
            <img
              src={selectedPreviewLobby.coverImage}
              alt={selectedPreviewLobby.title}
              className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-stone-100 dark:bg-stone-800"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusBadge
                  status={selectedPreviewLobby.computedStatus}
                  timeLabel={selectedPreviewLobby.startTimeBadge}
                  variant="subtle"
                />
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-orange-600 dark:text-orange-400">
                  <Navigation className="w-3 h-3" />
                  {selectedPreviewLobby.distanceLabel}
                </span>
              </div>

              <h4
                onClick={() => onSelectLobby(selectedPreviewLobby)}
                className="mt-1 text-sm sm:text-base font-extrabold text-stone-900 dark:text-white truncate cursor-pointer hover:text-orange-600 dark:hover:text-orange-400"
              >
                {selectedPreviewLobby.title}
              </h4>

              <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300 truncate">
                <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{selectedPreviewLobby.venueName}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2">
            <SeatBubbles
              participants={selectedPreviewLobby.participants}
              maxParticipants={selectedPreviewLobby.maxParticipants}
              hostId={selectedPreviewLobby.hostId}
              activeUserId={activeUser.id}
              showSkillBadges={false}
            />

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selectedPreviewLobby.lat},${selectedPreviewLobby.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
                aria-label="Open in Google Maps"
                className="w-11 h-11 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center transition-colors border border-stone-200/60 dark:border-stone-700"
              >
                <ExternalLink className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </a>

              {selectedPreviewLobby.participants.some(
                (p) => p.id === activeUser.id
              ) ? (
                <button
                  type="button"
                  onClick={() => onSelectLobby(selectedPreviewLobby)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-[0_2px_12px_rgba(16,185,129,0.35)] border border-emerald-400/30 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Open Chat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => onQuickJoin(selectedPreviewLobby, e)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-extrabold shadow-[0_2px_14px_rgba(234,88,12,0.4)] border border-orange-400/30 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {selectedPreviewLobby.joinMode === 'OPEN' ? 'Join' : 'Request'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
