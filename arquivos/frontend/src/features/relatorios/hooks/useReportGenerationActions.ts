import { useQueryClient } from "@tanstack/react-query";

import {
  baixarArquivoPdf,
  gerarConteudoRelatorio,
  gerarPdfRelatorio,
  gerarRelatorioCompleto,
} from "../services/relatorios.service";
import type {
  GenerationTask,
  Relatorio,
  RelatorioGenerationState,
} from "../types/relatorio.types";
import { GENERATION_TASK_STATUS } from "../types/relatorio.types";
import {
  buildDownloadFileName,
  getAxiosFriendlyMessage,
  getGenerationStage,
  isPdfAvailable,
  mergeReportWithPdfUrl,
  resolveBestPdfUrl,
  resolvePdfUrlFromResponse,
} from "../utils/relatorio.helpers";
import { useGenerationTasks } from "./useGenerationTasks";

type UseReportGenerationActionsParams = {
  relatorios: Relatorio[];
  setFeedbackMessage: (message: string) => void;
  setFeedbackError: (message: string) => void;
  clearFeedback: () => void;
};

type UseReportGenerationActionsReturn = RelatorioGenerationState & {
  dismissGenerationTask: (taskId: string) => void;
  getRelatorioFromTask: (relatorioId: number) => Relatorio | null;
  handleGerarCompleto: (relatorio: Relatorio) => void;
  handleGerarConteudo: (relatorio: Relatorio) => void;
  handleGerarPdf: (relatorio: Relatorio) => void;
  handleGerarPdfPorId: (relatorioId: number) => void;
  handleBaixarPdf: (relatorio: Relatorio) => Promise<void>;
};

const RELATORIOS_QUERY_KEY = ["relatorios-lista"] as const;

