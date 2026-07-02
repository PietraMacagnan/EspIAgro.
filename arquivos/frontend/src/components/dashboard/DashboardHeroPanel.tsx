import { NavLink } from "react-router-dom";

type DashboardHeroPanelProps = {
  isFetching: boolean;
  totalMonitoramentos?: number;
  totalAlertasCriticos?: number;
  escopoAgronomico?: string;
  healthyPermissions: number;
  isFetchingMapa: boolean;
  totalTalhoesComPoligono?: number;
  onRefresh: () => void;
};

function formatNumber(value: number | undefined): string {
  return String(value ?? 0).padStart(2, "0");
}

function formatCropName(value: string | undefined): string {
  if (!value) {
    return "Milho";
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatMonitoringLabel(total: number | undefined): string {
  const value = total ?? 0;

  if (value === 1) {
    return "1 coleta registrada";
  }

  return `${value} coletas registradas`;
}

function formatMappedFieldsLabel(total: number | undefined): string {
  const value = total ?? 0;

  if (value === 1) {
    return "1 talhão no mapa";
  }

  return `${value} talhões no mapa`;
}

export default function DashboardHeroPanel({
  isFetching,
  totalMonitoramentos,
  totalAlertasCriticos,
  escopoAgronomico,
  healthyPermissions,
  isFetchingMapa,
  totalTalhoesComPoligono,
  onRefresh,
}: DashboardHeroPanelProps) {
  const hasCriticalAlerts = (totalAlertasCriticos ?? 0) > 0;

  return (
    <section className="espiagro-dashboard-hero">
      <div className="espiagro-dashboard-hero-main">
        <span className="espiagro-dashboard-kicker">
          EspIAgro • Visão da lavoura
        </span>

        <h1 className="espiagro-dashboard-title">
          Acompanhe sua lavoura com clareza, organização e informações úteis
          para o manejo.
        </h1>

        <p className="espiagro-dashboard-description">
          Veja coletas recentes, alertas, clima, mapa dos talhões e o estádio
          fenológico observado em campo.
        </p>

        <div className="espiagro-dashboard-band">
          {isFetching ? "Atualizando informações..." : "Informações atualizadas"}{" "}
          • {formatMonitoringLabel(totalMonitoramentos)} • Cultura acompanhada:{" "}
          {formatCropName(escopoAgronomico)}
        </div>

        <div className="espiagro-dashboard-actions">
          <NavLink
            to="/monitoramentos"
            className="espiagro-btn espiagro-btn-primary"
          >
            Registrar nova coleta
          </NavLink>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-secondary"
            onClick={onRefresh}
            disabled={isFetching}
          >
            {isFetching ? "Atualizando..." : "Atualizar painel"}
          </button>
        </div>
      </div>

      <div className="espiagro-dashboard-hero-side">
        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Alertas da lavoura</span>
          <strong>
            {hasCriticalAlerts
              ? formatNumber(totalAlertasCriticos)
              : "Tudo certo"}
          </strong>
        </div>

        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Recursos do celular</span>
          <strong>{formatNumber(healthyPermissions)} / 3 ativos</strong>
        </div>

        <div className="espiagro-mini-card">
          <span className="espiagro-mini-label">Talhões no mapa</span>
          <strong>
            {isFetchingMapa
              ? "Atualizando..."
              : formatMappedFieldsLabel(totalTalhoesComPoligono)}
          </strong>
        </div>
      </div>
    </section>
  );
}