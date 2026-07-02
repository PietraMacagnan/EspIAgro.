import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  arquivarAlerta,
  atualizarAlerta,
  excluirAlerta,
  marcarAlertaComoLido,
  reativarAlerta,
  resolverAlerta,
} from "../services/alertas.service";
import type { Alerta, AlertaPayload } from "../types/alerta.types";
import {
  alertaPayloadKeys,
  initialAlertaFormState,
  mapAlertaToPayload,
} from "../utils/alerta.helpers";

type UseAlertaActionsParams = {
  selectedAlertaId: number | null;
  setSelectedAlertaId: (alertaId: number | null) => void;
};

type UseAlertaActionsReturn = {
  editingItem: Alerta | null;
  formData: AlertaPayload;
  actionMessage: string;
  actionError: string;
  isFormSheetOpen: boolean;
  isMutating: boolean;
  hasUnsavedFormData: boolean;
  formTitle: string;
  formDescription: string;
  setActionMessage: (message: string) => void;
  setActionError: (message: string) => void;
  setIsFormSheetOpen: (isOpen: boolean) => void;
  updateField: <K extends keyof AlertaPayload>(
    field: K,
    value: AlertaPayload[K],
  ) => void;
  resetFormState: () => void;
  resetForm: () => void;
  closeFormSheet: () => void;
  fillForm: (item: Alerta) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleMarcarLido: (alertaId: number) => Promise<void>;
  handleResolver: (alertaId: number) => Promise<void>;
  handleReativar: (alertaId: number) => Promise<void>;
  handleArquivar: (alertaId: number) => Promise<void>;
  handleExcluir: (alertaId: number) => Promise<void>;
};

