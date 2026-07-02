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
import "./TalhoesPage.css";

type PropriedadeOption = {
  id: number;
  nome?: string;
  municipio?: string;
  uf?: string;
  ativa?: boolean;
};

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

type Talhao = {
  id: number;
  usuario?: number | null;
  propriedade?: number | null;
  propriedade_nome?: string;
  nome?: string;
  cultivar?: string;
  sistema_cultivo?: string;
  data_plantio?: string | null;
  area_ha?: number | null;
  poligono?: GeoJsonPolygon | null;
  centroide?: GeoJsonPoint | null;
  centroide_latitude?: number | null;
  centroide_longitude?: number | null;
  bbox?: BBox | null;
  observacoes?: string;
  foto?: string | null;
  foto_url?: string | null;
  imagem?: string | null;
  imagem_url?: string | null;
  ativa?: boolean;
  created_at?: string;
  updated_at?: string;
};

type TalhaoPayload = {
  propriedade: string;
  nome: string;
  cultivar: string;
  sistema_cultivo: string;
  data_plantio: string;
  area_ha: string;
  observacoes: string;
  poligono: string;
  ativa: boolean;
};

type SummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: "green" | "amber" | "red" | "blue";
};

type FiltroStatus = "" | "ativos" | "inativos";
type LatLngTuple = [number, number];

const initialFormState: TalhaoPayload = {
  propriedade: "",
  nome: "",
  cultivar: "",
  sistema_cultivo: "",
  data_plantio: "",
  area_ha: "",
  observacoes: "",
  poligono: "",
  ativa: true,
};

const DEFAULT_MAP_CENTER: LatLngTuple = [-16.47, -54.635];
const DEFAULT_MAP_ZOOM = 13;

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

