import type {
  FiltroStatus,
  FiltroTipo,
} from "@/features/relatorios/types/relatorio.types";

import {
  getFiltroStatusLabel,
  getFiltroTipoLabel,
} from "@/features/relatorios/utils/relatorioFormatters";

type ReportSearchBarProps = {
  busca: string;
  statusFiltro: FiltroStatus;
  tipoFiltro: FiltroTipo;
  hasActiveFilters: boolean;
  activeStructuredFilterCount: number;
  onBuscaChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
};

export default function ReportSearchBar({
  busca,
  statusFiltro,
  tipoFiltro,
  hasActiveFilters,
  activeStructuredFilterCount,
  onBuscaChange,
  onOpenFilters,
  onClearFilters,
}: ReportSearchBarProps) {
  const hasSearchText = busca.trim().length > 0;

  return (
    <section className="espiagro-report-search-card">
      <div className="espiagro-report-search-header">
        <div className="espiagro-report-search-header-content">
          <span className="espiagro-panel-kicker">Buscar</span>
          <h3 className="espiagro-report-search-title">Encontrar relatórios</h3>
          <p className="espiagro-report-search-description">
            Pesquise por título, talhão, propriedade ou por palavras do resumo.
          </p>
        </div>
      </div>

      <div className="espiagro-report-search-row">
        <label
          className="espiagro-report-search-input-wrap"
          htmlFor="buscaRelatorio"
        >
          <span className="espiagro-report-search-input-label">
            Buscar relatório
          </span>

          <div className="espiagro-report-search-input-box">
            <span
              className="espiagro-report-search-input-icon"
              aria-hidden="true"
            >
              🔎
            </span>

            <input
              id="buscaRelatorio"
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="Digite para buscar relatório..."
              value={busca}
              onChange={(event) => onBuscaChange(event.target.value)}
            />

            {hasSearchText ? (
              <button
                type="button"
                className="espiagro-report-search-clear-button"
                onClick={() => onBuscaChange("")}
                aria-label="Limpar busca"
              >
                ×
              </button>
            ) : null}
          </div>
        </label>

        <button
          type="button"
          className="espiagro-report-filter-button"
          onClick={onOpenFilters}
          aria-label="Abrir filtros"
        >
          <span className="espiagro-report-filter-button-text">Filtrar</span>

          {activeStructuredFilterCount > 0 ? (
            <strong className="espiagro-report-filter-button-badge">
              {activeStructuredFilterCount}
            </strong>
          ) : null}
        </button>
      </div>

      {hasActiveFilters ? (
        <div className="espiagro-report-active-filter-row">
          {hasSearchText ? (
            <span className="espiagro-report-filter-pill">
              <span className="espiagro-report-filter-pill-label">Busca</span>
              <strong>{busca.trim()}</strong>
            </span>
          ) : null}

          {statusFiltro ? (
            <span className="espiagro-report-filter-pill">
              <span className="espiagro-report-filter-pill-label">Situação</span>
              <strong>{getFiltroStatusLabel(statusFiltro)}</strong>
            </span>
          ) : null}

          {tipoFiltro ? (
            <span className="espiagro-report-filter-pill">
              <span className="espiagro-report-filter-pill-label">Categoria</span>
              <strong>{getFiltroTipoLabel(tipoFiltro)}</strong>
            </span>
          ) : null}

          <button
            type="button"
            className="espiagro-report-clear-filter-button"
            onClick={onClearFilters}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="espiagro-report-search-help">
          <span className="espiagro-report-search-help-dot" aria-hidden="true" />
          <p>
            Use a busca para encontrar rapidamente um relatório específico ou
            toque em <strong>Filtrar</strong> para refinar a lista.
          </p>
        </div>
      )}
    </section>
  );
}