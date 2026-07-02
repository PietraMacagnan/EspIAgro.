export default function DashboardInsightCards() {
  return (
    <section
      className="espiagro-insight-grid"
      aria-label="Informações rápidas do painel"
    >
      <article className="espiagro-insight-card">
        <span className="espiagro-panel-kicker">Mapa da lavoura</span>
        <h3>Áreas e pontos de campo em uma só visão</h3>
        <p>
          Visualize propriedades, talhões e registros de campo para entender
          melhor onde cada acompanhamento foi realizado.
        </p>
      </article>

      <article className="espiagro-insight-card">
        <span className="espiagro-panel-kicker">Clima no campo</span>
        <h3>Condições climáticas do último registro</h3>
        <p>
          Consulte temperatura, umidade, vento e chuva associados à coleta mais
          recente com localização disponível.
        </p>
      </article>

      <article className="espiagro-insight-card">
        <span className="espiagro-panel-kicker">Apoio ao manejo</span>
        <h3>Informações organizadas para decidir melhor</h3>
        <p>
          Acompanhe coletas, alertas, riscos e relatórios com uma leitura mais
          clara da situação atual da lavoura.
        </p>
      </article>
    </section>
  );
}