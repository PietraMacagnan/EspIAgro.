import PhenologyBadge from "@/components/phenology/PhenologyBadge";

import type { Monitoramento } from "../../types/monitoramento.types";
import {
  formatDate,
  getMonitoringImageUrl,
  getMonitoringSituationReading,
} from "../../utils/monitoramento.helpers";

type MonitoringCardProps = {
  item: Monitoramento;
  isSubmitting: boolean;
  onOpenDetails: (item: Monitoramento) => void;
};

export default function MonitoringCard({
  item,
  isSubmitting,
  onOpenDetails,
}: MonitoringCardProps) {
  const imageUrl = getMonitoringImageUrl(item);
  const situationReading = getMonitoringSituationReading(item);

  return (
    <article className="espiagro-list-card">
      <div className="espiagro-monitoramento-card-visual">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Imagem da coleta ${item.talhao_nome || item.id}`}
          />
        ) : (
          <div className="espiagro-monitoramento-card-fallback">
            <span>📷</span>
            <small>Sem imagem</small>
          </div>
        )}
      </div>

      <div className="espiagro-list-header">
        <div>
          <h3 className="espiagro-list-title">
            {item.talhao_nome || `Coleta #${item.id}`}
          </h3>

          <p className="espiagro-list-meta">
            Coleta em {formatDate(item.data_observacao)}
          </p>
        </div>
      </div>

      <PhenologyBadge
        code={item.estadio_fenologico}
        label={item.estadio_fenologico_display}
        variant="card"
        showSupportText
      />

      <div className="espiagro-card-summary">
        <div>
          <strong>{situationReading.title}</strong>

          <p>
            {item.resumo_diagnostico
              ? item.resumo_diagnostico
              : situationReading.description}
          </p>
        </div>

        <button
          type="button"
          className="espiagro-btn espiagro-btn-primary espiagro-card-toggle"
          onClick={() => onOpenDetails(item)}
          disabled={isSubmitting}
        >
          Ver detalhes da coleta
        </button>
      </div>
    </article>
  );
}