import type { Monitoramento } from "../../types/monitoramento.types";
import MonitoringCard from "../MonitoringCard/MonitoringCard";

type MonitoringListProps = {
  monitoramentos: Monitoramento[];
  isSubmitting: boolean;
  onCreateMonitoring: () => void;
  onOpenDetails: (item: Monitoramento) => void;
};

export default function MonitoringList({
  monitoramentos,
  isSubmitting,
  onCreateMonitoring,
  onOpenDetails,
}: MonitoringListProps) {
  if (monitoramentos.length === 0) {
    return (
      <section className="espiagro-empty-card">
        <h3>Nenhuma coleta encontrada</h3>
        <p>
          Ainda não há coletas para os filtros selecionados. Registre uma nova
          observação de campo ou ajuste os filtros para ver outros resultados.
        </p>

        <div className="espiagro-state-actions">
          <button
            type="button"
            className="espiagro-btn espiagro-btn-primary"
            onClick={onCreateMonitoring}
          >
            Nova coleta
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="espiagro-list-grid" aria-label="Lista de coletas">
      {monitoramentos.map((item) => (
        <MonitoringCard
          key={item.id}
          item={item}
          isSubmitting={isSubmitting}
          onOpenDetails={onOpenDetails}
        />
      ))}
    </section>
  );
}