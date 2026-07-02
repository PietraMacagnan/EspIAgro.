import { NavLink } from "react-router-dom";

import { formatNumber } from "@/features/relatorios/utils/relatorio.helpers";

type ReportPageHeroProps = {
  isFetching: boolean;
  relatoriosCount: number;
  processingCount: number;
  onRefresh: () => void;
};

export default function ReportPageHero({
  isFetching,
  relatoriosCount,
  processingCount,
  onRefresh,
}: ReportPageHeroProps) {
  return (
    <section className="espiagro-relatorios-hero">
      <div className="espiagro-relatorios-hero-main">
        <span className="espiagro-relatorios-kicker">Relatórios da lavoura</span>

        <h1 className="espiagro-relatorios-title">
          Consulte relatórios, gere análises e exporte PDFs com poucos toques.
        </h1>

        <p className="espiagro-relatorios-description">
          Acompanhe os relatórios de forma simples. Abra os detalhes somente
          quando precisar da leitura completa.
        </p>

        <div className="espiagro-relatorios-band">
          {isFetching ? "Atualizando relatórios..." : "Relatórios atualizados"} •{" "}
          {relatoriosCount} relatório(s)
        </div>

        <div className="espiagro-relatorios-actions">
          <NavLink
            to="/monitoramentos"
            className="espiagro-btn espiagro-btn-primary"
          >
            Ir para coletas
          </NavLink>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-secondary"
            onClick={onRefresh}
          >
            {isFetching ? "Atualizando..." : "Atualizar relatórios"}
          </button>
        </div>
      </div>

      <div className="espiagro-relatorios-hero-side">
        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Relatórios encontrados</span>
          <strong>{formatNumber(relatoriosCount)}</strong>
        </div>

        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Em preparo</span>
          <strong>{formatNumber(processingCount)}</strong>
        </div>

        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Uso principal</span>
          <strong>Análise, PDF e consulta rápida</strong>
        </div>
      </div>
    </section>
  );
}