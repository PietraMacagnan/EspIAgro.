import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngBounds, type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import http from "@/services/http";
import "./MapaPage.css";

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

type MapaResponse = {
  resumo: MapaResumo;
  propriedades: GeoJsonFeatureCollection;
  talhoes: GeoJsonFeatureCollection;
  monitoramentos: GeoJsonFeatureCollection;
};

type BaseLayer = "mapa" | "satelite";

type FilterOption = {
  value: string;
  label: string;
};

type MapDetailTone = "property" | "field" | "collection";

type MapDetailItem = {
  label: string;
  value: string;
};

type MapDetail = {
  tone: MapDetailTone;
  eyebrow: string;
  title: string;
  description: string;
  details: MapDetailItem[];
  actionLabel?: string;
  actionPath?: string;
};

const DEFAULT_MAP_CENTER: LatLngExpression = [-15.6014, -56.0979];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function getTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value);
  }

  return "";
}

function getOptionValue(value: unknown): string {
  return normalizeText(getTextValue(value));
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
  const textValue = getTextValue(value);

  return escapeHtml(textValue || fallback);
}

function formatReadableValue(value: unknown, fallback = "Não informado"): string {
  const textValue = getTextValue(value);

  return textValue || fallback;
}

function formatPopupArea(value: unknown): string {
  const formattedValue = formatPopupValue(value);

  if (formattedValue === "-") {
    return "-";
  }

  return `${formattedValue} ha`;
}

function formatReadableArea(value: unknown): string {
  const formattedValue = formatReadableValue(value, "");

  if (!formattedValue) {
    return "Não informada";
  }

  return `${formattedValue} ha`;
}

function getFirstPolygonCenter(
  collection: GeoJsonFeatureCollection | undefined,
): LatLngExpression | null {
  const firstPolygon = collection?.features.find(
    (feature) => feature.geometry?.type === "Polygon",
  );

  if (!firstPolygon || firstPolygon.geometry.type !== "Polygon") {
    return null;
  }

  const firstRing = firstPolygon.geometry.coordinates?.[0];

  if (!firstRing || firstRing.length === 0) {
    return null;
  }

  const [longitude, latitude] = firstRing[0] ?? [];

  if (
    typeof latitude !== "number" ||
    Number.isNaN(latitude) ||
    typeof longitude !== "number" ||
    Number.isNaN(longitude)
  ) {
    return null;
  }

  return [latitude, longitude];
}

function getFirstPointCenter(
  collection: GeoJsonFeatureCollection | undefined,
): LatLngExpression | null {
  const firstPoint = collection?.features.find(
    (feature) => feature.geometry?.type === "Point",
  );

  if (!firstPoint || firstPoint.geometry.type !== "Point") {
    return null;
  }

  const [longitude, latitude] = firstPoint.geometry.coordinates ?? [];

  if (
    typeof latitude !== "number" ||
    Number.isNaN(latitude) ||
    typeof longitude !== "number" ||
    Number.isNaN(longitude)
  ) {
    return null;
  }

  return [latitude, longitude];
}

function getMapCenter(mapaData: MapaResponse | undefined): LatLngExpression {
  return (
    getFirstPolygonCenter(mapaData?.propriedades) ??
    getFirstPolygonCenter(mapaData?.talhoes) ??
    getFirstPointCenter(mapaData?.monitoramentos) ??
    DEFAULT_MAP_CENTER
  );
}

function addFeatureToBounds(
  bounds: LatLngBounds,
  feature: GeoJsonFeature,
): void {
  if (feature.geometry.type === "Point") {
    const [longitude, latitude] = feature.geometry.coordinates;

    if (
      typeof latitude === "number" &&
      !Number.isNaN(latitude) &&
      typeof longitude === "number" &&
      !Number.isNaN(longitude)
    ) {
      bounds.extend([latitude, longitude]);
    }

    return;
  }

  feature.geometry.coordinates.forEach((ring) => {
    ring.forEach(([longitude, latitude]) => {
      if (
        typeof latitude === "number" &&
        !Number.isNaN(latitude) &&
        typeof longitude === "number" &&
        !Number.isNaN(longitude)
      ) {
        bounds.extend([latitude, longitude]);
      }
    });
  });
}

