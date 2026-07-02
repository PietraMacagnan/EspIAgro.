import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import http from "@/services/http";
import "./PropriedadesPage.css";

type GeoJsonPoint = {
  type: "Point";
  coordinates: [number, number];
};

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

type BBox = {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
};

type Propriedade = {
  id: number;
  usuario?: number | null;
  nome?: string;
  municipio?: string;
  uf?: string;
  area_total_ha?: number | null;
  poligono?: GeoJsonPolygon | null;
  centroide?: GeoJsonPoint | null;
  centroide_latitude?: number | null;
  centroide_longitude?: number | null;
  bbox?: BBox | null;
  descricao?: string;
  foto?: string | null;
  foto_url?: string | null;
  imagem?: string | null;
  imagem_url?: string | null;
  ativa?: boolean;
  created_at?: string;
  updated_at?: string;
};

type PropriedadePayload = {
  nome: string;
  municipio: string;
  uf: string;
  area_total_ha: string;
  descricao: string;
  poligono: string;
  ativa: boolean;
};

type SummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: "green" | "amber" | "red" | "blue";
};

type FiltroStatus = "" | "ativas" | "inativas";
type LatLngTuple = [number, number];

const initialFormState: PropriedadePayload = {
  nome: "",
  municipio: "",
  uf: "",
  area_total_ha: "",
  descricao: "",
  poligono: "",
  ativa: true,
};

const DEFAULT_MAP_CENTER: LatLngTuple = [-16.47, -54.635];
const DEFAULT_MAP_ZOOM = 12;

function formatNumber(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("pt-BR");
}

function normalizeText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeUf(value: string): string {
  return value.trim().toUpperCase().slice(0, 2);
}

function getPropriedadeTone(
  propriedade: Propriedade,
): "green" | "amber" | "red" | "blue" {
  if (propriedade.ativa === false) {
    return "red";
  }

  if (propriedade.poligono) {
    return "green";
  }

  if (propriedade.municipio || propriedade.uf) {
    return "amber";
  }

  return "blue";
}
function getPropriedadeImageSrc(propriedade: Propriedade): string {
  return (
    propriedade.foto_url ||
    propriedade.foto ||
    propriedade.imagem_url ||
    propriedade.imagem ||
    ""
  );
}

function getPropriedadeInitials(propriedade: Propriedade): string {
  const name = (propriedade.nome || `P ${propriedade.id}`).trim();
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}


function stringifyPolygon(value: GeoJsonPolygon | null | undefined): string {
  if (!value) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateGeoJsonPolygon(value: string): {
  valid: boolean;
  parsed: GeoJsonPolygon | null;
  error: string;
} {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      valid: true,
      parsed: null,
      error: "",
    };
  }

  let parsedUnknown: unknown;

  try {
    parsedUnknown = JSON.parse(trimmed);
  } catch {
    return {
      valid: false,
      parsed: null,
      error: "A área informada no campo avançado precisa estar em um formato válido.",
    };
  }

  if (
    !parsedUnknown ||
    typeof parsedUnknown !== "object" ||
    !("type" in parsedUnknown) ||
    !("coordinates" in parsedUnknown)
  ) {
    return {
      valid: false,
      parsed: null,
      error: "A área informada no campo avançado não está no formato esperado.",
    };
  }

  const parsed = parsedUnknown as GeoJsonPolygon;

  if (parsed.type !== "Polygon") {
    return {
      valid: false,
      parsed: null,
      error: "A área informada precisa representar uma área fechada.",
    };
  }

  if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
    return {
      valid: false,
      parsed: null,
      error: "A área precisa ter pontos suficientes para ser desenhada.",
    };
  }

  const outerRing = parsed.coordinates[0];

  if (!Array.isArray(outerRing) || outerRing.length < 4) {
    return {
      valid: false,
      parsed: null,
      error: "A área precisa ter pelo menos 3 pontos e voltar ao ponto inicial.",
    };
  }

  for (const point of outerRing) {
    if (
      !Array.isArray(point) ||
      point.length < 2 ||
      !isFiniteCoordinate(point[0]) ||
      !isFiniteCoordinate(point[1])
    ) {
      return {
        valid: false,
        parsed: null,
        error: "Cada ponto da área precisa ter latitude e longitude válidas.",
      };
    }
  }

  const first = outerRing[0];
  const last = outerRing[outerRing.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    return {
      valid: false,
      parsed: null,
      error:
        "A área precisa estar fechada. O primeiro e o último ponto devem coincidir.",
    };
  }

  return {
    valid: true,
    parsed,
    error: "",
  };
}

