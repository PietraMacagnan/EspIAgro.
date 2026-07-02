import type {
  SummaryCard,
  SummaryFilterKey,
} from "@/features/relatorios/types/relatorio.types";

type ReportSummaryGridProps = {
  cards: SummaryCard[];
  onQuickFilter: (filterKey?: SummaryFilterKey) => void;
};

export default function ReportSummaryGrid({
  cards,
  onQuickFilter,
}: ReportSummaryGridProps) {
  return (
    <section className="espiagro-summary-grid">
      {cards.map((card) => (
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