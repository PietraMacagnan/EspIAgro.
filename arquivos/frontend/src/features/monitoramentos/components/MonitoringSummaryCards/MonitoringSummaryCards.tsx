import type { SummaryCard } from "../../types/monitoramento.types";

type MonitoringSummaryCardsProps = {
  cards: SummaryCard[];
};

export default function MonitoringSummaryCards({
  cards,
}: MonitoringSummaryCardsProps) {
  return (
    <section className="espiagro-summary-grid" aria-label="Resumo das coletas">
      {cards.map((card) => (
        <article
          key={card.title}
          className={`espiagro-summary-card espiagro-tone-${card.tone}`}
        >
          <h3>{card.title}</h3>
          <strong className="espiagro-summary-value">{card.value}</strong>
          <p>{card.hint}</p>
        </article>
      ))}
    </section>
  );
}