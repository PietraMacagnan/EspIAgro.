import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listarRelatorios } from "../services/relatorios.service";
import type {
  FiltroStatus,
  FiltroTipo,
  Relatorio,
  RelatoriosFilters,
  RelatoriosQueryState,
  SummaryCard,
  SummaryFilterKey,
} from "../types/relatorio.types";
import {
  buildSummaryCards,
  countProcessingRelatorios,
  filterRelatorios,
} from "../utils/relatorio.helpers";
import { useRelatorioFilters } from "./useRelatorioFilters";

const RELATORIOS_QUERY_KEY = ["relatorios-lista"] as const;

type UseRelatoriosReturn = RelatoriosQueryState & {
  filters: RelatoriosFilters;
  setStatusFiltro: (status: FiltroStatus) => void;
  setTipoFiltro: (tipo: FiltroTipo) => void;
  setBusca: (busca: string) => void;
  selectedRelatorioId: number | null;
  setSelectedRelatorioId: (relatorioId: number | null) => void;
  openRelatorioDetails: (relatorioId: number) => void;
  closeRelatorioDetails: () => void;
  handleQuickFilter: (filterKey?: SummaryFilterKey) => void;
  handleClearFilters: () => void;
  refetchRelatorios: () => void;
};

export function useRelatorios(): UseRelatoriosReturn {
  const {
    filters,
    hasActiveFilters,
    activeStructuredFilterCount,
    setStatusFiltro,
    setTipoFiltro,
    setBusca,
    handleQuickFilter,
    handleClearFilters,
  } = useRelatorioFilters();

  const [selectedRelatorioId, setSelectedRelatorioId] = useState<number | null>(
    null,
  );

  const { data, isLoading, isError, isFetching, refetch } = useQuery<
    Relatorio[]
  >({
    queryKey: RELATORIOS_QUERY_KEY,
    queryFn: () => listarRelatorios(),
  });

  const relatorios = useMemo<Relatorio[]>(() => data ?? [], [data]);

  const relatoriosFiltrados = useMemo<Relatorio[]>(() => {
    return filterRelatorios(relatorios, filters);
  }, [relatorios, filters]);

  const selectedRelatorio = useMemo<Relatorio | null>(() => {
    if (!selectedRelatorioId) {
      return null;
    }

    return relatorios.find((item) => item.id === selectedRelatorioId) ?? null;
  }, [relatorios, selectedRelatorioId]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    return buildSummaryCards(relatorios);
  }, [relatorios]);

  const processingCount = useMemo(() => {
    return countProcessingRelatorios(relatorios);
  }, [relatorios]);

  function openRelatorioDetails(relatorioId: number): void {
    setSelectedRelatorioId(relatorioId);
  }

  function closeRelatorioDetails(): void {
    setSelectedRelatorioId(null);
  }

  function refetchRelatorios(): void {
    void refetch();
  }

  return {
    relatorios,
    relatoriosFiltrados,
    selectedRelatorio,
    summaryCards,
    processingCount,
    hasActiveFilters,
    activeStructuredFilterCount,
    isLoading,
    isError,
    isFetching,
    filters,
    setStatusFiltro,
    setTipoFiltro,
    setBusca,
    selectedRelatorioId,
    setSelectedRelatorioId,
    openRelatorioDetails,
    closeRelatorioDetails,
    handleQuickFilter,
    handleClearFilters,
    refetchRelatorios,
  };
}