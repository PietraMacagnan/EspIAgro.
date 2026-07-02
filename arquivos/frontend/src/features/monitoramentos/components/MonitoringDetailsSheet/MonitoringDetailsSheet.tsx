import PhenologyBadge from "@/components/phenology/PhenologyBadge";

import type { Monitoramento } from "../../types/monitoramento.types";
import {
  formatDate,
  getCriticalPendingFields,
  getFeedbackGuidance,
  getLocationReading,
  getMonitoringDataReadings,
  getMonitoringImageUrl,
  getMonitoringInconsistencies,
  getMonitoringRiskReadings,
  getMonitoringSituationReading,
  getRecommendedPendingFields,
  type MonitoringFieldReading,
} from "../../utils/monitoramento.helpers";

type MonitoringDetailsSheetProps = {
  item: Monitoramento | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onEdit: (item: Monitoramento) => void;
  onArchive: (item: Monitoramento) => void;
  onRestore: (item: Monitoramento) => void;
  onDelete: (item: Monitoramento) => void;
};

type ReadingGridProps = {
  readings: MonitoringFieldReading[];
  columns?: "two" | "three";
};

function ReadingGrid({ readings, columns = "two" }: ReadingGridProps) {
  const gridClassName =
    columns === "three" ? "espiagro-detail-grid-3" : "espiagro-detail-grid";

  return (
    <div className={gridClassName}>
      {readings.map((reading) => (
        <div
          key={`${reading.label}-${reading.value}`}
          className={`espiagro-detail-box espiagro-reading-${reading.tone ?? "blue"}`}
        >
          <span className="espiagro-detail-label">{reading.label}</span>
          <span className="espiagro-detail-value">{reading.value}</span>
          <small className="espiagro-detail-helper">{reading.helper}</small>
        </div>
      ))}
    </div>
  );
}

