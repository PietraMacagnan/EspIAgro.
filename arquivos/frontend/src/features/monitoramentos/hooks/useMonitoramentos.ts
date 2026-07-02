import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  INITIAL_MONITORAMENTO_FORM_STATE,
  MONITORAMENTO_QUERY_KEYS,
} from "../constants/monitoramento.constants";
import {
  arquivarMonitoramento,
  atualizarMonitoramento,
  criarMonitoramento,
  excluirMonitoramento,
  listarMonitoramentos,
  listarTalhoesParaMonitoramentos,
  reativarMonitoramento,
} from "../services/monitoramentos.service";
import type {
  FiltroStatus,
  Monitoramento,
  MonitoramentoPayload,
  TalhaoOption,
} from "../types/monitoramento.types";
import {
  buildMonitoramentoSummaryCards,
  filterMonitoramentosByStatus,
  getMonitoringImageUrl,
  hasFilledFormData,
  parseNumericInput,
} from "../utils/monitoramento.helpers";

export function useMonitoramentos() {
  const queryClient = useQueryClient();

  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("");
  const [formData, setFormData] = useState<MonitoramentoPayload>(
    INITIAL_MONITORAMENTO_FORM_STATE,
  );
  const [editingItem, setEditingItem] = useState<Monitoramento | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] =
    useState<Monitoramento | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(
    null,
  );
  const [mapInteractionEnabled, setMapInteractionEnabled] = useState(true);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);

  const previewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }

    return existingPreviewUrl;
  }, [selectedFile, existingPreviewUrl]);

  useEffect(() => {
    if (!selectedFile || !previewUrl) {
      return;
    }

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedFile]);

  const monitoramentosQuery = useQuery<Monitoramento[]>({
    queryKey: MONITORAMENTO_QUERY_KEYS.lista,
    queryFn: listarMonitoramentos,
  });

  const talhoesQuery = useQuery<TalhaoOption[]>({
    queryKey: MONITORAMENTO_QUERY_KEYS.talhoesOptions,
    queryFn: listarTalhoesParaMonitoramentos,
  });

  const monitoramentos = useMemo<Monitoramento[]>(() => {
    return monitoramentosQuery.data ?? [];
  }, [monitoramentosQuery.data]);

  const talhoesAtivos = useMemo<TalhaoOption[]>(() => {
    return (talhoesQuery.data ?? []).filter((item) => item.ativa !== false);
  }, [talhoesQuery.data]);

  const monitoramentosFiltrados = useMemo(() => {
    return filterMonitoramentosByStatus(monitoramentos, statusFiltro);
  }, [monitoramentos, statusFiltro]);

  const summaryCards = useMemo(() => {
    return buildMonitoramentoSummaryCards(monitoramentos);
  }, [monitoramentos]);

  const formTitle = editingItem ? "Editar coleta" : "Nova coleta";

  const formDescription = editingItem
    ? "Atualize as informações observadas no talhão selecionado."
    : "Registre a observação da lavoura com fase da cultura, localização, imagem e anotações.";

  const selectedTalhaoResumo = useMemo(() => {
    const selectedId = Number(formData.talhao);

    if (!selectedId || Number.isNaN(selectedId)) {
      return null;
    }

    return talhoesAtivos.find((item) => item.id === selectedId) ?? null;
  }, [formData.talhao, talhoesAtivos]);

  const currentMapPoint = useMemo<[number, number]>(() => {
    const latitude = parseNumericInput(formData.latitude);
    const longitude = parseNumericInput(formData.longitude);

    if (
      latitude !== null &&
      longitude !== null &&
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude)
    ) {
      return [latitude, longitude];
    }

    return [-16.47, -54.635];
  }, [formData.latitude, formData.longitude]);

  const hasUnsavedFormData = useMemo(() => {
    return (
      hasFilledFormData(formData) ||
      Boolean(selectedFile) ||
      Boolean(editingItem)
    );
  }, [editingItem, formData, selectedFile]);

  function updateField<K extends keyof MonitoramentoPayload>(
    field: K,
    value: MonitoramentoPayload[K],
  ): void {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    if (showUnsavedAlert) {
      setShowUnsavedAlert(false);
    }
  }

  function resetForm(): void {
    setFormData(INITIAL_MONITORAMENTO_FORM_STATE);
    setEditingItem(null);
    setSubmitError("");
    setSubmitMessage("");
    setSelectedFile(null);
    setSelectedFileName("");
    setExistingPreviewUrl(null);
    setMapInteractionEnabled(true);
    setShowUnsavedAlert(false);
  }

  function openCreateFormSheet(): void {
    resetForm();
    setSelectedDetailItem(null);
    setIsDetailsSheetOpen(false);
    setIsFormSheetOpen(true);
  }

  function requestCloseFormSheet(): void {
    if (isSubmitting) {
      return;
    }

    if (hasUnsavedFormData) {
      setShowUnsavedAlert(true);
      return;
    }

    resetForm();
    setIsFormSheetOpen(false);
  }

  function confirmCloseFormSheet(): void {
    resetForm();
    setIsFormSheetOpen(false);
  }

  function keepFormSheetOpen(): void {
    setShowUnsavedAlert(false);
  }

  function openDetailsSheet(item: Monitoramento): void {
    setSelectedDetailItem(item);
    setIsDetailsSheetOpen(true);
    setIsFormSheetOpen(false);
    setShowUnsavedAlert(false);
  }

  function closeDetailsSheet(): void {
    if (isSubmitting) {
      return;
    }

    setSelectedDetailItem(null);
    setIsDetailsSheetOpen(false);
  }

  function fillForm(item: Monitoramento): void {
    setEditingItem(item);
    setSubmitError("");
    setSubmitMessage("");
    setSelectedFile(null);
    setSelectedFileName("");
    setShowUnsavedAlert(false);
    setExistingPreviewUrl(getMonitoringImageUrl(item));
    setSelectedDetailItem(null);
    setIsDetailsSheetOpen(false);

    setFormData({
      talhao:
        item.talhao !== null && item.talhao !== undefined
          ? String(item.talhao)
          : "",
      data_observacao: item.data_observacao ?? "",
      estadio_fenologico: item.estadio_fenologico ?? "",
      altura_planta_cm:
        item.altura_planta_cm !== null && item.altura_planta_cm !== undefined
          ? String(item.altura_planta_cm)
          : "",
      populacao_plantas:
        item.populacao_plantas !== null && item.populacao_plantas !== undefined
          ? String(item.populacao_plantas)
          : "",
      umidade_solo:
        item.umidade_solo !== null && item.umidade_solo !== undefined
          ? String(item.umidade_solo)
          : "",
      sanidade: item.sanidade ?? "",
      latitude:
        item.localizacao?.latitude !== undefined
          ? String(item.localizacao.latitude)
          : item.latitude !== null && item.latitude !== undefined
            ? String(item.latitude)
            : "",
      longitude:
        item.localizacao?.longitude !== undefined
          ? String(item.localizacao.longitude)
          : item.longitude !== null && item.longitude !== undefined
            ? String(item.longitude)
            : "",
      observacoes: item.observacoes ?? "",
      ativa: item.ativa !== false,
    });

    setIsFormSheetOpen(true);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSelectedFileName(file?.name ?? "");
    setShowUnsavedAlert(false);

    if (file) {
      setExistingPreviewUrl(null);
    }
  }

  function handleMapPointSelect(point: [number, number]): void {
    updateField("latitude", point[0].toFixed(6));
    updateField("longitude", point[1].toFixed(6));
  }

  function handleUseCurrentLocation(): void {
    if (!navigator.geolocation) {
      setSubmitError("Este aparelho não permite usar localização agora.");
      return;
    }

    setIsGettingLocation(true);
    setSubmitError("");
    setSubmitMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        updateField("latitude", latitude.toFixed(6));
        updateField("longitude", longitude.toFixed(6));
        setMapInteractionEnabled(true);
        setIsGettingLocation(false);
      },
      (error) => {
        let message = "Não foi possível obter a localização atual.";

        if (error.code === error.PERMISSION_DENIED) {
          message = "A localização está bloqueada nas permissões do aparelho.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "A localização não está disponível no momento.";
        } else if (error.code === error.TIMEOUT) {
          message = "A busca pela localização demorou demais. Tente novamente.";
        }

        setSubmitError(message);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  function buildFormPayload(): FormData {
    const talhaoId = Number(formData.talhao);
    const alturaPlanta = parseNumericInput(formData.altura_planta_cm);
    const populacaoPlantas = parseNumericInput(formData.populacao_plantas);
    const umidadeSolo = parseNumericInput(formData.umidade_solo);
    const latitude = parseNumericInput(formData.latitude);
    const longitude = parseNumericInput(formData.longitude);

    if (!formData.talhao) {
      throw new Error("Selecione o talhão da coleta.");
    }

    if (Number.isNaN(talhaoId)) {
      throw new Error("O talhão selecionado não é válido.");
    }

    if (!formData.data_observacao) {
      throw new Error("Informe a data da coleta.");
    }

    if (!formData.estadio_fenologico) {
      throw new Error("Selecione a fase da cultura.");
    }

    if (formData.altura_planta_cm.trim() !== "" && Number.isNaN(alturaPlanta)) {
      throw new Error("Informe uma altura de planta válida.");
    }

    if (
      formData.populacao_plantas.trim() !== "" &&
      Number.isNaN(populacaoPlantas)
    ) {
      throw new Error("Informe uma população de plantas válida.");
    }

    if (formData.umidade_solo.trim() !== "" && Number.isNaN(umidadeSolo)) {
      throw new Error("Informe uma umidade do solo válida.");
    }

    if (formData.latitude.trim() !== "" && Number.isNaN(latitude)) {
      throw new Error("Informe uma latitude válida.");
    }

    if (formData.longitude.trim() !== "" && Number.isNaN(longitude)) {
      throw new Error("Informe uma longitude válida.");
    }

    const payload = new FormData();
    payload.append("talhao", String(talhaoId));
    payload.append("data_observacao", formData.data_observacao);
    payload.append("estadio_fenologico", formData.estadio_fenologico);
    payload.append("sanidade", formData.sanidade.trim());
    payload.append("observacoes", formData.observacoes.trim());
    payload.append("ativa", String(formData.ativa));

    if (alturaPlanta !== null && !Number.isNaN(alturaPlanta)) {
      payload.append("altura_planta_cm", String(alturaPlanta));
    }

    if (populacaoPlantas !== null && !Number.isNaN(populacaoPlantas)) {
      payload.append("populacao_plantas", String(Math.trunc(populacaoPlantas)));
    }

    if (umidadeSolo !== null && !Number.isNaN(umidadeSolo)) {
      payload.append("umidade_solo", String(umidadeSolo));
    }

    if (latitude !== null && !Number.isNaN(latitude)) {
      payload.append("latitude", String(latitude));
    }

    if (longitude !== null && !Number.isNaN(longitude)) {
      payload.append("longitude", String(longitude));
    }

    if (selectedFile) {
      payload.append("foto_monitoramento", selectedFile);
    }

    return payload;
  }

  async function invalidateMonitoramentos(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: MONITORAMENTO_QUERY_KEYS.lista,
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard-monitoramentos"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["dashboard-mapa"],
    });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildFormPayload();
      return criarMonitoramento(payload);
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Coleta registrada com sucesso.");
      resetForm();
      setIsFormSheetOpen(false);
      await invalidateMonitoramentos();
    },
    onError: (error: unknown) => {
      console.error("Erro ao cadastrar monitoramento:", error);
      setSubmitMessage("");
      setSubmitError(
        "Não foi possível registrar a coleta. Revise os dados e tente novamente.",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) {
        throw new Error("Nenhum monitoramento selecionado para edição.");
      }

      const payload = buildFormPayload();
      return atualizarMonitoramento(editingItem.id, payload);
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Coleta atualizada com sucesso.");
      resetForm();
      setIsFormSheetOpen(false);
      await invalidateMonitoramentos();
    },
    onError: (error: unknown) => {
      console.error("Erro ao atualizar monitoramento:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível atualizar a coleta. Tente novamente.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (item: Monitoramento) => {
      return arquivarMonitoramento(item.id);
    },
    onSuccess: async () => {
      setSubmitMessage("Coleta arquivada com sucesso.");
      setSubmitError("");
      setSelectedDetailItem(null);
      setIsDetailsSheetOpen(false);
      await invalidateMonitoramentos();
    },
    onError: (error: unknown) => {
      console.error("Erro ao arquivar monitoramento:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível arquivar a coleta.");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (item: Monitoramento) => {
      return reativarMonitoramento(item.id);
    },
    onSuccess: async () => {
      setSubmitMessage("Coleta reativada com sucesso.");
      setSubmitError("");
      setSelectedDetailItem(null);
      setIsDetailsSheetOpen(false);
      await invalidateMonitoramentos();
    },
    onError: (error: unknown) => {
      console.error("Erro ao reativar monitoramento:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível reativar a coleta.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: Monitoramento) => {
      await excluirMonitoramento(item.id);
    },
    onSuccess: async () => {
      setSubmitMessage("Coleta excluída com sucesso.");
      setSubmitError("");
      setSelectedDetailItem(null);
      setIsDetailsSheetOpen(false);

      if (editingItem) {
        resetForm();
        setIsFormSheetOpen(false);
      }

      await invalidateMonitoramentos();
    },
    onError: (error: unknown) => {
      console.error("Erro ao excluir monitoramento:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível excluir a coleta.");
    },
  });

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending ||
    deleteMutation.isPending;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");
    setShowUnsavedAlert(false);

    try {
      buildFormPayload();
    } catch (error) {
      setSubmitMessage("");
      setSubmitError(
        error instanceof Error ? error.message : "Revise os dados da coleta.",
      );
      return;
    }

    if (editingItem) {
      await updateMutation.mutateAsync();
      return;
    }

    await createMutation.mutateAsync();
  }

  async function handleArchive(item: Monitoramento): Promise<void> {
    if (!window.confirm("Deseja arquivar esta coleta?")) {
      return;
    }

    await archiveMutation.mutateAsync(item);
  }

  async function handleRestore(item: Monitoramento): Promise<void> {
    await restoreMutation.mutateAsync(item);
  }

  async function handleDelete(item: Monitoramento): Promise<void> {
    if (
      !window.confirm(
        "Deseja excluir esta coleta? Esta ação não pode ser desfeita.",
      )
    ) {
      return;
    }

    await deleteMutation.mutateAsync(item);
  }

  return {
    statusFiltro,
    setStatusFiltro,
    formData,
    editingItem,
    selectedDetailItem,
    submitError,
    submitMessage,
    selectedFileName,
    previewUrl,
    existingPreviewUrl,
    mapInteractionEnabled,
    setMapInteractionEnabled,
    isGettingLocation,
    isFormSheetOpen,
    isDetailsSheetOpen,
    showUnsavedAlert,
    monitoramentosQuery,
    talhoesQuery,
    monitoramentos,
    talhoesAtivos,
    monitoramentosFiltrados,
    summaryCards,
    formTitle,
    formDescription,
    selectedTalhaoResumo,
    currentMapPoint,
    hasUnsavedFormData,
    isSubmitting,
    updateField,
    resetForm,
    openCreateFormSheet,
    requestCloseFormSheet,
    confirmCloseFormSheet,
    keepFormSheetOpen,
    openDetailsSheet,
    closeDetailsSheet,
    fillForm,
    handleFileChange,
    handleMapPointSelect,
    handleUseCurrentLocation,
    handleSubmit,
    handleArchive,
    handleRestore,
    handleDelete,
  };
}