import { useState } from "react";

import PhenologyBadge from "@/components/phenology/PhenologyBadge";

type MonitoramentoRecente = {
  id: number;
  talhao_nome: string;
  data_observacao: string;
  estadio_fenologico?: string;
  estadio_fenologico_display: string;
  nivel_atencao_display: string;
  faixa_risco_display: string;
  prioridade_operacional_display: string;
  resumo_diagnostico: string;
};

type RecentMonitoringsPanelProps = {
  monitorings: MonitoramentoRecente[];
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

function extractPhenologyCode(value?: string | null): string {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const firstPart = trimmedValue.split("-")[0]?.trim();

  return firstPart.toUpperCase();
}

export default function RecentMonitoringsPanel({
  monitorings,
}: RecentMonitoringsPanelProps) {
  const [expandedMonitoringIds, setExpandedMonitoringIds] = useState<number[]>(
    [],
  );

  function toggleMonitoring(monitoringId: number): void {
    setExpandedMonitoringIds((current) =>
      current.includes(monitoringId)
        ? current.filter((id) => id !== monitoringId)
        : [...current, monitoringId],
    );
  }

  return (
    <section className="espiagro-section-card">
      <div className="espiagro-section-header">
        <div>
          <span className="espiagro-panel-kicker">Coletas de campo</span>
          <h3>Últimos acompanhamentos da lavoura</h3>
          <p>
            Veja os registros mais recentes, com fase da cultura, nível de
            atenção e informações importantes para o manejo.
          </p>
        </div>
      </div>

      {monitorings.length === 0 ? (
        <div className="espiagro-empty-card espiagro-empty-card-compact">
          <span className="espiagro-panel-kicker">
            Nenhuma coleta registrada
          </span>
          <p>
            Assim que uma nova coleta de campo for cadastrada, ela aparecerá
            aqui para acompanhamento.
          </p>
        </div>
      ) : (
        <div className="espiagro-list-wrap">
          {monitorings.map((monitoramento) => {
            const isExpanded = expandedMonitoringIds.includes(
              monitoramento.id,
            );

            const talhaoLabel =
              monitoramento.talhao_nome || `Coleta #${monitoramento.id}`;

            const estadioLabel =
              monitoramento.estadio_fenologico_display ||
              "Estádio não informado";

            const estadioCode =
              monitoramento.estadio_fenologico ||
              extractPhenologyCode(monitoramento.estadio_fenologico_display);

            return (
              <article
                key={monitoramento.id}
                className="espiagro-monitoring-card"
              >
                <div className="espiagro-monitoring-card-topline">
                  <span className="espiagro-badge espiagro-badge-blue">
                    Atenção:{" "}
                    {monitoramento.nivel_atencao_display || "não informada"}
                  </span>

                  <span className="espiagro-badge espiagro-badge-green">
                    Risco:{" "}
                    {monitoramento.faixa_risco_display || "não informado"}
                  </span>
                </div>

                <h3>{talhaoLabel}</h3>

                <p className="espiagro-list-meta">
                  Coleta em {formatDate(monitoramento.data_observacao)}
                </p>

                <PhenologyBadge
                  code={estadioCode}
                  label={estadioLabel}
                  variant="card"
                  showSupportText
                />

                <div className="espiagro-note-box espiagro-note-box-mt-14">
                  <strong>Resumo da coleta</strong>
                  <p>
                    {monitoramento.resumo_diagnostico ||
                      "Sem anomalias registradas até o momento."}
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
                          Data da coleta
                        </span>
                        <strong className="espiagro-detail-value">
                          {formatDate(monitoramento.data_observacao)}
                        </strong>
                      </div>

                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">
                          Nível de atenção
                        </span>
                        <strong className="espiagro-detail-value">
                          {monitoramento.nivel_atencao_display ||
                            "Não informado"}
                        </strong>
                      </div>

                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">
                          Prioridade no campo
                        </span>
                        <strong className="espiagro-detail-value">
                          {monitoramento.prioridade_operacional_display ||
                            "Não informada"}
                        </strong>
                      </div>

                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">
                          Fase registrada
                        </span>
                        <strong className="espiagro-detail-value">
                          {estadioLabel}
                        </strong>
                      </div>

                      <div className="espiagro-detail-box">
                        <span className="espiagro-detail-label">
                          Faixa de risco
                        </span>
                        <strong className="espiagro-detail-value">
                          {monitoramento.faixa_risco_display ||
                            "Não informada"}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="espiagro-card-toggle"
                  onClick={() => toggleMonitoring(monitoramento.id)}
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