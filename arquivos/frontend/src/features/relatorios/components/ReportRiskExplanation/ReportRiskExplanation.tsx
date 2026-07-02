import "./ReportRiskExplanation.css";

import { getRiskBadgeClassFromRisk } from "@/features/relatorios/utils/relatorio.helpers";

import type { RiscoMonitoramento } from "@/features/relatorios/types/relatorio.types";

type ApoioDiagnosticoUI = {
  interpretacao_agronomica?: string;
  pontos_principais?: string[];
  recomendacoes_iniciais?: string[];
};

type ApoioDiagnosticoData = {
  ui?: ApoioDiagnosticoUI;
};

type RiscoMonitoramentoExplicavel = RiscoMonitoramento & {
  justificativa_risco?: string;
  nivel_gravidade?: string;
  nivel_gravidade_display?: string;
  prioridade_operacional?: string;
  prioridade_operacional_display?: string;
  faixa_risco_display?: string;
};

type ReportRiskExplanationProps = {
  riscoMonitoramento?: RiscoMonitoramentoExplicavel | null;
  apoioDiagnostico?: ApoioDiagnosticoData | null;
  referencias?: unknown[];
};

function normalizeText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buildRiskText(riscoMonitoramento?: RiscoMonitoramentoExplicavel | null) {
  return normalizeText(
    [
      riscoMonitoramento?.nivel_gravidade,
      riscoMonitoramento?.nivel_gravidade_display,
      riscoMonitoramento?.prioridade_operacional,
      riscoMonitoramento?.prioridade_operacional_display,
      riscoMonitoramento?.faixa_risco_display,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getAttentionIndicator(
  riscoMonitoramento?: RiscoMonitoramentoExplicavel | null,
): string {
  if (!riscoMonitoramento) {
    return "Análise em andamento";
  }

  const textoBase = buildRiskText(riscoMonitoramento);

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

function getAttentionSeverityText(
  riscoMonitoramento?: RiscoMonitoramentoExplicavel | null,
): string {
  if (!riscoMonitoramento) {
    return "Ainda não há dados suficientes para definir o nível de atenção desta área.";
  }

  const textoBase = buildRiskText(riscoMonitoramento);

  if (
    textoBase.includes("crit") ||
    textoBase.includes("alto") ||
    textoBase.includes("alta") ||
    textoBase.includes("imediat")
  ) {
    return "A situação merece atenção rápida no campo. Recomenda-se revisar a área, acompanhar a evolução e registrar novas observações.";
  }

  if (
    textoBase.includes("medio") ||
    textoBase.includes("media") ||
    textoBase.includes("moderad")
  ) {
    return "A situação pede acompanhamento próximo. Recomenda-se observar a evolução nos próximos monitoramentos.";
  }

  if (
    textoBase.includes("baixo") ||
    textoBase.includes("baixa") ||
    textoBase.includes("leve")
  ) {
    return "A situação parece estável no momento, mas deve continuar sendo acompanhada dentro da rotina de monitoramento.";
  }

  return "O sistema recomenda acompanhamento da área para confirmar a evolução da situação observada.";
}

export default function ReportRiskExplanation({
  riscoMonitoramento,
  apoioDiagnostico,
  referencias = [],
}: ReportRiskExplanationProps) {
  const indicadorAtencao = getAttentionIndicator(riscoMonitoramento);

  const riscoParaBadge = riscoMonitoramento ?? undefined;

  const justificativa =
    riscoMonitoramento?.justificativa_risco ||
    apoioDiagnostico?.ui?.interpretacao_agronomica ||
    "O sistema ainda não possui informações suficientes para explicar todos os fatores desta área.";

  const causas = apoioDiagnostico?.ui?.pontos_principais ?? [];

  const recomendacoes = apoioDiagnostico?.ui?.recomendacoes_iniciais ?? [];

  const gravidade = getAttentionSeverityText(riscoMonitoramento);

  return (
    <section className="espiagro-risk-explanation-card">
      <div className="espiagro-risk-explanation-header">
        <span
          className={`espiagro-badge ${getRiskBadgeClassFromRisk(
            riscoParaBadge,
          )}`}
        >
          {indicadorAtencao}
        </span>

        <h3>Situação atual da área</h3>

        <p>
          Esta leitura não representa uma nota da lavoura. Ela indica o nível de
          atenção observado a partir dos dados disponíveis no monitoramento.
        </p>
      </div>

      <div className="espiagro-risk-explanation-grid">
        <article className="espiagro-risk-info-box">
          <strong>Por que essa área exige atenção?</strong>

          <p>{justificativa}</p>
        </article>

        <article className="espiagro-risk-info-box">
          <strong>Quais fatores influenciaram essa análise?</strong>

          {causas.length > 0 ? (
            <ul>
              {causas.map((causa, index) => (
                <li key={`causa-${index}`}>{causa}</li>
              ))}
            </ul>
          ) : (
            <p>
              Ainda não existem fatores detalhados registrados para esta análise.
            </p>
          )}
        </article>

        <article className="espiagro-risk-info-box">
          <strong>Quão grave é esta situação?</strong>

          <p>{gravidade}</p>
        </article>

        <article className="espiagro-risk-info-box">
          <strong>O que fazer agora?</strong>

          {recomendacoes.length > 0 ? (
            <ul>
              {recomendacoes.map((recomendacao, index) => (
                <li key={`recomendacao-${index}`}>{recomendacao}</li>
              ))}
            </ul>
          ) : (
            <p>
              Continue monitorando a área e registre novas imagens e observações
              para melhorar a leitura nos próximos acompanhamentos.
            </p>
          )}
        </article>

        <article className="espiagro-risk-info-box espiagro-risk-info-box-full">
          <strong>Base técnica utilizada</strong>

          {referencias.length > 0 ? (
            <p>
              Esta análise foi apoiada por materiais técnicos, referências
              agronômicas e conteúdos especializados cadastrados na base do
              sistema.
            </p>
          ) : (
            <p>
              Nenhuma referência técnica específica foi vinculada a este
              relatório até o momento.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}