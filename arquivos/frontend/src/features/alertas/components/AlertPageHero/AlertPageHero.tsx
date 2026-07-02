import { NavLink } from "react-router-dom";

import { formatAlertNumber } from "@/features/alertas/utils/alerta.helpers";

type AlertPageHeroProps = {
  isFetching: boolean;
  totalFiltrado: number;
  ativosCount: number;
  criticosCount: number;
  naoLidosCount: number;
  onRefresh: () => void;
};

export default function AlertPageHero({
  isFetching,
  totalFiltrado,
  ativosCount,
  criticosCount,
  naoLidosCount,
  onRefresh,
}: AlertPageHeroProps) {
  return (
    <section className="espiagro-alertas-hero">
      <div className="espiagro-alertas-hero-main">
        <span className="espiagro-alertas-kicker">
          EspIAgro • Avisos importantes
        </span>

        <h1 className="espiagro-alertas-title">
          Entenda o que precisa de atenção na lavoura
        </h1>

        <p className="espiagro-alertas-description">
          Veja avisos gerados pelo acompanhamento da lavoura, entenda o nível de
          atenção e acompanhe as ações recomendadas para cada área.
        </p>

        <div className="espiagro-alertas-band">
          {isFetching ? "Atualizando avisos..." : "Avisos atualizados"} •{" "}
          {totalFiltrado} aviso(s) encontrado(s)
        </div>

        <div className="espiagro-alertas-actions">
          <NavLink
            to="/monitoramentos"
            className="espiagro-btn espiagro-btn-primary"
          >
            Ver coletas de campo
          </NavLink>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-secondary"
            onClick={onRefresh}
          >
            {isFetching ? "Atualizando..." : "Atualizar avisos"}
          </button>
        </div>
      </div>

      <div className="espiagro-alertas-hero-side">
        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Precisam de atenção</span>
          <strong>{formatAlertNumber(ativosCount)}</strong>
        </div>

        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Ação urgente</span>
          <strong>{formatAlertNumber(criticosCount)}</strong>
        </div>

        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Novos avisos</span>
          <strong>{formatAlertNumber(naoLidosCount)}</strong>
        </div>
      </div>
    </section>
  );
}