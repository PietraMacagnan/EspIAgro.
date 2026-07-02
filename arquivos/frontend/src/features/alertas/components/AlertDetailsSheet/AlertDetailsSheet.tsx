import type { Alerta } from "@/features/alertas/types/alerta.types";
import {
  formatAlertDateTime,
  getActiveDescription,
  getPrimaryMessage,
  getPrimaryRecommendation,
  getPrimaryTitle,
  getPriorityBadgeClass,
  getPriorityDescription,
  getReadablePriority,
  getReadableSeverity,
  getReadableStatus,
  getReadableType,
  getReadDescription,
  getSeverityBadgeClass,
  getSeverityDescription,
  getStatusBadgeClass,
  getStatusDescription,
  getTypeDescription,
} from "@/features/alertas/utils/alerta.helpers";

type AlertDetailsSheetProps = {
  alerta: Alerta | null;
  isMutating: boolean;
  onClose: () => void;
  onEdit: (alerta: Alerta) => void;
  onMarkAsRead: (alertaId: number) => void;
  onResolve: (alertaId: number) => void;
  onReactivate: (alertaId: number) => void;
  onArchive: (alertaId: number) => void;
  onDelete: (alertaId: number) => void;
};

export default function AlertDetailsSheet({
  alerta,
  isMutating,
  onClose,
  onEdit,
  onMarkAsRead,
  onResolve,
  onReactivate,
  onArchive,
  onDelete,
}: AlertDetailsSheetProps) {
  if (!alerta) {
    return null;
  }

  return (
    <section
      className="espiagro-alert-details-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="espiagro-alert-details-title"
      aria-describedby="espiagro-alert-details-description"
      onClick={onClose}
    >
      <div
        className="espiagro-alert-details-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="espiagro-alert-sheet-handle" aria-hidden="true" />

        <header className="espiagro-alert-details-header">
          <div>
            <span className="espiagro-panel-kicker">Detalhes do aviso</span>
            <h2 id="espiagro-alert-details-title">{getPrimaryTitle(alerta)}</h2>
            <p id="espiagro-alert-details-description">
              {alerta.talhao_nome || "Talhão não informado"}
              {alerta.propriedade_nome ? ` • ${alerta.propriedade_nome}` : ""}
            </p>
          </div>

          <button
            type="button"
            className="espiagro-alert-sheet-close"
            onClick={onClose}
            aria-label="Fechar detalhes do aviso"
          >
            ×
          </button>
        </header>

        <div className="espiagro-alert-details-scroll">
          <div className="espiagro-alert-main-note">
            <strong>O que está acontecendo</strong>
            <p>{getPrimaryMessage(alerta)}</p>
          </div>

          <div className="espiagro-alert-status-grid">
            <div className="espiagro-info-block">
              <h4>Situação do aviso</h4>
              <span className={`espiagro-badge ${getStatusBadgeClass(alerta.status)}`}>
                {getReadableStatus(alerta)}
              </span>
              <p>{getStatusDescription(alerta.status)}</p>
            </div>

            <div className="espiagro-info-block">
              <h4>Nível de atenção</h4>
              <span
                className={`espiagro-badge ${getSeverityBadgeClass(
                  alerta.severidade,
                )}`}
              >
                {getReadableSeverity(alerta)}
              </span>
              <p>{getSeverityDescription(alerta.severidade)}</p>
            </div>

            <div className="espiagro-info-block">
              <h4>Prioridade</h4>
              <span
                className={`espiagro-badge ${getPriorityBadgeClass(
                  alerta.prioridade,
                )}`}
              >
                {getReadablePriority(alerta)}
              </span>
              <p>{getPriorityDescription(alerta.prioridade)}</p>
            </div>

            <div className="espiagro-info-block">
              <h4>Tipo de aviso</h4>
              <span
                className={`espiagro-badge ${getSeverityBadgeClass(
                  alerta.severidade,
                )}`}
              >
                {getReadableType(alerta)}
              </span>
              <p>{getTypeDescription(alerta.tipo, alerta.tipo_display)}</p>
            </div>

            <div className="espiagro-info-block">
              <h4>Visualização</h4>
              <span
                className={`espiagro-badge ${
                  alerta.lido ? "espiagro-badge-green" : "espiagro-badge-amber"
                }`}
              >
                {alerta.lido ? "Já visto" : "Precisa revisar"}
              </span>
              <p>{getReadDescription(alerta.lido)}</p>
            </div>

            <div className="espiagro-info-block">
              <h4>Histórico</h4>
              <span
                className={`espiagro-badge ${
                  alerta.ativa === false
                    ? "espiagro-badge-red"
                    : "espiagro-badge-green"
                }`}
              >
                {alerta.ativa === false ? "Guardado no histórico" : "Disponível"}
              </span>
              <p>{getActiveDescription(alerta.ativa)}</p>
            </div>
          </div>

          <div className="espiagro-detail-grid">
            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Talhão</span>
              <span className="espiagro-detail-value">
                {alerta.talhao_nome || "-"}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Propriedade</span>
              <span className="espiagro-detail-value">
                {alerta.propriedade_nome || "-"}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Gerado em</span>
              <span className="espiagro-detail-value">
                {formatAlertDateTime(alerta.gerado_em || alerta.created_at)}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Última atualização</span>
              <span className="espiagro-detail-value">
                {formatAlertDateTime(alerta.updated_at)}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Precisa de confirmação</span>
              <span className="espiagro-detail-value">
                {alerta.exige_confirmacao ? "Sim" : "Não"}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Escopo</span>
              <span className="espiagro-detail-value">
                {alerta.escopo_agronomico || "-"}
              </span>
            </div>
          </div>

          <div className="espiagro-note-box">
            <strong>Orientação recomendada</strong>
            <p>{getPrimaryRecommendation(alerta)}</p>
          </div>

          {alerta.regra_origem ? (
            <div className="espiagro-note-box">
              <strong>Como o aviso foi identificado</strong>
              <p>{alerta.regra_origem}</p>
            </div>
          ) : null}

          {alerta.resolvido_em ? (
            <div className="espiagro-note-box">
              <strong>Resolvido em</strong>
              <p>{formatAlertDateTime(alerta.resolvido_em)}</p>
            </div>
          ) : null}

          <div className="espiagro-alert-action-panel">
            <strong>Ações do aviso</strong>
            <p>
              Use estas ações para registrar o acompanhamento, marcar como visto,
              resolver ou guardar o aviso no histórico.
            </p>

            <div className="espiagro-alert-action-grid">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-primary"
                onClick={() => onEdit(alerta)}
                disabled={isMutating}
              >
                Revisar informações
              </button>

              {!alerta.lido ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-success"
                  onClick={() => onMarkAsRead(alerta.id)}
                  disabled={isMutating}
                >
                  Marcar como visto
                </button>
              ) : null}

              {alerta.status !== "resolvido" ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-success"
                  onClick={() => onResolve(alerta.id)}
                  disabled={isMutating}
                >
                  Marcar como resolvido
                </button>
              ) : (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={() => onReactivate(alerta.id)}
                  disabled={isMutating}
                >
                  Reabrir aviso
                </button>
              )}

              {alerta.ativa === false ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={() => onReactivate(alerta.id)}
                  disabled={isMutating}
                >
                  Restaurar no histórico
                </button>
              ) : (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={() => onArchive(alerta.id)}
                  disabled={isMutating}
                >
                  Guardar no histórico
                </button>
              )}

              <button
                type="button"
                className="espiagro-btn espiagro-btn-danger"
                onClick={() => onDelete(alerta.id)}
                disabled={isMutating}
              >
                Excluir aviso
              </button>
            </div>
          </div>
        </div>

        <footer className="espiagro-alert-details-footer">
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