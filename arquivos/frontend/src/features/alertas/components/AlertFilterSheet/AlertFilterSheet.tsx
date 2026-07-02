import type {
  FiltroLido,
  FiltroSeveridade,
  FiltroStatus,
  FiltroTipo,
} from "@/features/alertas/types/alerta.types";

type AlertFilterSheetProps = {
  isOpen: boolean;
  draftStatusFiltro: FiltroStatus;
  draftTipoFiltro: FiltroTipo;
  draftSeveridadeFiltro: FiltroSeveridade;
  draftLidoFiltro: FiltroLido;
  onStatusChange: (status: FiltroStatus) => void;
  onTipoChange: (tipo: FiltroTipo) => void;
  onSeveridadeChange: (severidade: FiltroSeveridade) => void;
  onLidoChange: (lido: FiltroLido) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
};

export default function AlertFilterSheet({
  isOpen,
  draftStatusFiltro,
  draftTipoFiltro,
  draftSeveridadeFiltro,
  draftLidoFiltro,
  onStatusChange,
  onTipoChange,
  onSeveridadeChange,
  onLidoChange,
  onApply,
  onClear,
  onClose,
}: AlertFilterSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section
      className="espiagro-alert-filter-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="espiagro-alert-filter-title"
      aria-describedby="espiagro-alert-filter-description"
      onClick={onClose}
    >
      <div
        className="espiagro-alert-filter-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="espiagro-alert-sheet-handle" aria-hidden="true" />

        <header className="espiagro-alert-filter-sheet-header">
          <div>
            <span className="espiagro-panel-kicker">Filtros</span>
            <h2 id="espiagro-alert-filter-title">Filtrar avisos</h2>
            <p id="espiagro-alert-filter-description">
              Escolha como deseja refinar a lista de avisos da lavoura.
            </p>
          </div>

          <button
            type="button"
            className="espiagro-alert-sheet-close"
            onClick={onClose}
            aria-label="Fechar filtros"
          >
            ×
          </button>
        </header>

        <div className="espiagro-alert-filter-sheet-body">
          <div className="espiagro-field">
            <label htmlFor="draftStatusFiltro">Situação</label>
            <select
              id="draftStatusFiltro"
              value={draftStatusFiltro}
              onChange={(event) =>
                onStatusChange(event.target.value as FiltroStatus)
              }
            >
              <option value="">Todos</option>
              <option value="ativo">Em aberto</option>
              <option value="em_analise">Em acompanhamento</option>
              <option value="resolvido">Resolvido</option>
              <option value="ignorado">Fora da prioridade</option>
            </select>
          </div>

          <div className="espiagro-field">
            <label htmlFor="draftTipoFiltro">Tipo de aviso</label>
            <select
              id="draftTipoFiltro"
              value={draftTipoFiltro}
              onChange={(event) =>
                onTipoChange(event.target.value as FiltroTipo)
              }
            >
              <option value="">Todos</option>
              <option value="diagnostico">Diagnóstico</option>
              <option value="risco">Risco</option>
              <option value="clima">Clima</option>
              <option value="sanidade">Sanidade</option>
              <option value="umidade_solo">Umidade do solo</option>
              <option value="imagem">Imagem</option>
              <option value="operacional">Acompanhamento</option>
              <option value="anomalia">Anomalia</option>
            </select>
          </div>

          <div className="espiagro-field">
            <label htmlFor="draftSeveridadeFiltro">Nível de atenção</label>
            <select
              id="draftSeveridadeFiltro"
              value={draftSeveridadeFiltro}
              onChange={(event) =>
                onSeveridadeChange(event.target.value as FiltroSeveridade)
              }
            >
              <option value="">Todos</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>

          <div className="espiagro-field">
            <label htmlFor="draftLidoFiltro">Visualização</label>
            <select
              id="draftLidoFiltro"
              value={draftLidoFiltro}
              onChange={(event) => onLidoChange(event.target.value as FiltroLido)}
            >
              <option value="">Todos</option>
              <option value="true">Já vistos</option>
              <option value="false">Novos avisos</option>
            </select>
          </div>
        </div>

        <footer className="espiagro-alert-filter-sheet-footer">
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