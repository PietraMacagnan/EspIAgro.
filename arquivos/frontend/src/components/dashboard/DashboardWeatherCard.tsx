type ClimaDados = {
  temperatura?: number;
  sensacao_termica?: number;
  temperatura_min?: number;
  temperatura_max?: number;
  umidade?: number;
  pressao?: number;
  descricao?: string;
  icone?: string;
  vento_velocidade?: number;
  chuva_mm?: number;
  cidade?: string;
  pais?: string;
  timestamp?: string;
};

type DashboardWeatherCardProps = {
  clima: ClimaDados | null | undefined;
  isFetching: boolean;
  errorMessage?: string | null;
};

function formatDecimal(value: number, digits = 1): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function getClimaResumo(clima: ClimaDados | null | undefined): string {
  if (!clima) {
    return "O clima será exibido quando houver uma coleta de campo com localização registrada.";
  }

  const partes = [
    clima.descricao ? `Condição: ${clima.descricao}` : null,
    typeof clima.temperatura === "number"
      ? `Temperatura: ${formatDecimal(clima.temperatura)}°C`
      : null,
    typeof clima.umidade === "number"
      ? `Umidade: ${formatDecimal(clima.umidade, 0)}%`
      : null,
  ].filter(Boolean);

  return partes.length > 0
    ? partes.join(" • ")
    : "O clima será exibido quando houver uma coleta de campo com localização registrada.";
}

function formatTemperature(value?: number): string {
  if (typeof value !== "number") {
    return "--°";
  }

  return `${formatDecimal(value)}°`;
}

function formatHumidity(value?: number): string {
  if (typeof value !== "number") {
    return "-";
  }

  return `${formatDecimal(value, 0)}%`;
}

function formatSensation(value?: number): string {
  if (typeof value !== "number") {
    return "-";
  }

  return `${formatDecimal(value)}°C`;
}

function formatWind(value?: number): string {
  if (typeof value !== "number") {
    return "-";
  }

  return `${formatDecimal(value)} m/s`;
}

function formatRain(value?: number): string {
  if (typeof value !== "number") {
    return "-";
  }

  return `${formatDecimal(value)} mm`;
}

export default function DashboardWeatherCard({
  clima,
  isFetching,
  errorMessage,
}: DashboardWeatherCardProps) {
  return (
    <section className="espiagro-section-card">
      <div className="espiagro-section-header">
        <div>
          <span className="espiagro-panel-kicker">Clima no campo</span>

          <h3>Condições climáticas da última coleta</h3>

          <p>
            Veja as informações de tempo associadas à coleta de campo mais
            recente com localização disponível.
          </p>
        </div>

        <div className="espiagro-chip-row">
          <span className="espiagro-chip espiagro-chip-soft">
            {isFetching ? "Atualizando clima..." : "Dados climáticos"}
          </span>
        </div>
      </div>

      {errorMessage && !clima ? (
        <div className="espiagro-empty-card">
          <span className="espiagro-panel-kicker">
            Clima não disponível agora
          </span>

          <p>{errorMessage}</p>
        </div>
      ) : (
        <div className="espiagro-clima-hero">
          <div className="espiagro-clima-main">
            <span className="espiagro-panel-kicker espiagro-panel-kicker-light">
              Condição observada
            </span>

            <h3>{clima?.cidade || "Sem localização climática"}</h3>

            <p>{getClimaResumo(clima)}</p>

            <div className="espiagro-clima-temp">
              <strong>{formatTemperature(clima?.temperatura)}</strong>
              <span>{clima?.descricao || "Sem descrição no momento"}</span>
            </div>
          </div>

          <div className="espiagro-clima-side">
            <div className="espiagro-clima-card">
              <span>Umidade</span>
              <strong>{formatHumidity(clima?.umidade)}</strong>
            </div>

            <div className="espiagro-clima-card">
              <span>Sensação térmica</span>
              <strong>{formatSensation(clima?.sensacao_termica)}</strong>
            </div>

            <div className="espiagro-clima-card">
              <span>Vento</span>
              <strong>{formatWind(clima?.vento_velocidade)}</strong>
            </div>

            <div className="espiagro-clima-card">
              <span>Chuva</span>
              <strong>{formatRain(clima?.chuva_mm)}</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}