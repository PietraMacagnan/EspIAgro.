import { useCallback, useMemo, useState } from "react";

import type {
  FiltroStatus,
  FiltroTipo,
  RelatoriosFilters,
  SummaryFilterKey,
} from "../types/relatorio.types";

type UseRelatorioFiltersReturn = {
  filters: RelatoriosFilters;
  statusFiltro: FiltroStatus;
  tipoFiltro: FiltroTipo;
  busca: string;
  hasActiveFilters: boolean;
  activeStructuredFilterCount: number;
  setStatusFiltro: (status: FiltroStatus) => void;
  setTipoFiltro: (tipo: FiltroTipo) => void;
  setBusca: (busca: string) => void;
  handleQuickFilter: (filterKey?: SummaryFilterKey) => void;
  handleClearFilters: () => void;
};

export function useRelatorioFilters(): UseRelatorioFiltersReturn {
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("");
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>("");
  const [busca, setBusca] = useState("");

  const filters = useMemo<RelatoriosFilters>(
    () => ({
      status: statusFiltro,
      tipo: tipoFiltro,
      busca,
    }),
    [statusFiltro, tipoFiltro, busca],
  );

  const hasActiveFilters = useMemo(() => {
    return Boolean(statusFiltro || tipoFiltro || busca.trim());
  }, [statusFiltro, tipoFiltro, busca]);

  const activeStructuredFilterCount = useMemo(() => {
    return Number(Boolean(statusFiltro)) + Number(Boolean(tipoFiltro));
  }, [statusFiltro, tipoFiltro]);

  const handleClearFilters = useCallback(() => {
    setStatusFiltro("");
    setTipoFiltro("");
    setBusca("");
  }, []);

  const handleQuickFilter = useCallback((filterKey?: SummaryFilterKey) => {
    if (filterKey === "todos") {
      setStatusFiltro("");
      setTipoFiltro("");
      setBusca("");
      return;
    }

    if (filterKey === "concluido") {
      setStatusFiltro("concluido");
      return;
    }

    if (filterKey === "monitoramento") {
      setTipoFiltro("monitoramento");
      return;
    }

    if (filterKey === "com_imagem") {
      setStatusFiltro("");
      setTipoFiltro("");
      setBusca("imagem");
    }
  }, []);

  return {
    filters,
    statusFiltro,
    tipoFiltro,
    busca,
    hasActiveFilters,
    activeStructuredFilterCount,
    setStatusFiltro,
    setTipoFiltro,
    setBusca,
    handleQuickFilter,
    handleClearFilters,
  };
}