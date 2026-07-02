type DashboardSummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: "green" | "amber" | "red" | "blue";
};

type DashboardSummaryCardsProps = {
  cards: DashboardSummaryCard[];
};

export default function DashboardSummaryCards({
  cards,
}: DashboardSummaryCardsProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section
      className="espiagro-summary-grid"
      aria-label="Resumo geral da lavoura"
    >
      {cards.map((card) => (
        <article
          key={card.title}
          className={`espiagro-summary-card espiagro-tone-${card.tone}`}
          aria-label={`${card.title}: ${card.value}`}
        >
          <div className="espiagro-summary-card-content">
            <h3>{card.title}</h3>

            <strong className="espiagro-summary-value">{card.value}</strong>

            <p>{card.hint}</p>
          </div>
        </article>
      ))}
    </section>
  );
}