import { MONITORAMENTO_STATUS_FILTER_OPTIONS } from "../../constants/monitoramento.constants";
import type { FiltroStatus } from "../../types/monitoramento.types";

type MonitoringFilterBarProps = {
  statusFiltro: FiltroStatus;
  totalResultados: number;
  totalGeral: number;
  onStatusChange: (value: FiltroStatus) => void;
  onCreateMonitoring: () => void;
};

export default function MonitoringFilterBar({
  statusFiltro,
  totalResultados,
  totalGeral,
  onStatusChange,
  onCreateMonitoring,
}: MonitoringFilterBarProps) {
  const hasActiveFilter = statusFiltro !== "";

  return (
    <section className="espiagro-filter-card">
      <div className="espiagro-filter-header">
        <div>
          <span className="espiagro-panel-kicker">Coletas da lavoura</span>
          <h3>Encontre e acompanhe os registros de campo</h3>
          <p>
            Filtre as coletas por situação e acompanhe rapidamente quais
            registros precisam de atenção, imagem ou análise.
          </p>
        </div>

        <button
          type="button"
          className="espiagro-btn espiagro-btn-primary"
          onClick={onCreateMonitoring}
        >
          Nova coleta
        </button>
      </div>

      <div className="espiagro-filter-fields">
        <div className="espiagro-field">
          <label htmlFor="monitoring-status-filter">Situação da coleta</label>
          <select
            id="monitoring-status-filter"
            value={statusFiltro}
            onChange={(event) =>
              onStatusChange(event.target.value as FiltroStatus)
            }
          >
            {MONITORAMENTO_STATUS_FILTER_OPTIONS.map((option) => (
              <option
                key={`${option.value || "todas"}-${option.label}`}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="espiagro-active-filters">
        <span className="espiagro-filter-chip">
          {totalResultados} de {totalGeral} coletas exibidas
        </span>

        {hasActiveFilter ? (
          <button
            type="button"
            className="espiagro-filter-chip espiagro-filter-chip-button"
            onClick={() => onStatusChange("")}
          >
            Limpar filtro
          </button>
        ) : null}
      </div>
    </section>
  );
}