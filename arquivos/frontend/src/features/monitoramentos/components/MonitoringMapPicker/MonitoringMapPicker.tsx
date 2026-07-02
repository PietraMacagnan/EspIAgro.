import { useEffect } from "react";
import type { LatLngExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { DEFAULT_MAP_ZOOM } from "../../constants/monitoramento.constants";
import type { MapPoint } from "../../types/monitoramento.types";

type MonitoringMapPickerProps = {
  point: MapPoint;
  interactionEnabled: boolean;
  isGettingLocation: boolean;
  onEnableInteraction: () => void;
  onDisableInteraction: () => void;
  onUseCurrentLocation: () => void;
  onSelectPoint: (point: MapPoint) => void;
};

function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [map]);

  return null;
}

function MapViewportController({ point }: { point: MapPoint }) {
  const map = useMap();

  useEffect(() => {
    map.setView(point as LatLngExpression, map.getZoom(), { animate: true });
  }, [map, point]);

  return null;
}

function MapClickHandler({
  enabled,
  onSelectPoint,
}: {
  enabled: boolean;
  onSelectPoint: (point: MapPoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onSelectPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

export default function MonitoringMapPicker({
  point,
  interactionEnabled,
  isGettingLocation,
  onEnableInteraction,
  onDisableInteraction,
  onUseCurrentLocation,
  onSelectPoint,
}: MonitoringMapPickerProps) {
  return (
    <div className="espiagro-field espiagro-field-full">
      <label>Local da coleta no mapa</label>

      <div className="espiagro-map-card">
        <div className="espiagro-map-toolbar">
          <button
            type="button"
            className="espiagro-btn espiagro-btn-primary"
            onClick={onEnableInteraction}
            disabled={interactionEnabled}
          >
            Ativar seleção no mapa
          </button>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-ghost"
            onClick={onDisableInteraction}
            disabled={!interactionEnabled}
          >
            Pausar seleção
          </button>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-ghost"
            onClick={onUseCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation
              ? "Buscando localização..."
              : "Usar localização atual"}
          </button>
        </div>

        <div className="espiagro-map-status" aria-live="polite">
          {interactionEnabled
            ? "Seleção no mapa ativa. Toque no mapa para marcar o ponto da coleta."
            : "Seleção no mapa pausada. Ative novamente para escolher outro ponto."}
        </div>

        <div className="espiagro-map-shell">
          <MapContainer
            center={point as LatLngExpression}
            zoom={DEFAULT_MAP_ZOOM}
            scrollWheelZoom
            className="espiagro-draw-map"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapInvalidateSize />
            <MapViewportController point={point} />
            <MapClickHandler
              enabled={interactionEnabled}
              onSelectPoint={onSelectPoint}
            />

            <Marker position={point}>
              <Popup>Local selecionado para a coleta</Popup>
            </Marker>
          </MapContainer>
        </div>

        <div className="espiagro-map-helper">
          <p>
            Toque no mapa para marcar o ponto da coleta ou use a localização
            atual do aparelho.
          </p>
        </div>
      </div>
    </div>
  );
}