export default function MonitoringDetailsSheet({
  item,
  isOpen,
  isSubmitting,
  onClose,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: MonitoringDetailsSheetProps) {
  if (!isOpen || !item) {
    return null;
  }

  const imageUrl = getMonitoringImageUrl(item);
  const situationReading = getMonitoringSituationReading(item);
  const riskReadings = getMonitoringRiskReadings(item);
  const dataReadings = getMonitoringDataReadings(item);
  const locationReading = getLocationReading(item);
  const feedbackOrientacoes = getFeedbackGuidance(item);
  const pendentesCriticos = getCriticalPendingFields(item);
  const pendentesRecomendados = getRecommendedPendingFields(item);
  const inconsistencias = getMonitoringInconsistencies(item);
  const isActive = item.ativa !== false;

  return (
    <div
      className="espiagro-monitoring-details-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="espiagro-monitoring-details-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitoring-details-title"
        aria-describedby="monitoring-details-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="espiagro-monitoring-details-handle" />

        <header className="espiagro-monitoring-details-header">
          <div>
            <span className="espiagro-panel-kicker">Detalhes da coleta</span>

            <h2 id="monitoring-details-title">
              {item.talhao_nome || `Coleta #${item.id}`}
            </h2>

            <p id="monitoring-details-description">
              Observação registrada em {formatDate(item.data_observacao)}.
            </p>
          </div>

          <button
            type="button"
            className="espiagro-form-sheet-close"
            onClick={onClose}
            aria-label="Fechar detalhes da coleta"
            disabled={isSubmitting}
          >
            ×
          </button>
        </header>

        <div className="espiagro-monitoring-details-scroll">
          {imageUrl ? (
            <div className="espiagro-monitoring-details-image">
              <img
                src={imageUrl}
                alt={`Imagem da coleta ${item.talhao_nome || item.id}`}
              />
            </div>
          ) : (
            <div className="espiagro-monitoring-details-image is-empty">
              <span>📷</span>
              <strong>Sem imagem registrada</strong>
              <p>
                Uma foto da lavoura ajuda na comparação visual, no histórico e
                na qualidade dos relatórios.
              </p>
            </div>
          )}

          <PhenologyBadge
            code={item.estadio_fenologico}
            label={item.estadio_fenologico_display}
            variant="card"
            showSupportText
          />

          <div
            className={`espiagro-note-box espiagro-reading-${situationReading.tone}`}
          >
            <strong>{situationReading.title}</strong>
            <p>{situationReading.description}</p>
          </div>

          <section className="espiagro-monitoring-details-section">
            <div className="espiagro-monitoring-details-section-header">
              <strong>Leitura técnica da coleta</strong>
              <p>
                Interpretação gerada a partir dos dados disponíveis na coleta e
                das regras de análise do aplicativo.
              </p>
            </div>

            <ReadingGrid readings={riskReadings} />
          </section>

          <section className="espiagro-monitoring-details-section">
            <div className="espiagro-monitoring-details-section-header">
              <strong>Dados registrados em campo</strong>
              <p>
                Estes dados são informados pelo usuário durante a coleta. Quando
                vierem de medição, sensor ou amostragem, registre a origem nas
                anotações.
              </p>
            </div>

            <ReadingGrid readings={dataReadings} columns="three" />
          </section>

          <div className="espiagro-note-box">
            <strong>{locationReading.label}</strong>
            <p>
              <strong>{locationReading.value}</strong>
            </p>
            <p>{locationReading.helper}</p>
          </div>

          {item.risco?.justificativa_risco || item.justificativa_risco ? (
            <div className="espiagro-note-box">
              <strong>Como interpretar esta leitura</strong>
              <p>
                {item.risco?.justificativa_risco || item.justificativa_risco}
              </p>
            </div>
          ) : null}

          {item.feedback_ui?.mensagem_status ? (
            <div className="espiagro-note-box">
              <strong>Qualidade das informações da coleta</strong>
              <p>{item.feedback_ui.mensagem_status}</p>
            </div>
          ) : null}

          {feedbackOrientacoes.length > 0 ? (
            <div className="espiagro-note-box">
              <strong>Orientações para melhorar o registro</strong>
              <ul>
                {feedbackOrientacoes.map((orientacao, index) => (
                  <li key={`${item.id}-orientacao-${index}`}>{orientacao}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {pendentesCriticos.length > 0 ? (
            <div className="espiagro-note-box">
              <strong>Informações importantes ainda ausentes</strong>
              <ul>
                {pendentesCriticos.map((pendencia, index) => (
                  <li key={`${item.id}-critico-${index}`}>{pendencia}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {pendentesRecomendados.length > 0 ? (
            <div className="espiagro-note-box">
              <strong>Informações recomendadas</strong>
              <ul>
                {pendentesRecomendados.map((pendencia, index) => (
                  <li key={`${item.id}-recomendado-${index}`}>{pendencia}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {inconsistencias.length > 0 ? (
            <div className="espiagro-note-box">
              <strong>Pontos para revisar</strong>
              <ul>
                {inconsistencias.map((inconsistencia, index) => (
                  <li key={`${item.id}-inconsistencia-${index}`}>
                    {inconsistencia}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {typeof item.completude_coleta?.percentual_completude ===
          "number" ? (
            <div className="espiagro-note-box">
              <strong>Preenchimento da coleta</strong>
              <p>
                Esta coleta está com{" "}
                {item.completude_coleta.percentual_completude}% das informações
                esperadas preenchidas. Quanto mais completo o registro, melhor a
                qualidade dos alertas, diagnósticos e relatórios.
              </p>
            </div>
          ) : null}

          {item.observacoes ? (
            <div className="espiagro-note-box">
              <strong>Anotações feitas no campo</strong>
              <p>{item.observacoes}</p>
            </div>
          ) : null}
        </div>

        <footer className="espiagro-monitoring-details-footer">
          <button
            type="button"
            className="espiagro-btn espiagro-btn-primary"
            onClick={() => onEdit(item)}
            disabled={isSubmitting}
          >
            Editar coleta
          </button>

          {isActive ? (
            <button
              type="button"
              className="espiagro-btn espiagro-btn-ghost"
              onClick={() => onArchive(item)}
              disabled={isSubmitting}
            >
              Arquivar
            </button>
          ) : (
            <button
              type="button"
              className="espiagro-btn espiagro-btn-ghost"
              onClick={() => onRestore(item)}
              disabled={isSubmitting}
            >
              Reativar
            </button>
          )}

          <button
            type="button"
            className="espiagro-btn espiagro-btn-danger"
            onClick={() => onDelete(item)}
            disabled={isSubmitting}
          >
            Excluir
          </button>
        </footer>
      </section>
    </div>
  );
}