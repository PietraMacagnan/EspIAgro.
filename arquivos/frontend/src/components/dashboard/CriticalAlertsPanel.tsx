import { useState } from "react";

type AlertaCritico = {
  id: number;
  talhao_nome: string | null;
  data_observacao: string;
  nivel_atencao_display: string;
  faixa_risco_display: string;
  prioridade_operacional_display: string;
  resumo_diagnostico: string;
  justificativa_risco: string;
};

type CriticalAlertsPanelProps = {
  alerts: AlertaCritico[];
};

function formatDate(dateString: string | undefined): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("pt-BR");
}

export default function CriticalAlertsPanel({
  alerts,
}: CriticalAlertsPanelProps) {
  const [expandedAlertIds, setExpandedAlertIds] = useState<number[]>([]);

  function toggleAlert(alertId: number): void {
    setExpandedAlertIds((current) =>
      current.includes(alertId)
        ? current.filter((id) => id !== alertId)
        : [...current, alertId],
    );
  }

  return (
    <section className="espiagro-section-card">
      <div className="espiagro-section-header">
        <div>
          <span className="espiagro-panel-kicker">Alertas da lavoura</span>
          <h3>Situações que precisam de atenção</h3>
          <p>
            Acompanhe os avisos importantes para priorizar as ações no campo e
            agir no momento certo.
          </p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="espiagro-empty-card espiagro-empty-card-compact">
          <span className="espiagro-panel-kicker">
            Nenhum alerta ativo no momento
          </span>
          <p>
            Sua lavoura não possui alertas importantes registrados agora.
            Continue acompanhando as coletas de campo.
          </p>
        </div>
      ) : (
        <div className="espiagro-list-wrap">
          {alerts.map((alerta) => {
            const isExpanded = expandedAlertIds.includes(alerta.id);
            const talhaoLabel = alerta.talhao_nome || `Coleta #${alerta.id}`;

            return (
              <article key={alerta.id} className="espiagro-alert-card">
                <div className="espiagro-monitoring-card-topline">
                  <span className="espiagro-badge espiagro-badge-red">
                    {alerta.prioridade_operacional_display ||
                      "Atenção necessária"}
                  </span>

                  <span className="espiagro-badge espiagro-badge-amber">
                    Risco {alerta.faixa_risco_display || "não informado"}
                  </span>
                </div>

                <h3>{talhaoLabel}</h3>

                <p className="espiagro-list-meta">
                  Registro em {formatDate(alerta.data_observacao)} • Atenção:{" "}
                  {alerta.nivel_atencao_display || "não informada"}
                </p>

                <div className="espiagro-note-box espiagro-note-box-mt-14">
                  <strong>Resumo da situação</strong>
                  <p>
                    {alerta.resumo_diagnostico ||
                      "Ainda não há um resumo detalhado para este alerta."}
                  </p>
                </div>

                {isExpanded ? (
                  <div className="espiagro-expanded-details">
                    <div className="espiagro-detail-grid espiagro-detail-grid-compact">
                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">Talhão</span>
                        <strong className="espiagro-detail-value">
                          {talhaoLabel}
                        </strong>
                      </div>

                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">
                          Data da observação
                        </span>
                        <strong className="espiagro-detail-value">
                          {formatDate(alerta.data_observacao)}
                        </strong>
                      </div>

                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">
                          Faixa de risco
                        </span>
                        <strong className="espiagro-detail-value">
                          {alerta.faixa_risco_display || "Não informado"}
                        </strong>
                      </div>

                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">
                          Prioridade no campo
                        </span>
                        <strong className="espiagro-detail-value">
                          {alerta.prioridade_operacional_display ||
                            "Não informada"}
                        </strong>
                      </div>
                    </div>

                    {alerta.justificativa_risco ? (
                      <div className="espiagro-note-box espiagro-note-box-mt-14">
                        <strong>Por que este alerta merece atenção?</strong>
                        <p>{alerta.justificativa_risco}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="espiagro-card-toggle"
                  onClick={() => toggleAlert(alerta.id)}
                >
                  {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}