export function useAlertaActions({
  selectedAlertaId,
  setSelectedAlertaId,
}: UseAlertaActionsParams): UseAlertaActionsReturn {
  const queryClient = useQueryClient();

  const [editingItem, setEditingItem] = useState<Alerta | null>(null);
  const [formData, setFormData] = useState<AlertaPayload>(
    initialAlertaFormState,
  );
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);

  const formTitle = editingItem ? "Revisar aviso da lavoura" : "Aviso da lavoura";

  const formDescription = editingItem
    ? "Revise as informações, atualize a situação e registre o acompanhamento do aviso."
    : "Escolha um aviso na lista para revisar as informações.";

  const hasUnsavedFormData = useMemo(() => {
    const baseData = editingItem
      ? mapAlertaToPayload(editingItem)
      : initialAlertaFormState;

    return alertaPayloadKeys.some((field) => formData[field] !== baseData[field]);
  }, [editingItem, formData]);

  async function invalidateAlertas(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["alertas-lista"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["dashboard-monitoramentos"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["dashboard-mapa"],
    });
  }

  function updateField<K extends keyof AlertaPayload>(
    field: K,
    value: AlertaPayload[K],
  ): void {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetFormState(): void {
    setEditingItem(null);
    setFormData(initialAlertaFormState);
  }

  function resetForm(): void {
    resetFormState();
    setActionError("");
    setActionMessage("");
  }

  function closeFormSheet(): void {
    if (hasUnsavedFormData) {
      const confirmed = window.confirm(
        "Existem informações alteradas que ainda não foram salvas. Deseja fechar mesmo assim?",
      );

      if (!confirmed) {
        return;
      }
    }

    resetForm();
    setIsFormSheetOpen(false);
  }

  function fillForm(item: Alerta): void {
    setEditingItem(item);
    setSelectedAlertaId(null);
    setActionError("");
    setActionMessage("");
    setFormData(mapAlertaToPayload(item));
    setIsFormSheetOpen(true);
  }

  function buildPayload(): Partial<AlertaPayload> {
    if (!editingItem) {
      throw new Error("Escolha um aviso antes de salvar alterações.");
    }

    const titulo = formData.titulo.trim();
    const mensagem = formData.mensagem.trim();
    const recomendacao = formData.recomendacao.trim();

    if (!titulo) {
      throw new Error("Informe um título claro para o aviso.");
    }

    if (!mensagem) {
      throw new Error("Informe a mensagem principal do aviso.");
    }

    return {
      titulo,
      mensagem,
      recomendacao,
      status: formData.status,
      lido: formData.lido,
      ativa: formData.ativa,
    };
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) {
        throw new Error("Escolha um aviso antes de salvar alterações.");
      }

      const payload = buildPayload();

      return atualizarAlerta(editingItem.id, payload);
    },
    onSuccess: async () => {
      setActionError("");
      setActionMessage("Aviso atualizado com sucesso.");
      resetFormState();
      setIsFormSheetOpen(false);

      await invalidateAlertas();
    },
    onError: () => {
      setActionMessage("");
      setActionError("Não foi possível atualizar o aviso. Tente novamente.");
    },
  });

  const marcarLidoMutation = useMutation({
    mutationFn: marcarAlertaComoLido,
    onSuccess: async (response) => {
      setActionError("");
      setActionMessage(response.detail || "Aviso marcado como visualizado.");

      await invalidateAlertas();
    },
    onError: () => {
      setActionMessage("");
      setActionError(
        "Não foi possível marcar o aviso como visualizado. Tente novamente.",
      );
    },
  });

  const resolverMutation = useMutation({
    mutationFn: resolverAlerta,
    onSuccess: async (response) => {
      setActionError("");
      setActionMessage(response.detail || "Aviso marcado como resolvido.");

      await invalidateAlertas();
    },
    onError: () => {
      setActionMessage("");
      setActionError("Não foi possível resolver o aviso. Tente novamente.");
    },
  });

  const reativarMutation = useMutation({
    mutationFn: reativarAlerta,
    onSuccess: async (response) => {
      setActionError("");
      setActionMessage(response.detail || "Aviso reaberto com sucesso.");

      await invalidateAlertas();
    },
    onError: () => {
      setActionMessage("");
      setActionError("Não foi possível reabrir o aviso. Tente novamente.");
    },
  });

  const arquivarMutation = useMutation({
    mutationFn: arquivarAlerta,
    onSuccess: async () => {
      setActionError("");
      setActionMessage("Aviso guardado no histórico.");

      await invalidateAlertas();
    },
    onError: () => {
      setActionMessage("");
      setActionError("Não foi possível guardar o aviso no histórico.");
    },
  });

  const excluirMutation = useMutation({
    mutationFn: excluirAlerta,
    onSuccess: async (alertaId) => {
      setActionError("");
      setActionMessage("Aviso excluído.");
      resetFormState();
      setIsFormSheetOpen(false);

      if (selectedAlertaId === alertaId) {
        setSelectedAlertaId(null);
      }

      await invalidateAlertas();
    },
    onError: () => {
      setActionMessage("");
      setActionError("Não foi possível excluir o aviso. Tente novamente.");
    },
  });

  const isMutating =
    updateMutation.isPending ||
    marcarLidoMutation.isPending ||
    resolverMutation.isPending ||
    reativarMutation.isPending ||
    arquivarMutation.isPending ||
    excluirMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionMessage("");
    setActionError("");

    try {
      buildPayload();
      await updateMutation.mutateAsync();
    } catch (error) {
      if (error instanceof Error) {
        setActionError(error.message);
        return;
      }

      setActionError("Revise as informações preenchidas.");
    }
  }

  async function handleMarcarLido(alertaId: number): Promise<void> {
    setActionMessage("");
    setActionError("");

    await marcarLidoMutation.mutateAsync(alertaId);
  }

  async function handleResolver(alertaId: number): Promise<void> {
    setActionMessage("");
    setActionError("");

    await resolverMutation.mutateAsync(alertaId);
  }

  async function handleReativar(alertaId: number): Promise<void> {
    setActionMessage("");
    setActionError("");

    await reativarMutation.mutateAsync(alertaId);
  }

  async function handleArquivar(alertaId: number): Promise<void> {
    if (!window.confirm("Deseja guardar este aviso no histórico?")) {
      return;
    }

    setActionMessage("");
    setActionError("");

    await arquivarMutation.mutateAsync(alertaId);
  }

  async function handleExcluir(alertaId: number): Promise<void> {
    if (
      !window.confirm(
        "Deseja excluir este aviso? Esta ação não poderá ser desfeita.",
      )
    ) {
      return;
    }

    setActionMessage("");
    setActionError("");

    await excluirMutation.mutateAsync(alertaId);
  }

  return {
    editingItem,
    formData,
    actionMessage,
    actionError,
    isFormSheetOpen,
    isMutating,
    hasUnsavedFormData,
    formTitle,
    formDescription,
    setActionMessage,
    setActionError,
    setIsFormSheetOpen,
    updateField,
    resetFormState,
    resetForm,
    closeFormSheet,
    fillForm,
    handleSubmit,
    handleMarcarLido,
    handleResolver,
    handleReativar,
    handleArquivar,
    handleExcluir,
  };
}