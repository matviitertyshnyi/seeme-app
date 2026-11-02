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

    // 1. Render distance radius circle around user in SeeMe Purple/Indigo
    L.circle([userLat, userLng], {
      radius: radiusKm * 1000,
      color: '#4F46E5',
      weight: 2,
      opacity: 0.65,
      fillColor: '#4F46E5',
      fillOpacity: 0.06,
      dashArray: '6 6',
    }).addTo(layerGroup);

    // 2. Render User "YOU" radar marker
    const userIcon = L.divIcon({
      className: 'lobby-user-marker-wrapper',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px;">
          <span style="position:absolute;width:40px;height:40px;border-radius:9999px;background:rgba(79,70,229,0.18);border:2px solid rgba(79,70,229,0.35);"></span>
          <div style="position:relative;z-index:2;padding:3px 8px;border-radius:9999px;background:#0F172A;color:#FFFFFF;font-size:10px;font-weight:800;letter-spacing:0.06em;border:2px solid #FFFFFF;box-shadow:0 6px 16px rgba(0,0,0,0.25);">
            YOU
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    L.marker([userLat, userLng], { icon: userIcon, zIndexOffset: 200 }).addTo(
      layerGroup
    );

    // 3. Render status-color-coded pill markers
    lobbies.forEach((lobby) => {
      const isSelected = selectedPreviewLobby?.id === lobby.id;
      const pillText = `${lobby.mapPinLabel} ${lobby.participants.length}/${lobby.maxParticipants}`;

      const statusDotHex =
        lobby.computedStatus === 'LIVE'
          ? '#10B981'
          : lobby.computedStatus === 'UPCOMING'
          ? '#F59E0B'
          : '#F43F5E';

      const borderHex = isSelected ? '#4F46E5' : statusDotHex;

      const bgStyle = isSelected
        ? 'background:#4F46E5;color:#FFFFFF;border:2px solid #FFFFFF;transform:scale(1.08);'
        : `background:#FFFFFF;color:#0F172A;border:2px solid ${borderHex};`;

      const pillIcon = L.divIcon({
        className: 'lobby-pill-marker-wrapper',
        html: `
          <div style="display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;">
            <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:9999px;font-size:11px;font-weight:800;letter-spacing:0.04em;white-space:nowrap;box-shadow:0 10px 24px rgba(15,23,42,0.18);transition:all 0.18s ease;${bgStyle}">
              <span style="width:8px;height:8px;border-radius:9999px;background:${statusDotHex};display:inline-block;"></span>
              <span>${pillText}</span>
            </div>
            <div style="width:8px;height:8px;background:${borderHex};transform:rotate(45deg);margin-top:-4px;border-right:1px solid #fff;border-bottom:1px solid #fff;"></div>
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
    <div className="relative isolate z-0 w-full h-[calc(100vh-240px)] min-h-[460px] max-h-[680px] rounded-[26px] overflow-hidden bg-white dark:bg-slate-900 shadow-ambient border border-slate-200 dark:border-slate-800">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top-Left Radar Status + Color Legend */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-ambient border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs font-extrabold text-slate-900 dark:text-slate-100">
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
          className="min-h-[44px] bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-md px-4 py-2 rounded-full shadow-ambient border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-100 transition-all"
        >
          <LocateFixed className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Center
        </button>
      </div>

      {/* Bottom Selected Meetup Preview Card */}
      {selectedPreviewLobby && (
        <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-4 md:w-[420px] z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[24px] p-4 shadow-ambient-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <img
              src={selectedPreviewLobby.coverImage}
              alt={selectedPreviewLobby.title}
              className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-slate-100 dark:bg-slate-800"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <StatusBadge
                  status={selectedPreviewLobby.computedStatus}
                  timeLabel={selectedPreviewLobby.startTimeBadge}
                  variant="subtle"
                />
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                  <Navigation className="w-3 h-3" />
                  {selectedPreviewLobby.distanceLabel}
                </span>
              </div>

              <h4
                onClick={() => onSelectLobby(selectedPreviewLobby)}
                className="mt-1 text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {selectedPreviewLobby.title}
              </h4>

              <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{selectedPreviewLobby.venueName}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
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
                className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </a>

              {selectedPreviewLobby.participants.some(
                (p) => p.id === activeUser.id
              ) ? (
                <button
                  type="button"
                  onClick={() => onSelectLobby(selectedPreviewLobby)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Open Chat
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => onQuickJoin(selectedPreviewLobby, e)}
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm"
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
