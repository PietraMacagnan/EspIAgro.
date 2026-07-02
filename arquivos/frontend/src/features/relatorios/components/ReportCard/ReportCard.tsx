import type {
  Relatorio,
  RiscoMonitoramento,
} from "@/features/relatorios/types/relatorio.types";
import {
  getPdfExplanation,
  getPhenologyDisplayCode,
  getPhenologyDisplayDescription,
  getRelatorioTone,
  getReportDisplayTitle,
  getStatusExplanation,
  isPdfAvailable,
  truncateText,
} from "@/features/relatorios/utils/relatorio.helpers";

type ReportCardProps = {
  relatorio: Relatorio;
  onOpenDetails: (relatorioId: number) => void;
};

function normalizeText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getAttentionIndicator(
  riscoMonitoramento: RiscoMonitoramento | undefined,
): string {
  if (!riscoMonitoramento) {
    return "Aguardando análise";
  }

  const textoBase = normalizeText(
    [
      riscoMonitoramento.nivel_gravidade,
      riscoMonitoramento.nivel_gravidade_display,
      riscoMonitoramento.prioridade_operacional,
      riscoMonitoramento.prioridade_operacional_display,
      riscoMonitoramento.faixa_risco_display,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (
    textoBase.includes("crit") ||
    textoBase.includes("alto") ||
    textoBase.includes("alta") ||
    textoBase.includes("imediat")
  ) {
    return "Atenção elevada";
  }

  if (
    textoBase.includes("medio") ||
    textoBase.includes("media") ||
    textoBase.includes("moderad")
  ) {
    return "Atenção moderada";
  }

  if (
    textoBase.includes("baixo") ||
    textoBase.includes("baixa") ||
    textoBase.includes("leve")
  ) {
    return "Atenção preventiva";
  }

  return "Acompanhamento recomendado";
}

function getAttentionExplanation(
  riscoMonitoramento: RiscoMonitoramento | undefined,
): string {
  if (riscoMonitoramento?.justificativa_risco) {
    return truncateText(riscoMonitoramento.justificativa_risco, 96);
  }

  if (riscoMonitoramento) {
    return "Abra os detalhes para ver os fatores observados, possíveis causas e ações recomendadas.";
  }

  return "A análise será exibida quando houver dados suficientes do monitoramento.";
}

export default function ReportCard({
  relatorio,
  onOpenDetails,
}: ReportCardProps) {
  const tone = getRelatorioTone(relatorio);
  const riscoMonitoramento = relatorio.conteudo_json?.risco_monitoramento;
  const identificacaoFenologica =
    relatorio.conteudo_json?.identificacao_fenologica;

  const estadioFenologicoDisplayCode = getPhenologyDisplayCode(
    identificacaoFenologica,
  );

  const estadioFenologicoDescription = getPhenologyDisplayDescription(
    identificacaoFenologica,
  );

  return (
    <article className={`espiagro-report-card espiagro-report-card-${tone}`}>
      <div className="espiagro-report-card-main">
        <div className="espiagro-report-card-icon" aria-hidden="true">
          📄
        </div>

        <div className="espiagro-report-card-content">
          <h3>{getReportDisplayTitle(relatorio)}</h3>

          <p className="espiagro-report-card-meta">
            {relatorio.talhao_nome || "Talhão não informado"}
            {relatorio.propriedade_nome
              ? ` • ${relatorio.propriedade_nome}`
              : ""}
          </p>

          <p className="espiagro-report-card-summary">
            {truncateText(
              relatorio.resumo || "Resumo ainda não disponível.",
              135,
            )}
          </p>

          <div className="espiagro-report-info-grid">
            <div className="espiagro-report-info-chip">
              <span>Situação</span>
              <strong>
                {relatorio.status_display || relatorio.status || "Sem status"}
              </strong>
              <small>{getStatusExplanation(relatorio.status)}</small>
            </div>

            <div className="espiagro-report-info-chip">
              <span>Fase da cultura</span>
              <strong>{estadioFenologicoDisplayCode}</strong>
              <small>{estadioFenologicoDescription}</small>
            </div>

            <div className="espiagro-report-info-chip">
              <span>Indicador de atenção</span>
              <strong>{getAttentionIndicator(riscoMonitoramento)}</strong>
              <small>{getAttentionExplanation(riscoMonitoramento)}</small>
            </div>

            <div className="espiagro-report-info-chip">
              <span>PDF</span>
              <strong>
                {isPdfAvailable(relatorio) ? "Disponível" : "Pendente"}
              </strong>
              <small>{getPdfExplanation(relatorio)}</small>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="espiagro-report-details-button"
        onClick={() => onOpenDetails(relatorio.id)}
      >
        Ver análise completa
      </button>
    </article>
  );
}