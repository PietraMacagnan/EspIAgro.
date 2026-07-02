import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  arquivarRelatorio,
  excluirRelatorio,
  reativarRelatorio,
} from "../services/relatorios.service";

type UseRelatorioRecordActionsParams = {
  selectedRelatorioId: number | null;
  setSelectedRelatorioId: (relatorioId: number | null) => void;
  setFeedbackMessage: (message: string) => void;
  setFeedbackError: (message: string) => void;
  clearFeedback: () => void;
};

type UseRelatorioRecordActionsReturn = {
  isRecordActionRunning: boolean;
  handleArchive: (relatorioId: number) => Promise<void>;
  handleReactivate: (relatorioId: number) => Promise<void>;
  handleDelete: (relatorioId: number) => Promise<void>;
};

const RELATORIOS_QUERY_KEY = ["relatorios-lista"] as const;

export function useRelatorioRecordActions({
  selectedRelatorioId,
  setSelectedRelatorioId,
  setFeedbackMessage,
  setFeedbackError,
  clearFeedback,
}: UseRelatorioRecordActionsParams): UseRelatorioRecordActionsReturn {
  const queryClient = useQueryClient();

  async function invalidateRelatorios(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: RELATORIOS_QUERY_KEY,
    });
  }

  const archiveMutation = useMutation({
    mutationFn: arquivarRelatorio,
    onSuccess: async () => {
      setFeedbackError("");
      setFeedbackMessage("Relatório arquivado com sucesso.");
      await invalidateRelatorios();
    },
    onError: (error: unknown) => {
      console.error("Erro ao arquivar relatório:", error);
      setFeedbackMessage("");
      setFeedbackError("Não foi possível arquivar o relatório.");
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: reativarRelatorio,
    onSuccess: async () => {
      setFeedbackError("");
      setFeedbackMessage("Relatório reativado com sucesso.");
      await invalidateRelatorios();
    },
    onError: (error: unknown) => {
      console.error("Erro ao reativar relatório:", error);
      setFeedbackMessage("");
      setFeedbackError("Não foi possível reativar o relatório.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: excluirRelatorio,
    onSuccess: async (relatorioId) => {
      setFeedbackError("");
      setFeedbackMessage("Relatório excluído com sucesso.");

      if (selectedRelatorioId === relatorioId) {
        setSelectedRelatorioId(null);
      }

      await invalidateRelatorios();
    },
    onError: (error: unknown) => {
      console.error("Erro ao excluir relatório:", error);
      setFeedbackMessage("");
      setFeedbackError("Não foi possível excluir o relatório.");
    },
  });

  const isRecordActionRunning =
    archiveMutation.isPending ||
    reactivateMutation.isPending ||
    deleteMutation.isPending;

  async function handleArchive(relatorioId: number): Promise<void> {
    const confirmed = window.confirm(
      "Deseja arquivar este relatório? Ele ficará guardado, mas fora da lista principal.",
    );

    if (!confirmed) {
      return;
    }

    clearFeedback();

    try {
      await archiveMutation.mutateAsync(relatorioId);
    } catch {
      return;
    }
  }

  async function handleReactivate(relatorioId: number): Promise<void> {
    const confirmed = window.confirm(
      "Deseja reativar este relatório e deixá-lo disponível novamente?",
    );

    if (!confirmed) {
      return;
    }

    clearFeedback();

    try {
      await reactivateMutation.mutateAsync(relatorioId);
    } catch {
      return;
    }
  }

  async function handleDelete(relatorioId: number): Promise<void> {
    const confirmed = window.confirm(
      "Deseja excluir definitivamente este relatório? Esta ação não poderá ser desfeita.",
    );

    if (!confirmed) {
      return;
    }

    clearFeedback();

    try {
      await deleteMutation.mutateAsync(relatorioId);
    } catch {
      return;
    }
  }

  return {
    isRecordActionRunning,
    handleArchive,
    handleReactivate,
    handleDelete,
  };
}