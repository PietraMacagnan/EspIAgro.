import { useState } from "react";

import type {
  Relatorio,
  RelatorioGenerationState,
  RelatorioRecordActionState,
} from "../types/relatorio.types";
import { useRelatorioRecordActions } from "./useRelatorioRecordActions";
import { useReportGenerationActions } from "./useReportGenerationActions";

type UseReportActionsParams = {
  relatorios: Relatorio[];
  selectedRelatorioId: number | null;
  setSelectedRelatorioId: (relatorioId: number | null) => void;
};

type UseReportActionsReturn = RelatorioGenerationState &
  RelatorioRecordActionState & {
    feedbackMessage: string;
    feedbackError: string;
    setFeedbackMessage: (message: string) => void;
    setFeedbackError: (message: string) => void;
    clearFeedback: () => void;
    dismissGenerationTask: (taskId: string) => void;
    getRelatorioFromTask: (relatorioId: number) => Relatorio | null;
    handleGerarCompleto: (relatorio: Relatorio) => void;
    handleGerarConteudo: (relatorio: Relatorio) => void;
    handleGerarPdf: (relatorio: Relatorio) => void;
    handleGerarPdfPorId: (relatorioId: number) => void;
    handleBaixarPdf: (relatorio: Relatorio) => Promise<void>;
    handleArchive: (relatorioId: number) => Promise<void>;
    handleReactivate: (relatorioId: number) => Promise<void>;
    handleDelete: (relatorioId: number) => Promise<void>;
  };

export function useReportActions({
  relatorios,
  selectedRelatorioId,
  setSelectedRelatorioId,
}: UseReportActionsParams): UseReportActionsReturn {
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  function clearFeedback(): void {
    setFeedbackMessage("");
    setFeedbackError("");
  }

  const {
    tasks,
    isGenerationRunning,
    dismissGenerationTask,
    getRelatorioFromTask,
    handleGerarCompleto,
    handleGerarConteudo,
    handleGerarPdf,
    handleGerarPdfPorId,
    handleBaixarPdf,
  } = useReportGenerationActions({
    relatorios,
    setFeedbackMessage,
    setFeedbackError,
    clearFeedback,
  });

  const {
    isRecordActionRunning,
    handleArchive,
    handleReactivate,
    handleDelete,
  } = useRelatorioRecordActions({
    selectedRelatorioId,
    setSelectedRelatorioId,
    setFeedbackMessage,
    setFeedbackError,
    clearFeedback,
  });

  return {
    tasks,
    isGenerationRunning,
    isRecordActionRunning,
    feedbackMessage,
    feedbackError,
    setFeedbackMessage,
    setFeedbackError,
    clearFeedback,
    dismissGenerationTask,
    getRelatorioFromTask,
    handleGerarCompleto,
    handleGerarConteudo,
    handleGerarPdf,
    handleGerarPdfPorId,
    handleBaixarPdf,
    handleArchive,
    handleReactivate,
    handleDelete,
  };
}