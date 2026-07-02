import type { Monitoramento } from "../../types/monitoramento.types";
import {
  formatDate,
  hasMonitoringImage,
  isCriticalMonitoring,
  isReadyForDiagnosis,
} from "../../utils/monitoramento.helpers";

type MonitoringHeroProps = {
  monitoramentos: Monitoramento[];
  onCreateMonitoring: () => void;
};

function getMostRecentMonitoringDate(
  monitoramentos: Monitoramento[],
): string | null {
  if (monitoramentos.length === 0) {
    return null;
  }

  const validDates = monitoramentos
    .map((item) => item.data_observacao)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return validDates[0] ?? null;
}

export default function MonitoringHero({
  monitoramentos,
  onCreateMonitoring,
}: MonitoringHeroProps) {
  const totalMonitoramentos = monitoramentos.length;
  const totalCriticos = monitoramentos.filter(isCriticalMonitoring).length;
  const totalProntos = monitoramentos.filter(isReadyForDiagnosis).length;
  const totalComImagem = monitoramentos.filter(hasMonitoringImage).length;
  const dataMaisRecente = getMostRecentMonitoringDate(monitoramentos);

  return (
    <section className="espiagro-page-hero espiagro-monitoramentos-hero">
      <div className="espiagro-page-hero-main">
        <span className="espiagro-relatorios-kicker">Monitoramentos</span>

        <h1>Acompanhe cada coleta da lavoura com clareza</h1>

        <p>
          Registre observações de campo, imagem, localização e fase da cultura
          para apoiar diagnósticos, alertas e relatórios mais confiáveis.
        </p>

        <div className="espiagro-relatorios-band">
          <span>
            {totalMonitoramentos > 0
              ? `${totalMonitoramentos} coletas registradas`
              : "Nenhuma coleta registrada ainda"}
          </span>

          {dataMaisRecente ? (
            <span>Última coleta em {formatDate(dataMaisRecente)}</span>
          ) : null}
        </div>

        <div className="espiagro-relatorios-actions">
          <button
            type="button"
            className="espiagro-btn espiagro-btn-primary"
            onClick={onCreateMonitoring}
          >
            Nova coleta
          </button>
        </div>
      </div>

      <div className="espiagro-page-hero-side">
        <article className="espiagro-mini-card">
          <span className="espiagro-mini-label">Atenção no campo</span>
          <strong>
            {totalCriticos > 0
              ? `${totalCriticos} coletas precisam de prioridade`
              : "Nenhuma coleta crítica no momento"}
          </strong>
        </article>

        <article className="espiagro-mini-card">
          <span className="espiagro-mini-label">Prontas para análise</span>
          <strong>{totalProntos} coletas com dados suficientes</strong>
        </article>

        <article className="espiagro-mini-card">
          <span className="espiagro-mini-label">Imagens registradas</span>
          <strong>{totalComImagem} coletas com foto da lavoura</strong>
        </article>
      </div>
    </section>
  );
}