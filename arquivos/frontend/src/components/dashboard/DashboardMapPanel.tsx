import { useMemo } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type GeoJsonGeometry =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "Point";
      coordinates: number[];
    };

type GeoJsonFeatureProperties = Record<string, unknown>;

type GeoJsonFeature = {
  type: "Feature";
  geometry: GeoJsonGeometry;
  properties: GeoJsonFeatureProperties;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type MapaResumo = {
  total_propriedades: number;
  total_propriedades_com_poligono: number;
  total_talhoes: number;
  total_talhoes_com_poligono: number;
  total_monitoramentos: number;
  total_monitoramentos_com_ponto: number;
};

export type MapaResponse = {
  resumo: MapaResumo;
  propriedades: GeoJsonFeatureCollection;
  talhoes: GeoJsonFeatureCollection;
  monitoramentos: GeoJsonFeatureCollection;
};

type DashboardMapPanelProps = {
  mapaData?: MapaResponse;
  isLoading: boolean;
  isFetching: boolean;
};

const DEFAULT_MAP_CENTER: LatLngExpression = [-15.6014, -56.0979];

function getFeatureCollectionCenter(
  collection: GeoJsonFeatureCollection | undefined,
): LatLngExpression {
  const firstPolygon = collection?.features.find(
    (feature) => feature.geometry?.type === "Polygon",
  );

  if (!firstPolygon || firstPolygon.geometry.type !== "Polygon") {
    return DEFAULT_MAP_CENTER;
  }

  const firstRing = firstPolygon.geometry.coordinates?.[0];

  if (!firstRing || firstRing.length === 0) {
    return DEFAULT_MAP_CENTER;
  }

  const [longitude, latitude] = firstRing[0] ?? [];

  if (
    typeof latitude !== "number" ||
    Number.isNaN(latitude) ||
    typeof longitude !== "number" ||
    Number.isNaN(longitude)
  ) {
    return DEFAULT_MAP_CENTER;
  }

  return [latitude, longitude];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPopupValue(value: unknown, fallback = "-"): string {
  if (typeof value === "string") {
    const cleanValue = value.trim();

    return escapeHtml(cleanValue || fallback);
  }

  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return escapeHtml(fallback);
    }

    return escapeHtml(String(value));
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  return escapeHtml(fallback);
}

function formatPopupArea(value: unknown): string {
  const formattedValue = formatPopupValue(value);

  if (formattedValue === "-") {
    return "-";
  }

  return `${formattedValue} ha`;
}

export default function DashboardMapPanel({
  mapaData,
  isLoading,
  isFetching,
}: DashboardMapPanelProps) {
  const mapCenter = useMemo<LatLngExpression>(() => {
    if (mapaData?.propriedades?.features?.length) {
      return getFeatureCollectionCenter(mapaData.propriedades);
    }

    if (mapaData?.talhoes?.features?.length) {
      return getFeatureCollectionCenter(mapaData.talhoes);
    }

    return DEFAULT_MAP_CENTER;
  }, [mapaData]);

  return (
    <section className="espiagro-section-card">
      <div className="espiagro-section-header">
        <div>
          <span className="espiagro-panel-kicker">Mapa da lavoura</span>

          <h3>Áreas, talhões e coletas no mapa</h3>

          <p>
            Visualize a localização das propriedades, dos talhões e dos registros
            de campo para acompanhar melhor a lavoura.
          </p>
        </div>

        <div className="espiagro-chip-row">
          <span className="espiagro-chip espiagro-chip-soft">
            Propriedades no mapa:{" "}
            {mapaData?.resumo?.total_propriedades_com_poligono ?? 0}
          </span>

          <span className="espiagro-chip espiagro-chip-soft">
            Talhões no mapa:{" "}
            {mapaData?.resumo?.total_talhoes_com_poligono ?? 0}
          </span>

          <span className="espiagro-chip espiagro-chip-soft">
            Coletas com localização:{" "}
            {mapaData?.resumo?.total_monitoramentos_com_ponto ?? 0}
          </span>
        </div>
      </div>

      <div className="espiagro-map-shell">
        <div className="espiagro-map-toolbar">
          <div className="espiagro-chip-row">
            <span className="espiagro-chip">
              <span className="espiagro-chip-dot" />
              Mapa interativo
            </span>

            <span className="espiagro-chip">Dados da lavoura</span>
          </div>
        </div>

        <div className="espiagro-map-frame">
          {isLoading || isFetching ? (
            <div className="espiagro-map-loading">
              Atualizando mapa da lavoura...
            </div>
          ) : null}

          <div className="espiagro-map-container">
            <MapContainer
              center={mapCenter}
              zoom={13}
              scrollWheelZoom
              className="espiagro-map-leaflet"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {mapaData?.propriedades?.features?.length ? (
                <GeoJSON
                  data={mapaData.propriedades as never}
                  style={() => ({
                    color: "#1f6b45",
                    weight: 3,
                    fillColor: "#9dcf4f",
                    fillOpacity: 0.12,
                  })}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as Record<string, unknown>;

                    layer.bindPopup(`
                      <div class="espiagro-map-popup">
                        <strong>${formatPopupValue(props.nome, "Propriedade")}</strong>
                        <p>Município: ${formatPopupValue(props.municipio)}</p>
                        <p>UF: ${formatPopupValue(props.uf)}</p>
                        <p>Área cadastrada: ${formatPopupArea(props.area_total_ha)}</p>
                      </div>
                    `);
                  }}
                />
              ) : null}

              {mapaData?.talhoes?.features?.length ? (
                <GeoJSON
                  data={mapaData.talhoes as never}
                  style={() => ({
                    color: "#246a8a",
                    weight: 2,
                    fillColor: "#246a8a",
                    fillOpacity: 0.1,
                  })}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as Record<string, unknown>;

                    layer.bindPopup(`
                      <div class="espiagro-map-popup">
                        <strong>${formatPopupValue(props.nome, "Talhão")}</strong>
                        <p>Propriedade: ${formatPopupValue(props.propriedade_nome)}</p>
                        <p>Cultivar: ${formatPopupValue(props.cultivar)}</p>
                        <p>Área do talhão: ${formatPopupArea(props.area_ha)}</p>
                      </div>
                    `);
                  }}
                />
              ) : null}

              {mapaData?.monitoramentos?.features?.length ? (
                <GeoJSON
                  data={mapaData.monitoramentos as never}
                  pointToLayer={(_, latlng) => {
                    return L.circleMarker(latlng, {
                      radius: 7,
                      fillColor: "#b9412f",
                      color: "#7e261d",
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.88,
                    });
                  }}
                  onEachFeature={(feature, layer) => {
                    const props = feature.properties as Record<string, unknown>;

                    layer.bindPopup(`
                      <div class="espiagro-map-popup">
                        <strong>Coleta de campo #${formatPopupValue(props.id)}</strong>
                        <p>Talhão: ${formatPopupValue(props.talhao_nome)}</p>
                        <p>Data: ${formatPopupValue(props.data_observacao)}</p>
                        <p>Estádio fenológico: ${formatPopupValue(
                          props.estadio_fenologico_display,
                        )}</p>
                        <p>Nível de atenção: ${formatPopupValue(
                          props.nivel_atencao_display,
                        )}</p>
                      </div>
                    `);
                  }}
                />
              ) : null}
            </MapContainer>
          </div>
        </div>
      </div>
    </section>
  );
}