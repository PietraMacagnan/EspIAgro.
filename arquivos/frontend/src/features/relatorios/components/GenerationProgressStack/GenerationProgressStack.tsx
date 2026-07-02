import type {
  GenerationTask,
  GenerationTaskType,
  Relatorio,
} from "../../types/relatorio.types";
import {
  getGenerationLabel,
  isPdfAvailable,
} from "../../utils/relatorio.helpers";

type GenerationProgressStackProps = {
  tasks: GenerationTask[];
  relatorios: Relatorio[];
  isGenerationRunning: (
    relatorioId: number,
    type: GenerationTaskType,
  ) => boolean;
  onDismissTask: (taskId: string) => void;
  onGeneratePdfById: (relatorioId: number) => void;
  onDownloadPdf: (relatorio: Relatorio) => void;
};

export default function GenerationProgressStack({
  tasks,
  relatorios,
  isGenerationRunning,
  onDismissTask,
  onGeneratePdfById,
  onDownloadPdf,
}: GenerationProgressStackProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section
      className="espiagro-generation-stack"
      aria-live="polite"
      aria-label="Notificações de geração de relatórios"
    >
      {tasks.map((task) => {
        const currentReport =
          task.relatorio ??
          relatorios.find((relatorio) => relatorio.id === task.relatorioId) ??
          null;

        const downloadReport: Relatorio = {
          ...(currentReport ?? {
            id: task.relatorioId,
            titulo: task.relatorioTitle,
          }),
          pdf_url: task.pdfUrl ?? currentReport?.pdf_url ?? null,
          pdf_download_url: task.pdfUrl ?? currentReport?.pdf_download_url ?? null,
        };

        const canDownloadPdf = isPdfAvailable(downloadReport);
        const isDone = task.status === "done";
        const isRunning = task.status === "running";
        const isPdfTask = task.type === "pdf";
        const isCompleteTask = task.type === "completo";
        const isContentTask = task.type === "conteudo";

        return (
          <article
            key={task.id}
            className={`espiagro-generation-card ${task.status}`}
          >
            <div className="espiagro-generation-icon" aria-hidden="true">
              {isRunning ? "⏳" : isDone ? "✓" : "!"}
            </div>

            <div className="espiagro-generation-body">
              <span>{getGenerationLabel(task.type)}</span>
              <strong>{task.relatorioTitle}</strong>
              <p>{task.message}</p>

              <div
                className="espiagro-generation-progress"
                aria-label={`Progresso: ${task.progress}%`}
              >
                <div className="espiagro-generation-progress-track">
                  <div
                    className="espiagro-generation-progress-fill"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>

                <div className="espiagro-generation-progress-footer">
                  <small>{task.stage}</small>
                  <small>{task.progress}%</small>
                </div>
              </div>

              {isRunning ? (
                <small>
                  Você pode navegar pelo app enquanto o processamento continua.
                </small>
              ) : null}
            </div>

            <div className="espiagro-generation-actions">
              {isDone && (isPdfTask || isCompleteTask) && canDownloadPdf ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-primary"
                  onClick={() => onDownloadPdf(downloadReport)}
                >
                  Baixar PDF
                </button>
              ) : null}

              {isDone && isContentTask ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-info"
                  onClick={() => onGeneratePdfById(task.relatorioId)}
                  disabled={isGenerationRunning(task.relatorioId, "pdf")}
                >
                  Gerar PDF
                </button>
              ) : null}

              {!isRunning ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={() => onDismissTask(task.id)}
                >
                  Dispensar
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}