export function useReportGenerationActions({
  relatorios,
  setFeedbackMessage,
  setFeedbackError,
  clearFeedback,
}: UseReportGenerationActionsParams): UseReportGenerationActionsReturn {
  const queryClient = useQueryClient();

  const {
    tasks,
    createGenerationTask,
    upsertGenerationTask,
    updateGenerationTask,
    dismissGenerationTask,
    isGenerationRunning,
    getRelatorioFromTask,
    startProgressSimulation,
    stopProgressSimulation,
  } = useGenerationTasks();

  async function invalidateRelatorios(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: RELATORIOS_QUERY_KEY,
    });
  }

  async function runGerarCompletoEmSegundoPlano(
    relatorio: Relatorio,
    task: GenerationTask,
  ): Promise<void> {
    const intervalId = startProgressSimulation(task);

    try {
      const response = await gerarRelatorioCompleto(relatorio.id);
      stopProgressSimulation(intervalId);

      const pdfUrl = resolvePdfUrlFromResponse(response);
      const updatedReport = mergeReportWithPdfUrl(
        relatorio,
        response.relatorio,
        pdfUrl,
      );

      updateGenerationTask(task.id, {
        status: GENERATION_TASK_STATUS.DONE,
        progress: 100,
        stage: getGenerationStage(task.type, 100, GENERATION_TASK_STATUS.DONE),
        message:
          response.detail ||
          "Relatório completo concluído. O conteúdo e o PDF já podem ser consultados.",
        finishedAt: new Date().toISOString(),
        pdfUrl: resolveBestPdfUrl(updatedReport),
        relatorio: updatedReport,
      });

      setFeedbackError("");
      setFeedbackMessage("Relatório completo concluído com sucesso.");
      await invalidateRelatorios();
    } catch (error) {
      stopProgressSimulation(intervalId);
      console.error("Erro ao gerar relatório completo:", error);

      updateGenerationTask(task.id, {
        status: GENERATION_TASK_STATUS.ERROR,
        progress: 100,
        stage: getGenerationStage(task.type, 100, GENERATION_TASK_STATUS.ERROR),
        message: getAxiosFriendlyMessage(
          error,
          "Não foi possível gerar o relatório completo.",
        ),
        finishedAt: new Date().toISOString(),
      });

      setFeedbackMessage("");
      setFeedbackError("Não foi possível gerar o relatório completo.");
    }
  }

  async function runGerarConteudoEmSegundoPlano(
    relatorio: Relatorio,
    task: GenerationTask,
  ): Promise<void> {
    const intervalId = startProgressSimulation(task);

    try {
      const response = await gerarConteudoRelatorio(relatorio.id);
      stopProgressSimulation(intervalId);

      updateGenerationTask(task.id, {
        status: GENERATION_TASK_STATUS.DONE,
        progress: 100,
        stage: getGenerationStage(task.type, 100, GENERATION_TASK_STATUS.DONE),
        message:
          response.detail ||
          "Análise concluída. Você já pode consultar o resumo atualizado ou gerar o PDF.",
        finishedAt: new Date().toISOString(),
        relatorio: response.relatorio ?? relatorio,
      });

      setFeedbackError("");
      setFeedbackMessage("Análise concluída com sucesso.");
      await invalidateRelatorios();
    } catch (error) {
      stopProgressSimulation(intervalId);
      console.error("Erro ao gerar conteúdo do relatório:", error);

      updateGenerationTask(task.id, {
        status: GENERATION_TASK_STATUS.ERROR,
        progress: 100,
        stage: getGenerationStage(task.type, 100, GENERATION_TASK_STATUS.ERROR),
        message: getAxiosFriendlyMessage(
          error,
          "Não foi possível gerar a análise do relatório.",
        ),
        finishedAt: new Date().toISOString(),
      });

      setFeedbackMessage("");
      setFeedbackError("Não foi possível gerar a análise do relatório.");
    }
  }

  async function runGerarPdfEmSegundoPlano(
    relatorio: Relatorio,
    task: GenerationTask,
  ): Promise<void> {
    const intervalId = startProgressSimulation(task);

    try {
      const response = await gerarPdfRelatorio(relatorio.id);
      stopProgressSimulation(intervalId);

      const pdfUrl = resolvePdfUrlFromResponse(response);
      const updatedReport = mergeReportWithPdfUrl(
        relatorio,
        response.relatorio,
        pdfUrl,
      );

      updateGenerationTask(task.id, {
        status: GENERATION_TASK_STATUS.DONE,
        progress: 100,
        stage: getGenerationStage(task.type, 100, GENERATION_TASK_STATUS.DONE),
        message:
          response.detail || "PDF concluído. O arquivo está pronto para baixar.",
        finishedAt: new Date().toISOString(),
        pdfUrl: resolveBestPdfUrl(updatedReport),
        relatorio: updatedReport,
      });

      setFeedbackError("");
      setFeedbackMessage("PDF concluído com sucesso.");
      await invalidateRelatorios();
    } catch (error) {
      stopProgressSimulation(intervalId);
      console.error("Erro ao gerar PDF do relatório:", error);

      updateGenerationTask(task.id, {
        status: GENERATION_TASK_STATUS.ERROR,
        progress: 100,
        stage: getGenerationStage(task.type, 100, GENERATION_TASK_STATUS.ERROR),
        message: getAxiosFriendlyMessage(
          error,
          "Não foi possível gerar o PDF do relatório.",
        ),
        finishedAt: new Date().toISOString(),
      });

      setFeedbackMessage("");
      setFeedbackError("Não foi possível gerar o PDF do relatório.");
    }
  }

  function handleGerarCompleto(relatorio: Relatorio): void {
    if (isGenerationRunning(relatorio.id, "completo")) {
      return;
    }

    clearFeedback();

    const task = createGenerationTask(relatorio, "completo");
    upsertGenerationTask(task);
    void runGerarCompletoEmSegundoPlano(relatorio, task);
  }

  function handleGerarConteudo(relatorio: Relatorio): void {
    if (isGenerationRunning(relatorio.id, "conteudo")) {
      return;
    }

    clearFeedback();

    const task = createGenerationTask(relatorio, "conteudo");
    upsertGenerationTask(task);
    void runGerarConteudoEmSegundoPlano(relatorio, task);
  }

  function handleGerarPdf(relatorio: Relatorio): void {
    if (isGenerationRunning(relatorio.id, "pdf")) {
      return;
    }

    clearFeedback();

    const task = createGenerationTask(relatorio, "pdf");
    upsertGenerationTask(task);
    void runGerarPdfEmSegundoPlano(relatorio, task);
  }

  function handleGerarPdfPorId(relatorioId: number): void {
    const relatorio =
      getRelatorioFromTask(relatorioId) ??
      relatorios.find((item) => item.id === relatorioId) ??
      null;

    if (!relatorio) {
      setFeedbackMessage("");
      setFeedbackError("Não foi possível localizar este relatório para gerar o PDF.");
      return;
    }

    handleGerarPdf(relatorio);
  }

  async function handleBaixarPdf(relatorio: Relatorio): Promise<void> {
    clearFeedback();

    const pdfUrl = resolveBestPdfUrl(relatorio);

    if (!pdfUrl || !isPdfAvailable(relatorio)) {
      setFeedbackError("Este relatório ainda não possui PDF disponível para download.");
      return;
    }

    try {
      const blob = await baixarArquivoPdf(pdfUrl);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = blobUrl;
      anchor.download = buildDownloadFileName(relatorio);

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(blobUrl);

      setFeedbackError("");
      setFeedbackMessage("Download do PDF iniciado com sucesso.");
    } catch (error) {
      console.error("Erro ao baixar PDF do relatório:", error);

      setFeedbackMessage("");
      setFeedbackError(
        getAxiosFriendlyMessage(
          error,
          "Não foi possível baixar o PDF do relatório.",
        ),
      );
    }
  }

  return {
    tasks,
    isGenerationRunning,
    dismissGenerationTask,
    getRelatorioFromTask,
    handleGerarCompleto,
    handleGerarConteudo,
    handleGerarPdf,
    handleGerarPdfPorId,
    handleBaixarPdf,
  };
}