function getBoundsFromMapData(
  mapaData: MapaResponse | undefined,
): LatLngBounds | null {
  if (!mapaData) {
    return null;
  }

  const bounds = L.latLngBounds([]);

  mapaData.propriedades.features.forEach((feature) => {
    addFeatureToBounds(bounds, feature);
  });

  mapaData.talhoes.features.forEach((feature) => {
    addFeatureToBounds(bounds, feature);
  });

  mapaData.monitoramentos.features.forEach((feature) => {
    addFeatureToBounds(bounds, feature);
  });

  return bounds.isValid() ? bounds : null;
}

function MapBoundsController({ mapaData }: { mapaData?: MapaResponse }) {
  const map = useMap();

  useEffect(() => {
    const bounds = getBoundsFromMapData(mapaData);

    if (!bounds) {
      return;
    }

    map.fitBounds(bounds, {
      padding: [24, 24],
      maxZoom: 15,
    });
  }, [map, mapaData]);

  return null;
}

function uniqueOptions(values: string[]): FilterOption[] {
  const uniqueValues = Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );

  return uniqueValues
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((value) => ({
      value: normalizeText(value),
      label: value,
    }));
}

function filterCollection(
  collection: GeoJsonFeatureCollection | undefined,
  predicate: (feature: GeoJsonFeature) => boolean,
): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection?.features.filter(predicate) ?? [],
  };
}

function getFeatureProperty(feature: GeoJsonFeature, key: string): unknown {
  return feature.properties?.[key];
}

function featureMatchesProperty(
  feature: GeoJsonFeature,
  selectedProperty: string,
): boolean {
  if (selectedProperty === "todas") {
    return true;
  }

  const propertyNames = [
    getOptionValue(getFeatureProperty(feature, "nome")),
    getOptionValue(getFeatureProperty(feature, "propriedade_nome")),
  ];

  return propertyNames.includes(selectedProperty);
}

function featureMatchesField(
  feature: GeoJsonFeature,
  selectedField: string,
): boolean {
  if (selectedField === "todos") {
    return true;
  }

  const fieldNames = [
    getOptionValue(getFeatureProperty(feature, "nome")),
    getOptionValue(getFeatureProperty(feature, "talhao_nome")),
  ];

  return fieldNames.includes(selectedField);
}

function formatCount(value: number | undefined): string {
  return String(value ?? 0).padStart(2, "0");
}

function createPropertyDetail(props: Record<string, unknown>): MapDetail {
  const title = formatReadableValue(props.nome, "Propriedade");
  const municipality = formatReadableValue(props.municipio);
  const state = formatReadableValue(props.uf);
  const area = formatReadableArea(props.area_total_ha);

  return {
    tone: "property",
    eyebrow: "Propriedade",
    title,
    description:
      "Área rural cadastrada no sistema para organizar o acompanhamento da lavoura.",
    details: [
      { label: "Município", value: municipality },
      { label: "UF", value: state },
      { label: "Área cadastrada", value: area },
    ],
    actionLabel: "Ver propriedades",
    actionPath: "/propriedades",
  };
}

function createFieldDetail(props: Record<string, unknown>): MapDetail {
  const title = formatReadableValue(props.nome, "Talhão");
  const propertyName = formatReadableValue(props.propriedade_nome);
  const cultivar = formatReadableValue(props.cultivar);
  const area = formatReadableArea(props.area_ha);

  return {
    tone: "field",
    eyebrow: "Talhão",
    title,
    description:
      "Área de cultivo acompanhada no mapa para facilitar a leitura da lavoura.",
    details: [
      { label: "Propriedade", value: propertyName },
      { label: "Cultivar", value: cultivar },
      { label: "Área do talhão", value: area },
    ],
    actionLabel: "Ver talhões",
    actionPath: "/talhoes",
  };
}