function formatArea(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(2)} ha`;
}

function getTalhaoTone(
  talhao: Talhao,
): "green" | "amber" | "red" | "blue" {
  if (talhao.ativa === false) {
    return "red";
  }

  if (talhao.poligono) {
    return "green";
  }

  if (talhao.cultivar || talhao.sistema_cultivo) {
    return "amber";
  }

  return "blue";
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

function getTalhaoFormState(item: Talhao): TalhaoPayload {
  return {
    propriedade:
      item.propriedade !== null && item.propriedade !== undefined
        ? String(item.propriedade)
        : "",
    nome: item.nome ?? "",
    cultivar: item.cultivar ?? "",
    sistema_cultivo: item.sistema_cultivo ?? "",
    data_plantio: item.data_plantio ?? "",
    area_ha:
      item.area_ha !== null && item.area_ha !== undefined
        ? String(item.area_ha)
        : "",
    observacoes: item.observacoes ?? "",
    poligono: stringifyPolygon(item.poligono),
    ativa: item.ativa !== false,
  };
}

function getTalhaoImageUrl(item: Talhao): string {
  return item.foto_url || item.imagem_url || item.foto || item.imagem || "";
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
      error: "A área desenhada precisa estar em um formato válido.",
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
      error: "A área informada não está em um formato válido.",
    };
  }

  const parsed = parsedUnknown as GeoJsonPolygon;

  if (parsed.type !== "Polygon") {
    return {
      valid: false,
      parsed: null,
      error: "A área precisa estar no formato correto para desenho no mapa.",
    };
  }

  if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
    return {
      valid: false,
      parsed: null,
      error: "A área precisa ter pontos suficientes para formar o desenho.",
    };
  }

  const outerRing = parsed.coordinates[0];

  if (!Array.isArray(outerRing) || outerRing.length < 4) {
    return {
      valid: false,
      parsed: null,
      error: "A área desenhada precisa ter pelo menos 3 pontos e estar fechada corretamente.",
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

function geoJsonPolygonToLatLngs(
  polygon: GeoJsonPolygon | null,
): LatLngTuple[] {
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

export default function TalhoesPage() {
  const queryClient = useQueryClient();

  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("");
  const [formData, setFormData] = useState<TalhaoPayload>(initialFormState);
  const [editingItem, setEditingItem] = useState<Talhao | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [drawPoints, setDrawPoints] = useState<LatLngTuple[]>([]);
  const [mapInteractionEnabled, setMapInteractionEnabled] = useState(true);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<Talhao[]>({
    queryKey: ["talhoes-lista"],
    queryFn: async () => {
      const response = await http.get<Talhao[]>("/talhoes/");
      return response.data;
    },
  });

  const {
    data: propriedadesData,
    isLoading: isLoadingPropriedades,
  } = useQuery<PropriedadeOption[]>({
    queryKey: ["propriedades-options"],
    queryFn: async () => {
      const response = await http.get<PropriedadeOption[]>("/propriedades/");
      return response.data;
    },
  });

  const talhoes = useMemo<Talhao[]>(() => data ?? [], [data]);

  const propriedadesAtivas = useMemo<PropriedadeOption[]>(() => {
    return (propriedadesData ?? []).filter((item) => item.ativa !== false);
  }, [propriedadesData]);

  const talhoesFiltrados = useMemo(() => {
    return talhoes.filter((item) => {
      if (statusFiltro === "ativos") {
        return item.ativa !== false;
      }

      if (statusFiltro === "inativos") {
        return item.ativa === false;
      }

      return true;
    });
  }, [talhoes, statusFiltro]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const total = talhoes.length;
    const ativos = talhoes.filter((item) => item.ativa !== false).length;
    const comPoligono = talhoes.filter((item) => Boolean(item.poligono)).length;
    const vinculados = talhoes.filter((item) => Boolean(item.propriedade)).length;

    return [
      {
        title: "Total de talhões",
        value: formatNumber(total),
        hint: "Áreas cadastradas",
        tone: "blue",
      },
      {
        title: "Ativos",
        value: formatNumber(ativos),
        hint: "Prontos para uso nas coletas",
        tone: ativos > 0 ? "green" : "amber",
      },
      {
        title: "Com área no mapa",
        value: formatNumber(comPoligono),
        hint: "Áreas desenhadas",
        tone: comPoligono > 0 ? "green" : "amber",
      },
      {
        title: "Vinculados",
        value: formatNumber(vinculados),
        hint: "Ligados a uma propriedade",
        tone: vinculados > 0 ? "green" : "blue",
      },
    ];
  }, [talhoes]);

  const formTitle = editingItem ? "Editar talhão" : "Novo talhão";
  const formDescription = editingItem
    ? "Atualize as informações do talhão e mantenha o cadastro organizado."
    : "Informe os dados do talhão e, se possível, desenhe a área no mapa.";

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

  const hasUnsavedChanges = useMemo(() => {
    if (!isFormSheetOpen) {
      return false;
    }

    if (editingItem) {
      return JSON.stringify(formData) !== JSON.stringify(getTalhaoFormState(editingItem));
    }

    return (
      JSON.stringify(formData) !== JSON.stringify(initialFormState) ||
      drawPoints.length > 0
    );
  }, [drawPoints.length, editingItem, formData, isFormSheetOpen]);

  function resetForm(): void {
    setFormData(initialFormState);
    setEditingItem(null);
    setSubmitError("");
    setDrawPoints([]);
    setMapInteractionEnabled(true);
    setShowUnsavedWarning(false);
  }

  function openCreateForm(): void {
    resetForm();
    setSubmitMessage("");
    setSubmitError("");
    setIsFormSheetOpen(true);
  }

  function closeFormSheet(): void {
    setIsFormSheetOpen(false);
    resetForm();
  }

  function requestCloseFormSheet(): void {
    if (isSubmitting) {
      return;
    }

    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }

    closeFormSheet();
  }

  function confirmCloseFormSheet(): void {
    closeFormSheet();
  }

  function keepEditing(): void {
    setShowUnsavedWarning(false);
  }

  function toggleExpanded(id: number): void {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  }

  function fillForm(item: Talhao): void {
    setEditingItem(item);
    setSubmitError("");
    setSubmitMessage("");
    setShowUnsavedWarning(false);

    const nextFormState = getTalhaoFormState(item);
    const latLngPoints = geoJsonPolygonToLatLngs(item.poligono ?? null);

    setFormData(nextFormState);

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

    setMapInteractionEnabled(true);
    setIsFormSheetOpen(true);
  }

  function updateField<K extends keyof TalhaoPayload>(
    field: K,
    value: TalhaoPayload[K],
  ): void {
    setShowUnsavedWarning(false);
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
    setShowUnsavedWarning(false);
    setDrawPoints((current) => {
      const next = [...current, point];
      syncPolygonFromPoints(next);
      return next;
    });
  }

  function handleUndoLastPoint(): void {
    setShowUnsavedWarning(false);
    setDrawPoints((current) => {
      const next = current.slice(0, -1);
      syncPolygonFromPoints(next);
      return next;
    });
  }

  function handleClearDrawing(): void {
    setShowUnsavedWarning(false);
    setDrawPoints([]);
    setFormData((current) => ({
      ...current,
      poligono: "",
    }));
  }

  function buildPayload() {
    const propriedadeId = Number(formData.propriedade);
    const nome = formData.nome.trim();
    const area =
      formData.area_ha.trim() === ""
        ? null
        : Number(formData.area_ha.replace(",", "."));

    if (!formData.propriedade) {
      throw new Error("Selecione a propriedade vinculada.");
    }

    if (Number.isNaN(propriedadeId)) {
      throw new Error("Propriedade inválida.");
    }

    if (!nome) {
      throw new Error("Informe o nome do talhão.");
    }

    if (formData.area_ha.trim() !== "" && Number.isNaN(area)) {
      throw new Error("Informe uma área válida em hectares.");
    }

    const polygonValidation = validateGeoJsonPolygon(formData.poligono);

    if (!polygonValidation.valid) {
      throw new Error(polygonValidation.error);
    }

    return {
      propriedade: propriedadeId,
      nome,
      cultivar: formData.cultivar.trim(),
      sistema_cultivo: formData.sistema_cultivo.trim(),
      data_plantio: formData.data_plantio || null,
      area_ha: area,
      observacoes: formData.observacoes.trim(),
      poligono: polygonValidation.parsed,
      ativa: formData.ativa,
    };
  }

  async function invalidateTalhoes(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["talhoes-lista"],
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
      const response = await http.post<Talhao>("/talhoes/", payload);
      return response.data;
    },
    onSuccess: async () => {
      resetForm();
      setIsFormSheetOpen(false);
      setSubmitError("");
      setSubmitMessage("Talhão cadastrado com sucesso.");
      await invalidateTalhoes();
    },
    onError: (error: unknown) => {
      console.error("Erro ao cadastrar talhão:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível cadastrar o talhão.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) {
        throw new Error("Nenhum talhão selecionado para edição.");
      }

      const payload = buildPayload();
      const response = await http.put<Talhao>(
        `/talhoes/${editingItem.id}/`,
        payload,
      );
      return response.data;
    },
    onSuccess: async () => {
      resetForm();
      setIsFormSheetOpen(false);
      setSubmitError("");
      setSubmitMessage("Talhão atualizado com sucesso.");
      await invalidateTalhoes();
    },
    onError: (error: unknown) => {
      console.error("Erro ao atualizar talhão:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível atualizar o talhão.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (item: Talhao) => {
      const response = await http.patch<Talhao>(`/talhoes/${item.id}/`, {
        ativa: false,
      });
      return response.data;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Talhão arquivado com sucesso.");
      await invalidateTalhoes();
    },
    onError: (error: unknown) => {
      console.error("Erro ao arquivar talhão:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível arquivar o talhão.");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (item: Talhao) => {
      const response = await http.patch<Talhao>(`/talhoes/${item.id}/`, {
        ativa: true,
      });
      return response.data;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Talhão reativado com sucesso.");
      await invalidateTalhoes();
    },
    onError: (error: unknown) => {
      console.error("Erro ao reativar talhão:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível reativar o talhão.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: Talhao) => {
      await http.delete(`/talhoes/${item.id}/`);
      return item.id;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Talhão excluído com sucesso.");
      if (editingItem) {
        closeFormSheet();
      }
      await invalidateTalhoes();
    },
    onError: (error: unknown) => {
      console.error("Erro ao excluir talhão:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível excluir o talhão.");
    },
  });

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    reactivateMutation.isPending ||
    deleteMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");
    setShowUnsavedWarning(false);

    try {
      buildPayload();
    } catch (error) {
      setSubmitMessage("");
      setSubmitError(
        error instanceof Error ? error.message : "Revise as informações preenchidas.",
      );
      return;
    }

    if (editingItem) {
      await updateMutation.mutateAsync();
      return;
    }

    await createMutation.mutateAsync();
  }

  async function handleArchive(item: Talhao): Promise<void> {
    const confirmed = window.confirm(
      `Deseja arquivar o talhão "${item.nome || `#${item.id}`}"?`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitError("");
    setSubmitMessage("");
    await archiveMutation.mutateAsync(item);
  }

  async function handleReactivate(item: Talhao): Promise<void> {
    const confirmed = window.confirm(
      `Deseja reativar o talhão "${item.nome || `#${item.id}`}"?`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitError("");
    setSubmitMessage("");
    await reactivateMutation.mutateAsync(item);
  }

  async function handleDelete(item: Talhao): Promise<void> {
    const confirmed = window.confirm(
      `Deseja excluir definitivamente o talhão "${item.nome || `#${item.id}`}"?`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitError("");
    setSubmitMessage("");
    await deleteMutation.mutateAsync(item);
  }

  return (
    <div className="espiagro-talhoes-page">
      <section className="espiagro-talhoes-hero">
        <div className="espiagro-talhoes-hero-main">
          <span className="espiagro-talhoes-kicker">
            EspIAgro • Áreas da lavoura
          </span>

          <h1 className="espiagro-talhoes-title">
            Organize os talhões da lavoura com clareza, mapa e informações de
            manejo.
          </h1>

          <p className="espiagro-talhoes-description">
            Cadastre e acompanhe cada talhão vinculado à propriedade, com
            cultivar, área, plantio e localização no mapa.
          </p>

          <div className="espiagro-talhoes-band">
            {isFetching ? "Atualizando talhões..." : "Dados atualizados"} •{" "}
            {talhoesFiltrados.length} talhões encontrados
          </div>

          <div className="espiagro-talhoes-actions">
            <button
              type="button"
              className="espiagro-btn espiagro-btn-primary"
              onClick={openCreateForm}
            >
              Novo talhão
            </button>

            <button
              type="button"
              className="espiagro-btn espiagro-btn-secondary"
              onClick={() => {
                void refetch();
              }}
            >
              {isFetching ? "Atualizando..." : "Atualizar talhões"}
            </button>
          </div>
        </div>

        <div className="espiagro-talhoes-hero-side">
          <div className="espiagro-mini-card">
            <span className="espiagro-mini-label">Talhões exibidos</span>
            <strong>{formatNumber(talhoesFiltrados.length)}</strong>
          </div>

          <div className="espiagro-mini-card">
            <span className="espiagro-mini-label">Propriedades ativas</span>
            <strong>{formatNumber(propriedadesAtivas.length)}</strong>
          </div>

          <div className="espiagro-mini-card">
            <span className="espiagro-mini-label">Controle da lavoura</span>
            <strong>Área, plantio e localização em um só lugar</strong>
          </div>
        </div>
      </section>

      <section className="espiagro-insight-grid">
        <article className="espiagro-insight-card">
          <h3>Informações do talhão</h3>
          <p>
            Registre nome, cultivar, sistema de cultivo, área e observações
            importantes.
          </p>
        </article>

        <article className="espiagro-insight-card">
          <h3>Área no mapa</h3>
          <p>
            Desenhe a área do talhão para facilitar a visualização e as coletas
            em campo.
          </p>
        </article>

        <article className="espiagro-insight-card">
          <h3>Controle da lavoura</h3>
          <p>
            Edite, arquive, reative ou exclua registros mantendo a base da
            lavoura organizada.
          </p>
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

      {submitMessage ? (
        <div className="espiagro-feedback-message">{submitMessage}</div>
      ) : null}

      {!isFormSheetOpen && submitError ? (
        <div className="espiagro-feedback-error">{submitError}</div>
      ) : null}

      {isFormSheetOpen ? (
        <div
          className="espiagro-form-sheet-overlay"
          role="presentation"
          onClick={requestCloseFormSheet}
        >
          <section
            className="espiagro-form-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="talhao-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <section className="espiagro-form-card">
              <div className="espiagro-form-header">
                <div>
                  <span className="espiagro-panel-kicker">
                    Dados do talhão
                  </span>
                  <h3 id="talhao-form-title">{formTitle}</h3>
                  <p>{formDescription}</p>
                </div>

                <button
                  type="button"
                  className="espiagro-form-sheet-close"
                  onClick={requestCloseFormSheet}
                  disabled={isSubmitting}
                  aria-label="Fechar formulário"
                >
                  ×
                </button>
              </div>

              {showUnsavedWarning ? (
                <div className="espiagro-unsaved-alert" role="alert">
                  <strong>Informações não salvas</strong>
                  <span>
                    Existem dados preenchidos que podem ser perdidos se você
                    fechar este cadastro.
                  </span>

                  <div className="espiagro-unsaved-actions">
                    <button
                      type="button"
                      className="espiagro-btn espiagro-btn-danger"
                      onClick={confirmCloseFormSheet}
                    >
                      Fechar mesmo assim
                    </button>

                    <button
                      type="button"
                      className="espiagro-btn espiagro-btn-ghost"
                      onClick={keepEditing}
                    >
                      Continuar editando
                    </button>
                  </div>
                </div>
              ) : null}

              <form onSubmit={(event) => void handleSubmit(event)}>
                <div className="espiagro-form-grid">
                  <div className="espiagro-field">
                    <label htmlFor="propriedade">Propriedade</label>
                    <select
                      id="propriedade"
                      value={formData.propriedade}
                      onChange={(event) =>
                        updateField("propriedade", event.target.value)
                      }
                      disabled={isLoadingPropriedades}
                    >
                      <option value="">
                        {isLoadingPropriedades
                          ? "Atualizando lista propriedades..."
                          : "Selecione uma propriedade"}
                      </option>
                      {propriedadesAtivas.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome || `Propriedade #${item.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="nome">Nome do talhão</label>
                    <input
                      id="nome"
                      type="text"
                      value={formData.nome}
                      onChange={(event) => updateField("nome", event.target.value)}
                      placeholder="Ex.: Talhão A1"
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="cultivar">Cultivar</label>
                    <input
                      id="cultivar"
                      type="text"
                      value={formData.cultivar}
                      onChange={(event) =>
                        updateField("cultivar", event.target.value)
                      }
                      placeholder="Ex.: Híbrido XPTO"
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="sistema_cultivo">Sistema de cultivo</label>
                    <input
                      id="sistema_cultivo"
                      type="text"
                      value={formData.sistema_cultivo}
                      onChange={(event) =>
                        updateField("sistema_cultivo", event.target.value)
                      }
                      placeholder="Ex.: Plantio direto"
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="data_plantio">Data de plantio</label>
                    <input
                      id="data_plantio"
                      type="date"
                      value={formData.data_plantio}
                      onChange={(event) =>
                        updateField("data_plantio", event.target.value)
                      }
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="area_ha">Área (ha)</label>
                    <input
                      id="area_ha"
                      type="text"
                      inputMode="decimal"
                      value={formData.area_ha}
                      onChange={(event) =>
                        updateField("area_ha", event.target.value)
                      }
                      placeholder="Ex.: 35.80"
                    />
                  </div>

                  <div className="espiagro-field espiagro-field-full">
                    <label htmlFor="observacoes">Observações</label>
                    <textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(event) =>
                        updateField("observacoes", event.target.value)
                      }
                      placeholder="Informações relevantes do talhão."
                    />
                  </div>

                  <div className="espiagro-field espiagro-field-full">
                    <label>Desenho da área no mapa</label>

                    <div className="espiagro-map-card">
                      <div className="espiagro-map-toolbar">
                        <button
                          type="button"
                          className="espiagro-btn espiagro-btn-primary"
                          onClick={() => setMapInteractionEnabled(true)}
                        >
                          Ativar desenho
                        </button>

                        <button
                          type="button"
                          className="espiagro-btn espiagro-btn-ghost"
                          onClick={() => setMapInteractionEnabled(false)}
                        >
                          Pausar desenho
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
                              <Popup>Centro da área</Popup>
                            </Marker>
                          ) : null}
                        </MapContainer>
                      </div>

                      <div className="espiagro-map-helper">
                        <p>
                          Toque no mapa para marcar os pontos da área. Com 3
                          pontos ou mais, o desenho do talhão é preparado
                          automaticamente.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="espiagro-field espiagro-field-full">
                    <label htmlFor="poligono">Área desenhada</label>
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
                          Sem área no mapa informado
                        </span>
                      ) : null}

                      {polygonPreview.hasPolygon && polygonPreview.valid ? (
                        <>
                          <span className="espiagro-polygon-chip espiagro-polygon-chip-valid">
                            Área válida
                          </span>
                          <span className="espiagro-polygon-chip espiagro-polygon-chip-neutral">
                            Pontos da área: {polygonPreview.points}
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
                      <strong>Como informar</strong>
                      <p>
                        Use o mapa acima para desenhar a área. O campo avançado
                        mantém os dados necessários para salvar o desenho
                        corretamente.
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
                      <label htmlFor="ativa">Talhão ativo</label>
                    </div>
                  </div>
                </div>

                {submitError ? (
                  <div className="espiagro-feedback-error">{submitError}</div>
                ) : null}

                <div className="espiagro-form-actions">
                  <button
                    type="submit"
                    className="espiagro-btn espiagro-btn-primary"
                    disabled={isSubmitting || isLoadingPropriedades}
                  >
                    {isSubmitting
                      ? "Salvando..."
                      : editingItem
                        ? "Salvar alterações"
                        : "Cadastrar talhão"}
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
                <strong>Observação</strong>
                <p>
                  Talhões com área definida ajudam no mapa, no vínculo com a
                  propriedade e na organização das coletas.
                </p>
              </div>
            </section>
          </section>
        </div>
      ) : null}

      <section className="espiagro-filter-card">
        <div className="espiagro-filter-header">
          <div>
            <h3>Talhões da lavoura</h3>
            <p>
              Acompanhe os talhões cadastrados e mantenha a lavoura organizada.
            </p>
          </div>
        </div>

        <div className="espiagro-filter-fields">
          <div className="espiagro-field">
            <label htmlFor="statusFiltro">Situação</label>
            <select
              id="statusFiltro"
              value={statusFiltro}
              onChange={(event) =>
                setStatusFiltro(event.target.value as FiltroStatus)
              }
            >
              <option value="">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="inativos">Inativos</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">Atualizando lista</span>
            <h2>Carregando talhões da lavoura</h2>
            <p>Aguarde enquanto buscamos as informações mais recentes.</p>
          </section>
        ) : null}

        {isError ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">
              Não foi possível atualizar
            </span>
            <h2>Não foi possível carregar os talhões</h2>
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
            {talhoesFiltrados.length === 0 ? (
              <section className="espiagro-empty-card">
                <span className="espiagro-panel-kicker">
                  Nenhum talhão encontrado
                </span>
                <p>Nenhum talhão foi encontrado com os filtros escolhidos.</p>
              </section>
            ) : (
              <section className="espiagro-list-wrap">
                {talhoesFiltrados.map((item) => {
                  const tone = getTalhaoTone(item);
                  const isExpanded = expandedIds.includes(item.id);
                  const talhaoImageUrl = getTalhaoImageUrl(item);

                  return (
                    <article key={item.id} className="espiagro-list-card">
                      <div className="espiagro-talhao-card-visual">
                        {talhaoImageUrl ? (
                          <img
                            src={talhaoImageUrl}
                            alt={`Imagem do talhão ${item.nome || item.id}`}
                          />
                        ) : (
                          <div className="espiagro-talhao-card-fallback">
                            <span>🌾</span>
                            <small>Sem foto do talhão</small>
                          </div>
                        )}
                      </div>

                      <div className="espiagro-list-header">
                        <div className="espiagro-list-header-main">
                          <h3 className="espiagro-list-title">
                            {item.nome || `Talhão #${item.id}`}
                          </h3>

                          <p className="espiagro-list-meta">
                            {item.propriedade_nome ||
                              "Propriedade não informada"}{" "}
                            • {formatDateTime(item.created_at)}
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
                            {item.ativa ? "Ativo" : "Inativo"}
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
                            {item.poligono
                              ? "Com área no mapa"
                              : "Sem área no mapa"}
                          </span>
                        </div>
                      </div>

                      <p className="espiagro-list-summary">
                        Cultivar: {item.cultivar || "-"} • Sistema:{" "}
                        {item.sistema_cultivo || "-"} • Área:{" "}
                        {formatArea(item.area_ha)}
                      </p>

                      <div className="espiagro-list-actions-top">
                        <button
                          type="button"
                          className="espiagro-btn espiagro-btn-ghost"
                          onClick={() => fillForm(item)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="espiagro-expand-btn"
                          onClick={() => toggleExpanded(item.id)}
                        >
                          {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="espiagro-expanded-content">
                          <div className="espiagro-detail-grid">
                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Cultivar
                              </span>
                              <span className="espiagro-detail-value">
                                {item.cultivar || "-"}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Sistema de cultivo
                              </span>
                              <span className="espiagro-detail-value">
                                {item.sistema_cultivo || "-"}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">Área</span>
                              <span className="espiagro-detail-value">
                                {formatArea(item.area_ha)}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Data de plantio
                              </span>
                              <span className="espiagro-detail-value">
                                {item.data_plantio || "-"}
                              </span>
                            </div>
                          </div>

                          <div className="espiagro-detail-grid">
                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Ponto central
                              </span>
                              <span className="espiagro-detail-value">
                                {typeof item.centroide_latitude === "number" &&
                                typeof item.centroide_longitude === "number"
                                  ? `${item.centroide_latitude.toFixed(6)}, ${item.centroide_longitude.toFixed(6)}`
                                  : "-"}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Atualizado em
                              </span>
                              <span className="espiagro-detail-value">
                                {formatDateTime(item.updated_at)}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Propriedade
                              </span>
                              <span className="espiagro-detail-value">
                                {item.propriedade_nome || "-"}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Situação
                              </span>
                              <span className="espiagro-detail-value">
                                {item.ativa ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </div>

                          {item.bbox ? (
                            <div className="espiagro-note-box">
                              <strong>Limites da área no mapa</strong>
                              <p>
                                Longitude mínima: {item.bbox.xmin.toFixed(6)} •
                                Latitude mínima: {item.bbox.ymin.toFixed(6)} •
                                Longitude máxima: {item.bbox.xmax.toFixed(6)} •
                                Latitude máxima: {item.bbox.ymax.toFixed(6)}
                              </p>
                            </div>
                          ) : null}

                          {item.observacoes ? (
                            <div className="espiagro-note-box">
                              <strong>Observações</strong>
                              <p>{item.observacoes}</p>
                            </div>
                          ) : null}

                          <div className="espiagro-card-actions">
                            <button
                              type="button"
                              className="espiagro-btn espiagro-btn-ghost"
                              onClick={() => fillForm(item)}
                              disabled={isSubmitting}
                            >
                              Editar talhão
                            </button>

                            {item.ativa ? (
                              <button
                                type="button"
                                className="espiagro-btn espiagro-btn-ghost"
                                onClick={() => {
                                  void handleArchive(item);
                                }}
                                disabled={isSubmitting}
                              >
                                Arquivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="espiagro-btn espiagro-btn-ghost"
                                onClick={() => {
                                  void handleReactivate(item);
                                }}
                                disabled={isSubmitting}
                              >
                                Reativar
                              </button>
                            )}

                            <button
                              type="button"
                              className="espiagro-btn espiagro-btn-danger"
                              onClick={() => {
                                void handleDelete(item);
                              }}
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
    </div>
  );
}
