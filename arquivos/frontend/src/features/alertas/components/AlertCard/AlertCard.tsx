import type { Alerta } from "@/features/alertas/types/alerta.types";
import {
  getAlertCardIcon,
  getAlertTone,
  getPrimaryMessage,
  getPrimaryRecommendation,
  getPrimaryTitle,
  getPriorityDescription,
  getReadDescription,
  getReadablePriority,
  getReadableSeverity,
  getReadableStatus,
  getReadableType,
  getSeverityBadgeClass,
  getStatusDescription,
  getTypeDescription,
} from "@/features/alertas/utils/alerta.helpers";

type AlertCardProps = {
  alerta: Alerta;
  onOpenDetails: (alertaId: number) => void;
};

export default function AlertCard({ alerta, onOpenDetails }: AlertCardProps) {
  const tone = getAlertTone(alerta);

  return (
    <article className={`espiagro-alert-card espiagro-alert-card-${tone}`}>
      <div className="espiagro-alert-card-main">
        <div className="espiagro-alert-card-icon" aria-hidden="true">
          {getAlertCardIcon(tone)}
        </div>

        <div className="espiagro-alert-card-content">
          <div className="espiagro-alert-card-title-row">
            <div>
              <span className="espiagro-alert-card-label">
                {alerta.lido ? "Aviso visualizado" : "Novo aviso"}
              </span>

              <h3>{getPrimaryTitle(alerta)}</h3>
            </div>

            <span
              className={`espiagro-badge ${getSeverityBadgeClass(
                alerta.severidade,
              )}`}
            >
              {getReadableSeverity(alerta)}
            </span>
          </div>

          <p className="espiagro-alert-card-message">
            {getPrimaryMessage(alerta)}
          </p>

          <div className="espiagro-alert-context-row">
            <span>
              <strong>Talhão:</strong> {alerta.talhao_nome || "-"}
            </span>
            <span>
              <strong>Propriedade:</strong> {alerta.propriedade_nome || "-"}
            </span>
          </div>

          <div className="espiagro-alert-info-grid">
            <div className="espiagro-alert-info-chip">
              <span>Situação</span>
              <strong>{getReadableStatus(alerta)}</strong>
              <small>{getStatusDescription(alerta.status)}</small>
            </div>

            <div className="espiagro-alert-info-chip">
              <span>Prioridade</span>
              <strong>{getReadablePriority(alerta)}</strong>
              <small>{getPriorityDescription(alerta.prioridade)}</small>
            </div>

            <div className="espiagro-alert-info-chip">
              <span>Tipo de aviso</span>
              <strong>{getReadableType(alerta)}</strong>
              <small>{getTypeDescription(alerta.tipo, alerta.tipo_display)}</small>
            </div>

            <div className="espiagro-alert-info-chip">
              <span>Visualização</span>
              <strong>{alerta.lido ? "Já visto" : "Precisa revisar"}</strong>
              <small>{getReadDescription(alerta.lido)}</small>
            </div>
          </div>

          <div className="espiagro-alert-recommendation">
            <strong>Orientação</strong>
            <p>{getPrimaryRecommendation(alerta)}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="espiagro-alert-details-button"
        onClick={() => onOpenDetails(alerta.id)}
      >
        Ver detalhes e ações
      </button>
    </article>
  );
}