function createCollectionDetail(props: Record<string, unknown>): MapDetail {
  const id = formatReadableValue(props.id, "-");
  const fieldName = formatReadableValue(props.talhao_nome);
  const observationDate = formatReadableValue(props.data_observacao);
  const phenology = formatReadableValue(props.estadio_fenologico_display);
  const attention = formatReadableValue(props.nivel_atencao_display);

  return {
    tone: "collection",
    eyebrow: "Coleta de campo",
    title: `Coleta #${id}`,
    description:
      "Registro de campo com localização, fase da cultura e nível de atenção observado.",
    details: [
      { label: "Talhão", value: fieldName },
      { label: "Data da coleta", value: observationDate },
      { label: "Fase da cultura", value: phenology },
      { label: "Nível de atenção", value: attention },
    ],
    actionLabel: "Ver coletas",
    actionPath: "/monitoramentos",
  };
}

export default function MapaPage() {
  const [baseLayer, setBaseLayer] = useState<BaseLayer>("mapa");
  const [selectedProperty, setSelectedProperty] = useState("todas");
  const [selectedField, setSelectedField] = useState("todos");
  const [showProperties, setShowProperties] = useState(true);
  const [showFields, setShowFields] = useState(true);
  const [showCollections, setShowCollections] = useState(true);
  const [selectedMapDetail, setSelectedMapDetail] = useState<MapDetail | null>(
    null,
  );

  const {
    data: mapaData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<MapaResponse>({
    queryKey: ["mapa-lavoura"],
    queryFn: async () => {
      const response = await http.get<MapaResponse>("/propriedades/mapa/", {
        params: {
          ativa: true,
        },
      });

      return response.data;
    },
  });

  const propertyOptions = useMemo<FilterOption[]>(() => {
    const propertyNames =
      mapaData?.propriedades.features.map((feature) =>
        getTextValue(getFeatureProperty(feature, "nome")),
      ) ?? [];

    return uniqueOptions(propertyNames);
  }, [mapaData]);

  const fieldOptions = useMemo<FilterOption[]>(() => {
    const fieldNames = [
      ...(mapaData?.talhoes.features.map((feature) =>
        getTextValue(getFeatureProperty(feature, "nome")),
      ) ?? []),
      ...(mapaData?.monitoramentos.features.map((feature) =>
        getTextValue(getFeatureProperty(feature, "talhao_nome")),
      ) ?? []),
    ];

    return uniqueOptions(fieldNames);
  }, [mapaData]);

  const filteredMapData = useMemo<MapaResponse>(() => {
    const propriedades = filterCollection(mapaData?.propriedades, (feature) =>
      featureMatchesProperty(feature, selectedProperty),
    );

    const talhoes = filterCollection(mapaData?.talhoes, (feature) => {
      return (
        featureMatchesProperty(feature, selectedProperty) &&
        featureMatchesField(feature, selectedField)
      );
    });

    const monitoramentos = filterCollection(mapaData?.monitoramentos, (feature) =>
      featureMatchesField(feature, selectedField),
    );

    return {
      resumo: {
        total_propriedades: propriedades.features.length,
        total_propriedades_com_poligono: propriedades.features.length,
        total_talhoes: talhoes.features.length,
        total_talhoes_com_poligono: talhoes.features.length,
        total_monitoramentos: monitoramentos.features.length,
        total_monitoramentos_com_ponto: monitoramentos.features.length,
      },
      propriedades,
      talhoes,
      monitoramentos,
    };
  }, [mapaData, selectedField, selectedProperty]);

  const mapCenter = useMemo<LatLngExpression>(
    () => getMapCenter(filteredMapData),
    [filteredMapData],
  );

  const totalProperties = filteredMapData.resumo.total_propriedades_com_poligono;
  const totalFields = filteredMapData.resumo.total_talhoes_com_poligono;
  const totalCollections = filteredMapData.resumo.total_monitoramentos_com_ponto;
  const hasMapContent = totalProperties + totalFields + totalCollections > 0;

  function clearFilters(): void {
    setSelectedProperty("todas");
    setSelectedField("todos");
    setShowProperties(true);
    setShowFields(true);
    setShowCollections(true);
    setSelectedMapDetail(null);
  }

  return (
    <div className="espiagro-mapa-page">
      <section className="espiagro-mapa-hero">
        <div className="espiagro-mapa-hero-main">
          <span className="espiagro-mapa-kicker">Mapa da lavoura</span>

          <h1 className="espiagro-mapa-title">
            Visualize áreas, talhões e coletas de campo em uma única tela.
          </h1>

          <p className="espiagro-mapa-description">
            Acompanhe onde estão as propriedades, os talhões cadastrados e os
            pontos de coleta para entender melhor a distribuição da lavoura.
          </p>

          <div className="espiagro-mapa-band">
            {isFetching ? "Atualizando mapa..." : "Mapa pronto para consulta"} •{" "}
            {formatCount(totalCollections)} coletas com localização
          </div>

          <div className="espiagro-mapa-actions">
            <NavLink to="/monitoramentos" className="espiagro-btn espiagro-btn-primary">
              Registrar nova coleta
            </NavLink>

            <button
              type="button"
              className="espiagro-btn espiagro-btn-secondary"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
            >
              {isFetching ? "Atualizando..." : "Atualizar mapa"}
            </button>
          </div>
        </div>

        <div className="espiagro-mapa-hero-side">
          <div className="espiagro-mini-card">
            <span className="espiagro-mini-label">Propriedades</span>
            <strong>{formatCount(totalProperties)} no mapa</strong>
          </div>

          <div className="espiagro-mini-card">
            <span className="espiagro-mini-label">Talhões</span>
            <strong>{formatCount(totalFields)} visualizados</strong>
          </div>

          <div className="espiagro-mini-card">
            <span className="espiagro-mini-label">Coletas</span>
            <strong>{formatCount(totalCollections)} com localização</strong>
          </div>
        </div>
      </section>

      {isError ? (
        <section className="espiagro-state-card">
          <span className="espiagro-panel-kicker">Mapa indisponível</span>
          <h2>Não foi possível carregar o mapa agora</h2>
          <p>
            Verifique sua conexão e tente novamente. Se o problema continuar,
            entre novamente no app.
          </p>

          <div className="espiagro-state-actions">
            <button
              type="button"
              className="espiagro-btn espiagro-btn-retry"
              onClick={() => {
                void refetch();
              }}
            >
              Tentar novamente
            </button>
          </div>
        </section>
      ) : null}

      <section className="espiagro-mapa-controls-card">
        <div className="espiagro-mapa-controls-header">
          <div>
            <span className="espiagro-panel-kicker">Visualização</span>
            <h3>Escolha o que deseja ver no mapa</h3>
            <p>
              Use os filtros para focar em uma propriedade, um talhão ou nos
              pontos de coleta registrados.
            </p>
          </div>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-ghost"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        </div>

        <div className="espiagro-mapa-filter-grid">
          <label className="espiagro-field">
            <span>Propriedade</span>
            <select
              value={selectedProperty}
              onChange={(event) => setSelectedProperty(event.target.value)}
            >
              <option value="todas">Todas as propriedades</option>
              {propertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="espiagro-field">
            <span>Talhão</span>
            <select
              value={selectedField}
              onChange={(event) => setSelectedField(event.target.value)}
            >
              <option value="todos">Todos os talhões</option>
              {fieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="espiagro-mapa-layer-actions" aria-label="Tipo de mapa">
            <button
              type="button"
              className={`espiagro-layer-button ${
                baseLayer === "mapa" ? "active" : ""
              }`}
              onClick={() => setBaseLayer("mapa")}
            >
              Mapa
            </button>

            <button
              type="button"
              className={`espiagro-layer-button ${
                baseLayer === "satelite" ? "active" : ""
              }`}
              onClick={() => setBaseLayer("satelite")}
            >
              Satélite
            </button>
          </div>
        </div>

        <div className="espiagro-mapa-checks">
          <label>
            <input
              type="checkbox"
              checked={showProperties}
              onChange={(event) => setShowProperties(event.target.checked)}
            />
            <span>Propriedades</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={showFields}
              onChange={(event) => setShowFields(event.target.checked)}
            />
            <span>Talhões</span>
          </label>

          <label>
            <input
              type="checkbox"
              checked={showCollections}
              onChange={(event) => setShowCollections(event.target.checked)}
            />
            <span>Coletas de campo</span>
          </label>
        </div>
      </section>

      <section className="espiagro-mapa-card">
        <div className="espiagro-mapa-card-header">
          <div>
            <span className="espiagro-panel-kicker">Mapa interativo</span>
            <h3>Toque em uma área ou ponto para ver detalhes</h3>
          </div>

          <div className="espiagro-mapa-legend">
            <span>
              <i className="legend-property" /> Propriedades
            </span>
            <span>
              <i className="legend-field" /> Talhões
            </span>
            <span>
              <i className="legend-collection" /> Coletas
            </span>
          </div>
        </div>

        <div className="espiagro-mapa-frame">
          {isLoading || isFetching ? (
            <div className="espiagro-mapa-loading">
              Atualizando informações do mapa...
            </div>
          ) : null}

          {!isLoading && !hasMapContent ? (
            <div className="espiagro-mapa-empty">
              <span className="espiagro-panel-kicker">Sem pontos no mapa</span>
              <h3>Nenhuma área com localização foi encontrada</h3>
              <p>
                Cadastre propriedades, talhões ou coletas com localização para
                visualizar a lavoura no mapa.
              </p>

              <NavLink to="/monitoramentos" className="espiagro-btn espiagro-btn-primary">
                Registrar coleta
              </NavLink>
            </div>
          ) : null}

          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom
            className="espiagro-mapa-leaflet"
          >
            <MapBoundsController mapaData={filteredMapData} />

            {baseLayer === "mapa" ? (
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            ) : (
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}

            {showProperties && filteredMapData.propriedades.features.length ? (
              <GeoJSON
                key={`propriedades-${selectedProperty}-${selectedField}`}
                data={filteredMapData.propriedades as never}
                style={() => ({
                  color: "#1f6b45",
                  weight: 3,
                  fillColor: "#9dcf4f",
                  fillOpacity: 0.13,
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

                  layer.on("click", () => {
                    setSelectedMapDetail(createPropertyDetail(props));
                  });
                }}
              />
            ) : null}

            {showFields && filteredMapData.talhoes.features.length ? (
              <GeoJSON
                key={`talhoes-${selectedProperty}-${selectedField}`}
                data={filteredMapData.talhoes as never}
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

                  layer.on("click", () => {
                    setSelectedMapDetail(createFieldDetail(props));
                  });
                }}
              />
            ) : null}

            {showCollections && filteredMapData.monitoramentos.features.length ? (
              <GeoJSON
                key={`coletas-${selectedProperty}-${selectedField}`}
                data={filteredMapData.monitoramentos as never}
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
                      <p>Fase da cultura: ${formatPopupValue(
                        props.estadio_fenologico_display,
                      )}</p>
                      <p>Atenção: ${formatPopupValue(
                        props.nivel_atencao_display,
                      )}</p>
                    </div>
                  `);

                  layer.on("click", () => {
                    setSelectedMapDetail(createCollectionDetail(props));
                  });
                }}
              />
            ) : null}
          </MapContainer>
        </div>

        {selectedMapDetail ? (
          <aside
            className={`espiagro-mapa-detail-sheet ${selectedMapDetail.tone}`}
            aria-label="Detalhes do item selecionado no mapa"
          >
            <div className="espiagro-mapa-detail-handle" aria-hidden="true" />

            <div className="espiagro-mapa-detail-header">
              <div>
                <span>{selectedMapDetail.eyebrow}</span>
                <h3>{selectedMapDetail.title}</h3>
                <p>{selectedMapDetail.description}</p>
              </div>

              <button
                type="button"
                className="espiagro-mapa-detail-close"
                onClick={() => setSelectedMapDetail(null)}
                aria-label="Fechar detalhes do mapa"
              >
                ×
              </button>
            </div>

            <div className="espiagro-mapa-detail-grid">
              {selectedMapDetail.details.map((item) => (
                <div key={item.label} className="espiagro-mapa-detail-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            {selectedMapDetail.actionPath && selectedMapDetail.actionLabel ? (
              <NavLink
                to={selectedMapDetail.actionPath}
                className="espiagro-mapa-detail-action"
              >
                {selectedMapDetail.actionLabel}
              </NavLink>
            ) : null}
          </aside>
        ) : null}
      </section>
    </div>
  );
}
