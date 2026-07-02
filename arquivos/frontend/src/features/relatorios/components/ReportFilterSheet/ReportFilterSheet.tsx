import type {
  FiltroStatus,
  FiltroTipo,
} from "@/features/relatorios/types/relatorio.types";

type ReportFilterSheetProps = {
  isOpen: boolean;
  statusFiltro: FiltroStatus;
  tipoFiltro: FiltroTipo;
  onStatusChange: (value: FiltroStatus) => void;
  onTipoChange: (value: FiltroTipo) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
};

export default function ReportFilterSheet({
  isOpen,
  statusFiltro,
  tipoFiltro,
  onStatusChange,
  onTipoChange,
  onApply,
  onClear,
  onClose,
}: ReportFilterSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section
      id="espiagro-report-filter-sheet"
      className="espiagro-filter-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="espiagro-filter-sheet-title"
      aria-describedby="espiagro-filter-sheet-description"
      onClick={onClose}
    >
      <div
        className="espiagro-filter-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="espiagro-report-sheet-handle" aria-hidden="true" />

        <header className="espiagro-filter-sheet-header">
          <div>
            <span className="espiagro-panel-kicker">Filtros</span>

            <h2 id="espiagro-filter-sheet-title">Filtrar relatórios</h2>

            <p id="espiagro-filter-sheet-description">
              Escolha a situação e a categoria para refinar a lista de
              relatórios.
            </p>
          </div>

          <button
            type="button"
            className="espiagro-report-sheet-close"
            onClick={onClose}
            aria-label="Fechar filtros"
          >
            ×
          </button>
        </header>

        <div className="espiagro-filter-sheet-body">
          <div className="espiagro-field">
            <label htmlFor="draftStatusFiltro">Situação</label>

            <select
              id="draftStatusFiltro"
              value={statusFiltro}
              onChange={(event) =>
                onStatusChange(event.target.value as FiltroStatus)
              }
            >
              <option value="">Todos</option>
              <option value="pendente">Aguardando</option>
              <option value="processando">Em preparo</option>
              <option value="concluido">Finalizado</option>
              <option value="erro">Falha</option>
            </select>
          </div>

          <div className="espiagro-field">
            <label htmlFor="draftTipoFiltro">Categoria</label>

            <select
              id="draftTipoFiltro"
              value={tipoFiltro}
              onChange={(event) =>
                onTipoChange(event.target.value as FiltroTipo)
              }
            >
              <option value="">Todos</option>
              <option value="monitoramento">Coleta de campo</option>
              <option value="talhao">Talhão</option>
              <option value="propriedade">Propriedade</option>
              <option value="geral">Geral</option>
            </select>
          </div>
        </div>

        <footer className="espiagro-filter-sheet-footer">
          <button
            type="button"
            className="espiagro-btn espiagro-btn-primary"
            onClick={onApply}
          >
            Aplicar filtros
          </button>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-ghost"
            onClick={onClear}
          >
            Limpar filtros
          </button>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-ghost"
            onClick={onClose}
          >
            Fechar
          </button>
        </footer>
      </div>
    </section>
  );
}