function getPolygonPreviewInfo(value: string): {
  points: number;
  hasPolygon: boolean;
  valid: boolean;
  error: string;
} {
  const validation = validateGeoJsonPolygon(value);

  if (!value.trim()) {
    return {
      points: 0,
      hasPolygon: false,
      valid: true,
      error: "",
    };
  }

  if (!validation.valid || !validation.parsed) {
    return {
      points: 0,
      hasPolygon: true,
      valid: false,
      error: validation.error,
    };
  }

  return {
    points: validation.parsed.coordinates[0]?.length ?? 0,
    hasPolygon: true,
    valid: true,
    error: "",
  };
}

function geoJsonPolygonToLatLngs(polygon: GeoJsonPolygon | null): LatLngTuple[] {
  if (!polygon?.coordinates?.[0]?.length) {
    return [];
  }

  return polygon.coordinates[0]
    .filter(
      (point): point is [number, number] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        isFiniteCoordinate(point[0]) &&
        isFiniteCoordinate(point[1]),
    )
    .map((point) => [point[1], point[0]]);
}

function latLngsToGeoJsonPolygon(points: LatLngTuple[]): GeoJsonPolygon | null {
  if (points.length < 3) {
    return null;
  }

  const ring: [number, number][] = points.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];

  if (!last || first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

function getPolygonCenter(points: LatLngTuple[]): LatLngTuple | null {
  if (!points.length) {
    return null;
  }

  const total = points.reduce(
    (acc, [lat, lng]) => {
      acc.lat += lat;
      acc.lng += lng;
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return [total.lat / points.length, total.lng / points.length];
}

function getBoundsFromPoints(
  points: LatLngTuple[],
): [[number, number], [number, number]] | null {
  if (!points.length) {
    return null;
  }

  let minLat = points[0][0];
  let maxLat = points[0][0];
  let minLng = points[0][1];
  let maxLng = points[0][1];

  for (const [lat, lng] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

type MapClickHandlerProps = {
  enabled: boolean;
  onAddPoint: (point: LatLngTuple) => void;
};

function MapClickHandler({ enabled, onAddPoint }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onAddPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

type MapViewportControllerProps = {
  points: LatLngTuple[];
  fallbackCenter: LatLngTuple;
};

function MapViewportController({
  points,
  fallbackCenter,
}: MapViewportControllerProps) {
  const map = useMap();

  useEffect(() => {
    const bounds = getBoundsFromPoints(points);

    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
      return;
    }

    map.setView(fallbackCenter, DEFAULT_MAP_ZOOM);
  }, [map, points, fallbackCenter]);

  return null;
}

function MapInvalidateSize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const runInvalidate = () => {
      window.setTimeout(() => {
        map.invalidateSize();
      }, 0);

      window.setTimeout(() => {
        map.invalidateSize();
      }, 150);

      window.setTimeout(() => {
        map.invalidateSize();
      }, 400);
    };

    runInvalidate();

    const resizeObserver = new ResizeObserver(() => {
      runInvalidate();
    });

    resizeObserver.observe(container);
    window.addEventListener("resize", runInvalidate);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", runInvalidate);
    };
  }, [map]);

  return null;
}

export default function PropriedadesPage() {
  const queryClient = useQueryClient();

  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("");
  const [busca, setBusca] = useState("");
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<PropriedadePayload>(initialFormState);
  const [editingItem, setEditingItem] = useState<Propriedade | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [drawPoints, setDrawPoints] = useState<LatLngTuple[]>([]);
  const [mapInteractionEnabled, setMapInteractionEnabled] = useState(true);
  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<Propriedade[]>({
    queryKey: ["propriedades-lista"],
    queryFn: async () => {
      const response = await http.get<Propriedade[]>("/propriedades/");
      return response.data;
    },
  });

  const propriedades = useMemo<Propriedade[]>(() => data ?? [], [data]);

  const propriedadesFiltradas = useMemo(() => {
    const buscaNormalizada = normalizeText(busca);

    return propriedades.filter((item) => {
      const matchStatus =
        statusFiltro === "ativas"
          ? item.ativa !== false
          : statusFiltro === "inativas"
            ? item.ativa === false
            : true;

      const textoBase = normalizeText(
        [
          item.nome,
          item.municipio,
          item.uf,
          item.descricao,
          item.area_total_ha != null ? String(item.area_total_ha) : "",
        ].join(" "),
      );

      const matchBusca = buscaNormalizada
        ? textoBase.includes(buscaNormalizada)
        : true;

      return matchStatus && matchBusca;
    });
  }, [propriedades, statusFiltro, busca]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const total = propriedades.length;
    const ativas = propriedades.filter((item) => item.ativa !== false).length;
    const comPoligono = propriedades.filter((item) => Boolean(item.poligono)).length;
    const comCentroide = propriedades.filter(
      (item) =>
        typeof item.centroide_latitude === "number" &&
        typeof item.centroide_longitude === "number",
    ).length;

    return [
      {
        title: "Propriedades",
        value: formatNumber(total),
        hint: "Cadastradas",
        tone: "blue",
      },
      {
        title: "Ativas",
        value: formatNumber(ativas),
        hint: "Disponíveis",
        tone: ativas > 0 ? "green" : "amber",
      },
      {
        title: "Com área no mapa",
        value: formatNumber(comPoligono),
        hint: "Visíveis no mapa",
        tone: comPoligono > 0 ? "green" : "amber",
      },
      {
        title: "Com ponto de referência",
        value: formatNumber(comCentroide),
        hint: "Localização calculada",
        tone: comCentroide > 0 ? "green" : "blue",
      },
    ];
  }, [propriedades]);

  const formTitle = editingItem ? "Editar propriedade" : "Nova propriedade";
  const formDescription = editingItem
    ? "Atualize as informações principais e a área da propriedade no mapa."
    : "Informe os dados principais e, se desejar, desenhe a área da propriedade no mapa.";

  const savedFormSnapshot = useMemo<PropriedadePayload>(() => {
    if (!editingItem) {
      return initialFormState;
    }

    return {
      nome: editingItem.nome ?? "",
      municipio: editingItem.municipio ?? "",
      uf: editingItem.uf ?? "",
      area_total_ha:
        editingItem.area_total_ha !== null &&
        editingItem.area_total_ha !== undefined
          ? String(editingItem.area_total_ha)
          : "",
      descricao: editingItem.descricao ?? "",
      poligono: stringifyPolygon(editingItem.poligono),
      ativa: editingItem.ativa !== false,
    };
  }, [editingItem]);

  const hasUnsavedFormChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(savedFormSnapshot);
  }, [formData, savedFormSnapshot]);

  const polygonPreview = useMemo(() => {
    return getPolygonPreviewInfo(formData.poligono);
  }, [formData.poligono]);

  const previewPolygon = useMemo(() => {
    const validation = validateGeoJsonPolygon(formData.poligono);
    return validation.valid ? validation.parsed : null;
  }, [formData.poligono]);

  const previewLatLngs = useMemo(() => {
    return geoJsonPolygonToLatLngs(previewPolygon);
  }, [previewPolygon]);

  const previewCenter = useMemo<LatLngTuple>(() => {
    return getPolygonCenter(previewLatLngs) ?? DEFAULT_MAP_CENTER;
  }, [previewLatLngs]);

  function resetForm(): void {
    setFormData(initialFormState);
    setEditingItem(null);
    setSubmitError("");
    setSubmitMessage("");
    setDrawPoints([]);
    setMapInteractionEnabled(true);
  }

  function fillForm(item: Propriedade): void {
    setEditingItem(item);
    setSubmitError("");
    setSubmitMessage("");

    const polygonString = stringifyPolygon(item.poligono);
    const latLngPoints = geoJsonPolygonToLatLngs(item.poligono ?? null);

    setFormData({
      nome: item.nome ?? "",
      municipio: item.municipio ?? "",
      uf: item.uf ?? "",
      area_total_ha:
        item.area_total_ha !== null && item.area_total_ha !== undefined
          ? String(item.area_total_ha)
          : "",
      descricao: item.descricao ?? "",
      poligono: polygonString,
      ativa: item.ativa !== false,
    });

    if (latLngPoints.length > 1) {
      const withoutClosingPoint = [...latLngPoints];
      const first = withoutClosingPoint[0];
      const last = withoutClosingPoint[withoutClosingPoint.length - 1];

      if (first && last && first[0] === last[0] && first[1] === last[1]) {
        withoutClosingPoint.pop();
      }

      setDrawPoints(withoutClosingPoint);
    } else {
      setDrawPoints([]);
    }

    setExpandedIds((current) =>
      current.includes(item.id) ? current : [item.id, ...current],
    );
    setMapInteractionEnabled(true);
    setIsPropertyFormOpen(true);
  }

  function openCreateForm(): void {
    resetForm();
    setIsPropertyFormOpen(true);
  }

  function closePropertyForm(): void {
    resetForm();
    setIsPropertyFormOpen(false);
  }


  function updateField<K extends keyof PropriedadePayload>(
    field: K,
    value: PropriedadePayload[K],
  ): void {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  const syncPolygonFromPoints = useCallback((points: LatLngTuple[]) => {
    const polygon = latLngsToGeoJsonPolygon(points);

    setFormData((current) => ({
      ...current,
      poligono: polygon ? JSON.stringify(polygon, null, 2) : "",
    }));
  }, []);

  function handleAddDrawPoint(point: LatLngTuple): void {
    setDrawPoints((current) => {
      const next = [...current, point];
      syncPolygonFromPoints(next);
      return next;
    });
  }

  function handleUndoLastPoint(): void {
    setDrawPoints((current) => {
      const next = current.slice(0, -1);
      syncPolygonFromPoints(next);
      return next;
    });
  }

  function handleClearDrawing(): void {
    setDrawPoints([]);
    setFormData((current) => ({
      ...current,
      poligono: "",
    }));
  }

  function buildPayload() {
    const nome = formData.nome.trim();
    const municipio = formData.municipio.trim();
    const uf = normalizeUf(formData.uf);
    const area =
      formData.area_total_ha.trim() === ""
        ? null
        : Number(formData.area_total_ha.replace(",", "."));

    if (!nome) {
      throw new Error("Informe o nome da propriedade.");
    }

    if (formData.area_total_ha.trim() !== "" && Number.isNaN(area)) {
      throw new Error("Informe uma área válida em hectares.");
    }

    const polygonValidation = validateGeoJsonPolygon(formData.poligono);

    if (!polygonValidation.valid) {
      throw new Error(polygonValidation.error);
    }

    return {
      nome,
      municipio,
      uf,
      area_total_ha: area,
      descricao: formData.descricao.trim(),
      poligono: polygonValidation.parsed,
      ativa: formData.ativa,
    };
  }

  async function invalidatePropriedades(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["propriedades-lista"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard-mapa"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard-monitoramentos"],
    });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const response = await http.post<Propriedade>("/propriedades/", payload);
      return response.data;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Propriedade cadastrada com sucesso.");
      resetForm();
      setIsPropertyFormOpen(false);
      await invalidatePropriedades();
    },
    onError: (error: unknown) => {
      console.error("Erro ao cadastrar propriedade:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível cadastrar a propriedade. Verifique os dados e tente novamente.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) {
        throw new Error("Nenhuma propriedade selecionada para edição.");
      }

      const payload = buildPayload();
      const response = await http.put<Propriedade>(
        `/propriedades/${editingItem.id}/`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Propriedade atualizada com sucesso.");
      resetForm();
      setIsPropertyFormOpen(false);
      await invalidatePropriedades();
    },
    onError: (error: unknown) => {
      console.error("Erro ao atualizar propriedade:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível atualizar a propriedade. Verifique os dados e tente novamente.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await http.patch<Propriedade>(`/propriedades/${id}/`, {
        ativa: false,
      });
      return response.data;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Propriedade arquivada com sucesso.");
      await invalidatePropriedades();
    },
    onError: (error: unknown) => {
      console.error("Erro ao arquivar propriedade:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível arquivar a propriedade agora.");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await http.patch<Propriedade>(`/propriedades/${id}/`, {
        ativa: true,
      });
      return response.data;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Propriedade reativada com sucesso.");
      await invalidatePropriedades();
    },
    onError: (error: unknown) => {
      console.error("Erro ao reativar propriedade:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível reativar a propriedade agora.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/propriedades/${id}/`);
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Propriedade excluída com sucesso.");
      resetForm();
      setIsPropertyFormOpen(false);
      await invalidatePropriedades();
    },
    onError: (error: unknown) => {
      console.error("Erro ao excluir propriedade:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível excluir a propriedade agora.");
    },
  });

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    reactivateMutation.isPending ||
    deleteMutation.isPending;

  function requestClosePropertyForm(): void {
    if (isSubmitting) {
      return;
    }

    if (hasUnsavedFormChanges) {
      const shouldClose = window.confirm(
        "Você tem informações preenchidas que ainda não foram salvas. Se fechar agora, esses dados serão perdidos. Deseja fechar mesmo assim?",
      );

      if (!shouldClose) {
        return;
      }
    }

    closePropertyForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    try {
      buildPayload();
    } catch (error) {
      setSubmitMessage("");
      setSubmitError(
        error instanceof Error ? error.message : "Revise os dados do formulário.",
      );
      return;
    }

    if (editingItem) {
      await updateMutation.mutateAsync();
      return;
    }

    await createMutation.mutateAsync();
  }

  async function handleArchive(id: number): Promise<void> {
    if (!window.confirm("Deseja arquivar esta propriedade? Ela sairá da lista de propriedades ativas.")) {
      return;
    }

    setSubmitError("");
    setSubmitMessage("");
    await archiveMutation.mutateAsync(id);
  }

  async function handleReactivate(id: number): Promise<void> {
    setSubmitError("");
    setSubmitMessage("");
    await reactivateMutation.mutateAsync(id);
  }

  async function handleDelete(id: number): Promise<void> {
    if (!window.confirm("Deseja excluir esta propriedade? Esta ação não pode ser desfeita.")) {
      return;
    }

    setSubmitError("");
    setSubmitMessage("");
    await deleteMutation.mutateAsync(id);
  }

  function toggleExpanded(id: number): void {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  }

  return (
      <div className="espiagro-propriedades-page">
        <section className="espiagro-propriedades-hero">
          <div className="espiagro-propriedades-hero-main">
            <span className="espiagro-propriedades-kicker">
              EspIAgro • Propriedades
            </span>

            <h1 className="espiagro-propriedades-title">
              Organize as propriedades acompanhadas pela plataforma
            </h1>

            <p className="espiagro-propriedades-description">
              Cadastre, edite e mantenha as propriedades rurais organizadas para apoiar os talhões, as coletas de campo e o mapa da lavoura.
            </p>

            <div className="espiagro-propriedades-band">
              {isFetching ? "Atualizando..." : "Dados atualizados"} •{" "}
              {propriedadesFiltradas.length} propriedade(s)
            </div>

            <div className="espiagro-propriedades-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-primary"
                onClick={openCreateForm}
              >
                Nova propriedade
              </button>

              <button
                type="button"
                className="espiagro-btn espiagro-btn-secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                {isFetching ? "Atualizando..." : "Atualizar lista"}
              </button>
            </div>
          </div>

          <div className="espiagro-propriedades-hero-side">
            <div className="espiagro-mini-card">
              <span className="espiagro-mini-label">Exibidas agora</span>
              <strong>{formatNumber(propriedadesFiltradas.length)}</strong>
            </div>

            <div className="espiagro-mini-card">
              <span className="espiagro-mini-label">Com área no mapa</span>
              <strong>
                {formatNumber(
                  propriedades.filter((item) => Boolean(item.poligono)).length,
                )}
              </strong>
            </div>

            <div className="espiagro-mini-card">
              <span className="espiagro-mini-label">Prontas para uso</span>
              <strong>Base rural organizada para talhões e coletas</strong>
            </div>
          </div>
        </section>

        <section className="espiagro-insight-grid">
          <article className="espiagro-insight-card">
            <h3>Informações da propriedade</h3>
            <p>Nome, localização, área e observações importantes em um só lugar.</p>
          </article>

          <article className="espiagro-insight-card">
            <h3>Área no mapa</h3>
            <p>Desenhe a área da fazenda para visualizar melhor talhões e coletas.</p>
          </article>

          <article className="espiagro-insight-card">
            <h3>Gestão simples</h3>
            <p>Edite, arquive, reative ou exclua registros apenas quando necessário.</p>
          </article>
        </section>

        <section className="espiagro-summary-grid">
          {summaryCards.map((card) => (
            <article
              key={card.title}
              className={`espiagro-summary-card espiagro-tone-${card.tone}`}
            >
              <h3>{card.title}</h3>
              <strong className="espiagro-summary-value">{card.value}</strong>
              <p>{card.hint}</p>
            </article>
          ))}
        </section>

        {isPropertyFormOpen ? (
          <div
            className="espiagro-form-sheet-overlay"
            role="presentation"
            onClick={requestClosePropertyForm}
          >
            <section
              className="espiagro-form-card espiagro-form-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="propriedades-form-sheet-title"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="espiagro-form-header">
              <div>
                <span className="espiagro-panel-kicker">Propriedade</span>
                <h3 id="propriedades-form-sheet-title">{formTitle}</h3>
                <p>{formDescription}</p>
              </div>

              <button
                type="button"
                className="espiagro-form-sheet-close"
                onClick={requestClosePropertyForm}
                disabled={isSubmitting}
                aria-label="Fechar formulário de propriedade"
              >
                ×
              </button>
            </div>

            {hasUnsavedFormChanges ? (
              <div className="espiagro-unsaved-alert" role="status">
                <strong>Alterações não salvas</strong>
                <span>
                  Se fechar este cadastro agora, as informações preenchidas serão perdidas.
                </span>
              </div>
            ) : null}

            <form onSubmit={(event) => void handleSubmit(event)}>
              <div className="espiagro-form-grid">
                <div className="espiagro-field">
                  <label htmlFor="nome">Nome da propriedade</label>
                  <input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(event) => updateField("nome", event.target.value)}
                    placeholder="Ex.: Fazenda Boa Esperança"
                  />
                </div>

                <div className="espiagro-field">
                  <label htmlFor="area_total_ha">Área total (ha)</label>
                  <input
                    id="area_total_ha"
                    type="text"
                    inputMode="decimal"
                    value={formData.area_total_ha}
                    onChange={(event) =>
                      updateField("area_total_ha", event.target.value)
                    }
                    placeholder="Ex.: 120.50"
                  />
                </div>

                <div className="espiagro-field">
                  <label htmlFor="municipio">Município</label>
                  <input
                    id="municipio"
                    type="text"
                    value={formData.municipio}
                    onChange={(event) =>
                      updateField("municipio", event.target.value)
                    }
                    placeholder="Ex.: Rondonópolis"
                  />
                </div>

                <div className="espiagro-field">
                  <label htmlFor="uf">UF</label>
                  <input
                    id="uf"
                    type="text"
                    maxLength={2}
                    value={formData.uf}
                    onChange={(event) => updateField("uf", event.target.value)}
                    placeholder="MT"
                  />
                </div>

                <div className="espiagro-field espiagro-field-full">
                  <label htmlFor="descricao">Observações</label>
                  <textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(event) =>
                      updateField("descricao", event.target.value)
                    }
                    placeholder="Descreva informações relevantes da propriedade."
                  />
                </div>

                <div className="espiagro-field espiagro-field-full">
                  <label>Área da propriedade no mapa</label>

                  <div className="espiagro-map-card">
                    <div className="espiagro-map-toolbar">
                      <button
                        type="button"
                        className="espiagro-btn espiagro-btn-primary"
                        onClick={() => setMapInteractionEnabled(true)}
                      >
                        Desenhar área
                      </button>

                      <button
                        type="button"
                        className="espiagro-btn espiagro-btn-ghost"
                        onClick={() => setMapInteractionEnabled(false)}
                      >
                        Pausar marcação
                      </button>

                      <button
                        type="button"
                        className="espiagro-btn espiagro-btn-ghost"
                        onClick={handleUndoLastPoint}
                        disabled={drawPoints.length === 0}
                      >
                        Remover último ponto
                      </button>

                      <button
                        type="button"
                        className="espiagro-btn espiagro-btn-ghost"
                        onClick={handleClearDrawing}
                        disabled={!formData.poligono && drawPoints.length === 0}
                      >
                        Limpar área
                      </button>
                    </div>

                    <div className="espiagro-map-shell">
                      <MapContainer
                        center={previewCenter as LatLngExpression}
                        zoom={DEFAULT_MAP_ZOOM}
                        scrollWheelZoom
                        className="espiagro-draw-map"
                      >
                        <TileLayer
                          attribution="&copy; OpenStreetMap contributors"
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapInvalidateSize />

                        <MapViewportController
                          points={previewLatLngs}
                          fallbackCenter={previewCenter}
                        />

                        <MapClickHandler
                          enabled={mapInteractionEnabled}
                          onAddPoint={handleAddDrawPoint}
                        />

                        {drawPoints.map((point, index) => (
                          <Marker
                            key={`${point[0]}-${point[1]}-${index}`}
                            position={point}
                          >
                            <Popup>Ponto {index + 1}</Popup>
                          </Marker>
                        ))}

                        {previewLatLngs.length >= 3 ? (
                          <Polygon positions={previewLatLngs} />
                        ) : null}

                        {previewLatLngs.length > 0 ? (
                          <Marker position={previewCenter}>
                            <Popup>Ponto central da área</Popup>
                          </Marker>
                        ) : null}
                      </MapContainer>
                    </div>

                    <div className="espiagro-map-helper">
                      <p>
                        Toque no mapa para marcar os pontos da área. Com 3 pontos ou mais, a área é montada automaticamente.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="espiagro-field espiagro-field-full">
                  <label htmlFor="poligono">Área em formato avançado</label>
                  <textarea
                    id="poligono"
                    className="espiagro-textarea-mono"
                    value={formData.poligono}
                    onChange={(event) =>
                      updateField("poligono", event.target.value)
                    }
                    placeholder={`{
  "type": "Polygon",
  "coordinates": [
    [
      [-54.6350, -16.4700],
      [-54.6340, -16.4700],
      [-54.6340, -16.4690],
      [-54.6350, -16.4690],
      [-54.6350, -16.4700]
    ]
  ]
}`}
                  />

                  <div className="espiagro-polygon-status">
                    {!polygonPreview.hasPolygon ? (
                      <span className="espiagro-polygon-chip espiagro-polygon-chip-neutral">
                        Sem área marcada no mapa
                      </span>
                    ) : null}

                    {polygonPreview.hasPolygon && polygonPreview.valid ? (
                      <>
                        <span className="espiagro-polygon-chip espiagro-polygon-chip-valid">
                          Área válida
                        </span>
                        <span className="espiagro-polygon-chip espiagro-polygon-chip-neutral">
                          Pontos marcados: {polygonPreview.points}
                        </span>
                      </>
                    ) : null}

                    {polygonPreview.hasPolygon && !polygonPreview.valid ? (
                      <span className="espiagro-polygon-chip espiagro-polygon-chip-invalid">
                        {polygonPreview.error}
                      </span>
                    ) : null}
                  </div>

                  <div className="espiagro-helper-box">
                    <strong>Como marcar a área</strong>
                    <p>
                      Você pode desenhar a área no mapa. Use o campo avançado apenas se já tiver as coordenadas prontas.
                    </p>
                  </div>
                </div>

                <div className="espiagro-field espiagro-field-full">
                  <label>Situação</label>
                  <div className="espiagro-switch-row">
                    <input
                      id="ativa"
                      type="checkbox"
                      checked={formData.ativa}
                      onChange={(event) =>
                        updateField("ativa", event.target.checked)
                      }
                    />
                    <label htmlFor="ativa">Propriedade ativa</label>
                  </div>
                </div>
              </div>

              {editingItem ? (
                <div className="espiagro-note-box">
                  <strong>Propriedade selecionada</strong>
                  <p>
                    {editingItem.nome || `Propriedade #${editingItem.id}`}
                    {editingItem.municipio ? ` • ${editingItem.municipio}` : ""}
                    {editingItem.uf ? `/${editingItem.uf}` : ""}
                  </p>
                </div>
              ) : null}

              {submitMessage ? (
                <div className="espiagro-feedback-message">{submitMessage}</div>
              ) : null}

              {submitError ? (
                <div className="espiagro-feedback-error">{submitError}</div>
              ) : null}

              <div className="espiagro-form-actions">
                <button
                  type="submit"
                  className="espiagro-btn espiagro-btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Salvando..."
                    : editingItem
                      ? "Salvar alterações"
                      : "Cadastrar propriedade"}
                </button>

                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Limpar campos
                </button>
              </div>
            </form>

            <div className="espiagro-note-box">
              <strong>Dica de uso</strong>
              <p>
                Propriedades com área marcada ajudam a visualizar melhor o mapa e organizar os talhões.
              </p>
            </div>
            </section>
          </div>
        ) : null}

        <section className="espiagro-main-grid espiagro-main-grid-single">
          <section className="espiagro-filter-card">
            <div className="espiagro-filter-header">
              <div>
                <span className="espiagro-panel-kicker">Histórico</span>
                <h3>Propriedades cadastradas</h3>
                <p>Use os filtros, abra os detalhes e mantenha cada propriedade organizada.</p>
              </div>

              <div>
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={() => {
                    setStatusFiltro("");
                    setBusca("");
                  }}
                  disabled={!statusFiltro && !busca.trim()}
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            <div className="espiagro-filter-fields">
              <div className="espiagro-field">
                <label htmlFor="buscaPropriedade">Buscar propriedade</label>
                <input
                  id="buscaPropriedade"
                  type="text"
                  placeholder="Nome, município ou UF..."
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>

              <div className="espiagro-field">
                <label htmlFor="statusFiltro">Situação</label>
                <select
                  id="statusFiltro"
                  value={statusFiltro}
                  onChange={(event) =>
                    setStatusFiltro(event.target.value as FiltroStatus)
                  }
                >
                  <option value="">Todas</option>
                  <option value="ativas">Ativas</option>
                  <option value="inativas">Arquivadas</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <section className="espiagro-state-card">
                <span className="espiagro-panel-kicker">Carregando</span>
                <h2>Carregando propriedades</h2>
                <p>Aguarde enquanto as informações são carregadas.</p>
              </section>
            ) : null}

            {isError ? (
              <section className="espiagro-state-card">
                <span className="espiagro-panel-kicker">Não foi possível carregar</span>
                <h2>Não foi possível carregar as propriedades</h2>
                <p>Verifique sua conexão e tente novamente.</p>

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

            {!isLoading && !isError ? (
              <>
                {propriedadesFiltradas.length === 0 ? (
                  <section className="espiagro-empty-card">
                    <span className="espiagro-panel-kicker">Nenhuma propriedade encontrada</span>
                    <p>Nenhuma propriedade corresponde aos filtros atuais.</p>
                  </section>
                ) : (
                  <section className="espiagro-list-wrap">
                    {propriedadesFiltradas.map((item) => {
                      const tone = getPropriedadeTone(item);
                      const isExpanded = expandedIds.includes(item.id);
                      const imageSrc = getPropriedadeImageSrc(item);

                      return (
                        <article key={item.id} className="espiagro-list-card">
                          <div className="espiagro-property-card-visual">
                            {imageSrc ? (
                              <img
                                src={imageSrc}
                                alt={`Foto da propriedade ${item.nome || item.id}`}
                              />
                            ) : (
                              <div className="espiagro-property-card-fallback">
                                <span>{getPropriedadeInitials(item)}</span>
                                <small>Sem foto</small>
                              </div>
                            )}
                          </div>

                          <div className="espiagro-list-header">
                            <div className="espiagro-list-title-row">
                              <div>
                                <h3 className="espiagro-list-title">
                                  {item.nome || `Propriedade #${item.id}`}
                                </h3>

                                <p className="espiagro-list-meta">
                                  {item.municipio || "Município não informado"}
                                  {item.uf ? ` • ${item.uf}` : ""} •{" "}
                                  {formatDateTime(item.created_at)}
                                </p>
                              </div>

                              <div className="espiagro-badges">
                                <span
                                  className={`espiagro-badge ${
                                    item.ativa
                                      ? "espiagro-badge-green"
                                      : "espiagro-badge-red"
                                  }`}
                                >
                                  {item.ativa ? "Ativa" : "Arquivada"}
                                </span>

                                <span
                                  className={`espiagro-badge ${
                                    tone === "green"
                                      ? "espiagro-badge-green"
                                      : tone === "amber"
                                        ? "espiagro-badge-amber"
                                        : tone === "red"
                                          ? "espiagro-badge-red"
                                          : "espiagro-badge-blue"
                                  }`}
                                >
                                  {item.poligono ? "Com área no mapa" : "Sem área no mapa"}
                                </span>
                              </div>
                            </div>

                            <div className="espiagro-list-summary">
                              <p>
                                {item.descricao || "Sem observações cadastradas."}
                              </p>

                              <button
                                type="button"
                                className="espiagro-btn espiagro-btn-ghost espiagro-card-toggle"
                                onClick={() => toggleExpanded(item.id)}
                              >
                                {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                              </button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="espiagro-card-details">
                              <div className="espiagro-detail-grid">
                                <div className="espiagro-detail-box">
                                  <span className="espiagro-detail-label">Área total</span>
                                  <span className="espiagro-detail-value">
                                    {item.area_total_ha ?? "-"} ha
                                  </span>
                                </div>

                                <div className="espiagro-detail-box">
                                  <span className="espiagro-detail-label">Ponto de referência</span>
                                  <span className="espiagro-detail-value">
                                    {typeof item.centroide_latitude === "number" &&
                                    typeof item.centroide_longitude === "number"
                                      ? `${item.centroide_latitude.toFixed(6)}, ${item.centroide_longitude.toFixed(6)}`
                                      : "-"}
                                  </span>
                                </div>

                                <div className="espiagro-detail-box">
                                  <span className="espiagro-detail-label">Última atualização</span>
                                  <span className="espiagro-detail-value">
                                    {formatDateTime(item.updated_at)}
                                  </span>
                                </div>

                                <div className="espiagro-detail-box">
                                  <span className="espiagro-detail-label">Situação</span>
                                  <span className="espiagro-detail-value">
                                    {item.ativa ? "Ativa" : "Arquivada"}
                                  </span>
                                </div>
                              </div>

                              {item.bbox ? (
                                <div className="espiagro-note-box">
                                  <strong>Área preparada para o mapa</strong>
                                  <p>
                                    Esta propriedade possui limites calculados para
                                    melhorar a visualização no mapa da lavoura.
                                  </p>
                                </div>
                              ) : null}

                              {item.descricao ? (
                                <div className="espiagro-note-box">
                                  <strong>Observações</strong>
                                  <p>{item.descricao}</p>
                                </div>
                              ) : null}

                              <div className="espiagro-card-actions">
                                <button
                                  type="button"
                                  className="espiagro-btn espiagro-btn-ghost"
                                  onClick={() => fillForm(item)}
                                  disabled={isSubmitting}
                                >
                                  Editar
                                </button>

                                {item.ativa === false ? (
                                  <button
                                    type="button"
                                    className="espiagro-btn espiagro-btn-success"
                                    onClick={() => void handleReactivate(item.id)}
                                    disabled={isSubmitting}
                                  >
                                    Reativar
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="espiagro-btn espiagro-btn-ghost"
                                    onClick={() => void handleArchive(item.id)}
                                    disabled={isSubmitting}
                                  >
                                    Arquivar
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="espiagro-btn espiagro-btn-danger"
                                  onClick={() => void handleDelete(item.id)}
                                  disabled={isSubmitting}
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </section>
                )}
              </>
            ) : null}
          </section>
        </section>
      </div>
  );
}