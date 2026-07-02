import type {
  AlertSummaryFilterKey,
  SummaryCard,
} from "@/features/alertas/types/alerta.types";

type AlertSummaryGridProps = {
  summaryCards: SummaryCard[];
  onQuickFilter: (filterKey?: AlertSummaryFilterKey) => void;
};

export default function AlertSummaryGrid({
  summaryCards,
  onQuickFilter,
}: AlertSummaryGridProps) {
  return (
    <section className="espiagro-summary-grid">
      {summaryCards.map((card) => (
        <article
          key={card.title}
          className={`espiagro-summary-card espiagro-tone-${card.tone}`}
        >
          <button
            type="button"
            className="espiagro-summary-button"
            onClick={() => onQuickFilter(card.filterKey)}
          >
            <h3>{card.title}</h3>
            <strong className="espiagro-summary-value">{card.value}</strong>
            <p>{card.hint}</p>
          </button>
        </article>
      ))}
    </section>
  );
}