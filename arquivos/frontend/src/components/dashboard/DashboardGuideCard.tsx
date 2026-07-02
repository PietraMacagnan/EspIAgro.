type DashboardGuideCardProps = {
  isCompleted: boolean;
  onOpenGuide: () => void;
  onDismissGuide: () => void;
};

export default function DashboardGuideCard({
  isCompleted,
  onOpenGuide,
  onDismissGuide,
}: DashboardGuideCardProps) {
  return (
    <section className="espiagro-section-card">
      <div className="espiagro-guide-inline">
        <div>
          <span className="espiagro-panel-kicker">Orientação rápida</span>

          <h3>Comece pelo caminho certo</h3>

          <p>
            Siga o fluxo recomendado: cadastre a propriedade, organize os
            talhões, registre coletas de campo e acompanhe alertas e relatórios.
          </p>
        </div>

        <div className="espiagro-guide-inline-actions">
          <button
            type="button"
            className="espiagro-btn espiagro-btn-ghost"
            onClick={onOpenGuide}
          >
            {isCompleted ? "Rever orientação" : "Ver orientação"}
          </button>

          {!isCompleted ? (
            <button
              type="button"
              className="espiagro-btn espiagro-btn-ghost"
              onClick={onDismissGuide}
            >
              Ver depois
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}