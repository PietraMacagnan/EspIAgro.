import type { AlertasFilters } from "@/features/alertas/types/alerta.types";
import {
  getLidoFilterLabel,
  getSeveridadeFilterLabel,
  getStatusFilterLabel,
  getTipoFilterLabel,
} from "@/features/alertas/utils/alerta.helpers";

type AlertSearchCardProps = {
  busca: string;
  filters: AlertasFilters;
  hasActiveFilters: boolean;
  activeStructuredFilterCount: number;
  onBuscaChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
};

export default function AlertSearchCard({
  busca,
  filters,
  hasActiveFilters,
  activeStructuredFilterCount,
  onBuscaChange,
  onOpenFilters,
  onClearFilters,
}: AlertSearchCardProps) {
  return (
    <section className="espiagro-alert-search-card">
      <div className="espiagro-alert-search-header">
        <div>
          <span className="espiagro-panel-kicker">Encontrar avisos</span>
          <h3>Buscar alertas da lavoura</h3>
          <p>
            Pesquise por talhão, propriedade, tipo de aviso ou palavras da
            mensagem.
          </p>
        </div>
      </div>

      <div className="espiagro-alert-search-row">
        <label className="espiagro-alert-search-input-wrap" htmlFor="buscaAlerta">
          <span>Buscar aviso</span>

          <div className="espiagro-alert-search-input-box">
            <span aria-hidden="true">🔎</span>

            <input
              id="buscaAlerta"
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder="Digite para buscar..."
              value={busca}
              onChange={(event) => onBuscaChange(event.target.value)}
            />

            {busca.trim() ? (
              <button
                type="button"
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
          className="espiagro-alert-filter-button"
          onClick={onOpenFilters}
        >
          Filtrar
          {activeStructuredFilterCount > 0 ? (
            <strong>{activeStructuredFilterCount}</strong>
          ) : null}
        </button>
      </div>

      {hasActiveFilters ? (
        <div className="espiagro-alert-active-filter-row">
          {filters.busca.trim() ? (
            <span className="espiagro-alert-filter-pill">
              <span>Busca</span>
              <strong>{filters.busca.trim()}</strong>
            </span>
          ) : null}

          {filters.status ? (
            <span className="espiagro-alert-filter-pill">
              <span>Situação</span>
              <strong>{getStatusFilterLabel(filters.status)}</strong>
            </span>
          ) : null}

          {filters.tipo ? (
            <span className="espiagro-alert-filter-pill">
              <span>Tipo</span>
              <strong>{getTipoFilterLabel(filters.tipo)}</strong>
            </span>
          ) : null}

          {filters.severidade ? (
            <span className="espiagro-alert-filter-pill">
              <span>Atenção</span>
              <strong>{getSeveridadeFilterLabel(filters.severidade)}</strong>
            </span>
          ) : null}

          {filters.lido ? (
            <span className="espiagro-alert-filter-pill">
              <span>Visualização</span>
              <strong>{getLidoFilterLabel(filters.lido)}</strong>
            </span>
          ) : null}

          <button
            type="button"
            className="espiagro-alert-clear-filter-button"
            onClick={onClearFilters}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="espiagro-alert-search-help">
          <span aria-hidden="true" />
          <p>
            Use a busca para localizar um aviso específico ou toque em{" "}
            <strong>Filtrar</strong> para refinar por situação, tipo, gravidade
            ou visualização.
          </p>
        </div>
      )}
    </section>
  );
}