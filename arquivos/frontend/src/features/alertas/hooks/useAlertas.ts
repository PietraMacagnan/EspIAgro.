import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listarAlertas } from "../services/alertas.service";
import type {
  Alerta,
  AlertasFilters,
  AlertSummaryFilterKey,
  FiltroLido,
  FiltroSeveridade,
  FiltroStatus,
  FiltroTipo,
  SummaryCard,
} from "../types/alerta.types";
import {
  applyAlertQuickFilter,
  buildAlertSummaryCards,
  countActiveAlertas,
  countCriticalAlertas,
  countStructuredAlertFilters,
  countUnreadAlertas,
  filterAlertas,
  hasAlertFilters,
} from "../utils/alerta.helpers";

const ALERTAS_QUERY_KEY = ["alertas-lista"] as const;

type UseAlertasReturn = {
  alertas: Alerta[];
  alertasFiltrados: Alerta[];
  selectedAlerta: Alerta | null;
  summaryCards: SummaryCard[];
  ativosCount: number;
  criticosCount: number;
  naoLidosCount: number;
  hasActiveFilters: boolean;
  activeStructuredFilterCount: number;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  filters: AlertasFilters;
  statusFiltro: FiltroStatus;
  tipoFiltro: FiltroTipo;
  severidadeFiltro: FiltroSeveridade;
  lidoFiltro: FiltroLido;
  busca: string;
  setStatusFiltro: (status: FiltroStatus) => void;
  setTipoFiltro: (tipo: FiltroTipo) => void;
  setSeveridadeFiltro: (severidade: FiltroSeveridade) => void;
  setLidoFiltro: (lido: FiltroLido) => void;
  setBusca: (busca: string) => void;
  selectedAlertaId: number | null;
  setSelectedAlertaId: (alertaId: number | null) => void;
  openAlertaDetails: (alertaId: number) => void;
  closeAlertaDetails: () => void;
  handleQuickFilter: (filterKey?: AlertSummaryFilterKey) => void;
  handleClearFilters: () => void;
  refetchAlertas: () => void;
};

export function useAlertas(): UseAlertasReturn {
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("");
  const [severidadeFiltro, setSeveridadeFiltro] =
    useState<FiltroSeveridade>("");
  const [lidoFiltro, setLidoFiltro] = useState<FiltroLido>("");
  const [busca, setBusca] = useState("");
  const [selectedAlertaId, setSelectedAlertaId] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<Alerta[]>({
    queryKey: [
      ...ALERTAS_QUERY_KEY,
      statusFiltro,
      tipoFiltro,
      severidadeFiltro,
      lidoFiltro,
    ],
    queryFn: () =>
      listarAlertas({
        status: statusFiltro,
        tipo: tipoFiltro,
        severidade: severidadeFiltro,
        lido: lidoFiltro,
      }),
  });

  const alertas = useMemo<Alerta[]>(() => data ?? [], [data]);

  const filters = useMemo<AlertasFilters>(
    () => ({
      status: statusFiltro,
      tipo: tipoFiltro,
      severidade: severidadeFiltro,
      lido: lidoFiltro,
      busca,
    }),
    [busca, lidoFiltro, severidadeFiltro, statusFiltro, tipoFiltro],
  );

  const alertasFiltrados = useMemo<Alerta[]>(() => {
    return filterAlertas(alertas, filters);
  }, [alertas, filters]);

  const selectedAlerta = useMemo<Alerta | null>(() => {
    if (!selectedAlertaId) {
      return null;
    }

    return alertas.find((item) => item.id === selectedAlertaId) ?? null;
  }, [alertas, selectedAlertaId]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    return buildAlertSummaryCards(alertas);
  }, [alertas]);

  const ativosCount = useMemo(() => {
    return countActiveAlertas(alertas);
  }, [alertas]);

  const criticosCount = useMemo(() => {
    return countCriticalAlertas(alertas);
  }, [alertas]);

  const naoLidosCount = useMemo(() => {
    return countUnreadAlertas(alertas);
  }, [alertas]);

  const hasActiveFilters = useMemo(() => {
    return hasAlertFilters(filters);
  }, [filters]);

  const activeStructuredFilterCount = useMemo(() => {
    return countStructuredAlertFilters(filters);
  }, [filters]);

  function openAlertaDetails(alertaId: number): void {
    setSelectedAlertaId(alertaId);
  }

  function closeAlertaDetails(): void {
    setSelectedAlertaId(null);
  }

  function applyFilters(nextFilters: AlertasFilters): void {
    setStatusFiltro(nextFilters.status);
    setTipoFiltro(nextFilters.tipo);
    setSeveridadeFiltro(nextFilters.severidade);
    setLidoFiltro(nextFilters.lido);
    setBusca(nextFilters.busca);
  }

  function handleQuickFilter(filterKey?: AlertSummaryFilterKey): void {
    applyFilters(applyAlertQuickFilter(filterKey));
  }

  function handleClearFilters(): void {
    applyFilters({
      status: "",
      tipo: "",
      severidade: "",
      lido: "",
      busca: "",
    });
  }

  function refetchAlertas(): void {
    void refetch();
  }

  return {
    alertas,
    alertasFiltrados,
    selectedAlerta,
    summaryCards,
    ativosCount,
    criticosCount,
    naoLidosCount,
    hasActiveFilters,
    activeStructuredFilterCount,
    isLoading,
    isError,
    isFetching,
    filters,
    statusFiltro,
    tipoFiltro,
    severidadeFiltro,
    lidoFiltro,
    busca,
    setStatusFiltro,
    setTipoFiltro,
    setSeveridadeFiltro,
    setLidoFiltro,
    setBusca,
    selectedAlertaId,
    setSelectedAlertaId,
    openAlertaDetails,
    closeAlertaDetails,
    handleQuickFilter,
    handleClearFilters,
    refetchAlertas,
  };
}