import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { NavLink } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import http from "@/services/http";
import "./BaseTecnicaPage.css";

type FonteConhecimento = {
  id: number;
  titulo?: string;
  descricao?: string;
  tipo?: string;
  tipo_display?: string;
  categoria?: string;
  categoria_display?: string;
  escopo_cultura?: string;
  escopo_cultura_display?: string;
  escopo_agronomico?: string;
  autor?: string;
  instituicao?: string;
  ano_publicacao?: number | null;
  arquivo?: string | null;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  arquivo_extensao?: string | null;
  arquivo_tamanho_bytes?: number | null;
  url?: string;
  palavras_chave?: string;
  status_indexacao?: string;
  status_indexacao_display?: string;
  ativa?: boolean;
  conteudo_extraido?: string;
  observacoes?: string;
  is_milho?: boolean;
  is_geral_apoio?: boolean;
  created_at?: string;
  updated_at?: string;
  indexado_em?: string | null;
};

type ReprocessarFonteResponse = {
  detail?: string;
  escopo_agronomico?: string;
  fonte?: FonteConhecimento;
};

type BaseResumoResponse = {
  total_fontes?: number;
  ativas?: number;
  indexadas?: number;
  processando_ou_pendentes?: number;
  com_erro?: number;
  escopo_milho?: number;
  escopo_geral?: number;
};

type FonteCreateOrUpdateResponse =
  | FonteConhecimento
  | {
      detail?: string;
      fonte?: FonteConhecimento;
    };

type FontePayload = {
  titulo: string;
  descricao: string;
  tipo: string;
  categoria: string;
  escopo_cultura: string;
  autor: string;
  instituicao: string;
  ano_publicacao: string;
  url: string;
  palavras_chave: string;
  observacoes: string;
  ativa: boolean;
};

type SummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: "green" | "amber" | "red" | "blue";
  filterKey?: "todos" | "indexadas" | "ativas" | "milho";
};

type FiltroCategoria =
  | ""
  | "geral"
  | "fenologia"
  | "pragas"
  | "doencas"
  | "nutricao"
  | "solo"
  | "clima"
  | "ndvi"
  | "manejo"
  | "geoprocessamento";

type FiltroStatus = "" | "pendente" | "processando" | "indexado" | "erro";
type FiltroEscopo = "" | "milho" | "geral";

const initialFormState: FontePayload = {
  titulo: "",
  descricao: "",
  tipo: "pdf",
  categoria: "fenologia",
  escopo_cultura: "milho",
  autor: "",
  instituicao: "",
  ano_publicacao: "",
  url: "",
  palavras_chave: "",
  observacoes: "",
  ativa: true,
};

const fontePayloadKeys = Object.keys(
  initialFormState,
) as (keyof FontePayload)[];

function formatNumber(value: number): string {
  return String(value).padStart(2, "0");
}

function formatMaterialCount(value: number): string {
  if (value === 1) {
    return "1 material encontrado";
  }

  return `${value} materiais encontrados`;
}

function getFiltroStatusLabel(status: FiltroStatus): string {
  if (status === "pendente") return "Aguardando leitura";
  if (status === "processando") return "Em preparo";
  if (status === "indexado") return "Pronto para uso";
  if (status === "erro") return "Precisa de atenção";

  return "Todos";
}

function getFiltroEscopoLabel(escopo: FiltroEscopo): string {
  if (escopo === "milho") return "Milho";
  if (escopo === "geral") return "Geral";

  return "Todos";
}

function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("pt-BR");
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function truncateText(text: string | undefined, maxLength = 260): string {
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function normalizeText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getFonteTone(
  fonte: FonteConhecimento,
): "green" | "amber" | "red" | "blue" {
  if (fonte.status_indexacao === "erro") {
    return "red";
  }

  if (
    fonte.status_indexacao === "processando" ||
    fonte.status_indexacao === "pendente"
  ) {
    return "amber";
  }

  if (fonte.escopo_cultura === "milho") {
    return "green";
  }

  return "blue";
}

function getStatusBadgeClass(status?: string): string {
  if (status === "erro") {
    return "espiagro-badge-red";
  }

  if (status === "processando" || status === "pendente") {
    return "espiagro-badge-amber";
  }

  if (status === "indexado") {
    return "espiagro-badge-green";
  }

  return "espiagro-badge-blue";
}

function getTipoLabel(tipo?: string, tipoDisplay?: string): string {
  if (tipoDisplay) {
    return tipoDisplay;
  }

  if (tipo === "pdf") return "PDF";
  if (tipo === "link") return "Link";
  if (tipo === "artigo") return "Artigo";
  if (tipo === "manual") return "Manual";
  if (tipo === "boletim") return "Boletim";
  if (tipo === "legislacao") return "Legislação";
  if (tipo === "base_publica") return "Base pública";
  if (tipo === "outro") return "Outro";

  return tipo || "-";
}

function getCategoriaLabel(categoria?: string, categoriaDisplay?: string): string {
  if (categoriaDisplay) {
    return categoriaDisplay;
  }

  if (categoria === "fenologia") return "Fenologia";
  if (categoria === "pragas") return "Pragas";
  if (categoria === "doencas") return "Doenças";
  if (categoria === "nutricao") return "Nutrição";
  if (categoria === "solo") return "Solo";
  if (categoria === "clima") return "Clima";
  if (categoria === "ndvi") return "NDVI";
  if (categoria === "manejo") return "Manejo";
  if (categoria === "geoprocessamento") return "Geoprocessamento";
  if (categoria === "geral") return "Geral";

  return categoria || "-";
}

function getEscopoLabel(
  escopo?: string,
  escopoDisplay?: string,
  escopoAgronomico?: string,
): string {
  if (escopoDisplay) {
    return escopoDisplay;
  }

  if (escopo === "milho" || escopoAgronomico === "milho") {
    return "Milho";
  }

  if (escopo === "geral") {
    return "Geral";
  }

  return escopo || escopoAgronomico || "-";
}

function extractFonteFromResponse(
  response: FonteCreateOrUpdateResponse,
): FonteConhecimento {
  if ("id" in response) {
    return response;
  }

  if (response.fonte) {
    return response.fonte;
  }

  throw new Error("Não foi possível confirmar os dados retornados pelo servidor.");
}

function mapFonteToPayload(item: FonteConhecimento): FontePayload {
  return {
    titulo: item.titulo ?? "",
    descricao: item.descricao ?? "",
    tipo: item.tipo ?? "pdf",
    categoria: item.categoria ?? "fenologia",
    escopo_cultura: item.escopo_cultura ?? "milho",
    autor: item.autor ?? "",
    instituicao: item.instituicao ?? "",
    ano_publicacao:
      item.ano_publicacao !== null && item.ano_publicacao !== undefined
        ? String(item.ano_publicacao)
        : "",
    url: item.url ?? "",
    palavras_chave: item.palavras_chave ?? "",
    observacoes: item.observacoes ?? "",
    ativa: item.ativa !== false,
  };
}

export default function BaseTecnicaPage() {
  const queryClient = useQueryClient();

  const [categoriaFiltro, setCategoriaFiltro] = useState<FiltroCategoria>("");
  const [statusFiltro, setStatusFiltro] = useState<FiltroStatus>("");
  const [escopoFiltro, setEscopoFiltro] = useState<FiltroEscopo>("");
  const [busca, setBusca] = useState("");
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [formData, setFormData] = useState<FontePayload>(initialFormState);
  const [editingItem, setEditingItem] = useState<FonteConhecimento | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isFormSheetOpen, setIsFormSheetOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery<FonteConhecimento[]>({
    queryKey: ["base-tecnica-lista"],
    queryFn: async (): Promise<FonteConhecimento[]> => {
      const response = await http.get<FonteConhecimento[]>("/base-conhecimento/");
      return response.data;
    },
  });

  const { data: resumoData } = useQuery<BaseResumoResponse>({
    queryKey: ["base-tecnica-resumo"],
    queryFn: async (): Promise<BaseResumoResponse> => {
      const response = await http.get<BaseResumoResponse>(
        "/base-conhecimento/resumo/",
      );
      return response.data;
    },
  });

  const fontes = useMemo<FonteConhecimento[]>(() => data ?? [], [data]);

  const fontesFiltradas = useMemo(() => {
    const buscaNormalizada = normalizeText(busca);

    return fontes.filter((item) => {
      const matchCategoria = categoriaFiltro
        ? item.categoria === categoriaFiltro
        : true;

      const matchStatus = statusFiltro
        ? item.status_indexacao === statusFiltro
        : true;

      const matchEscopo = escopoFiltro
        ? item.escopo_cultura === escopoFiltro ||
          item.escopo_agronomico === escopoFiltro
        : true;

      const textoBase = normalizeText(
        [
          item.titulo,
          item.descricao,
          item.tipo_display,
          item.tipo,
          item.categoria_display,
          item.categoria,
          item.escopo_cultura_display,
          item.escopo_cultura,
          item.escopo_agronomico,
          item.autor,
          item.instituicao,
          item.palavras_chave,
          item.status_indexacao_display,
          item.status_indexacao,
          item.conteudo_extraido,
        ]
          .filter(Boolean)
          .join(" "),
      );

      const matchBusca = buscaNormalizada
        ? textoBase.includes(buscaNormalizada)
        : true;

      return matchCategoria && matchStatus && matchEscopo && matchBusca;
    });
  }, [fontes, categoriaFiltro, statusFiltro, escopoFiltro, busca]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const total = resumoData?.total_fontes ?? fontes.length;
    const indexadas =
      resumoData?.indexadas ??
      fontes.filter((item) => item.status_indexacao === "indexado").length;
    const ativas =
      resumoData?.ativas ?? fontes.filter((item) => item.ativa).length;
    const milho =
      resumoData?.escopo_milho ??
      fontes.filter(
        (item) =>
          item.escopo_cultura === "milho" || item.escopo_agronomico === "milho",
      ).length;

    return [
      {
        title: "Total de materiais",
        value: formatNumber(total),
        hint: "Materiais salvos na biblioteca",
        tone: "blue",
        filterKey: "todos",
      },
      {
        title: "Prontos para uso",
        value: formatNumber(indexadas),
        hint: "Materiais preparados para apoiar análises",
        tone: indexadas > 0 ? "green" : "amber",
        filterKey: "indexadas",
      },
      {
        title: "Disponíveis",
        value: formatNumber(ativas),
        hint: "Materiais liberados na biblioteca",
        tone: ativas > 0 ? "green" : "amber",
        filterKey: "ativas",
      },
      {
        title: "Foco em milho",
        value: formatNumber(milho),
        hint: "Conteúdos alinhados à cultura acompanhada",
        tone: milho > 0 ? "green" : "blue",
        filterKey: "milho",
      },
    ];
  }, [fontes, resumoData]);

  const processingCount = useMemo(() => {
    return (
      resumoData?.processando_ou_pendentes ??
      fontes.filter(
        (item) =>
          item.status_indexacao === "processando" ||
          item.status_indexacao === "pendente",
      ).length
    );
  }, [fontes, resumoData]);

  const formTitle = editingItem
    ? "Editar material técnico"
    : "Novo material técnico";

  const formDescription = editingItem
    ? "Atualize as informações do material para manter a biblioteca clara e confiável."
    : "Adicione PDFs e links confiáveis para apoiar coletas, análises e relatórios da lavoura.";

  const hasActiveFilters = Boolean(
    categoriaFiltro || statusFiltro || escopoFiltro || busca.trim(),
  );

  const isPdfType = formData.tipo === "pdf";
  const isLinkType = formData.tipo === "link";

  const hasUnsavedFormData = useMemo(() => {
    const baseData = editingItem ? mapFonteToPayload(editingItem) : initialFormState;

    const changedFields = fontePayloadKeys.some(
      (field) => formData[field] !== baseData[field],
    );

    return changedFields || Boolean(selectedFile);
  }, [editingItem, formData, selectedFile]);

  function handleQuickFilter(filterKey?: SummaryCard["filterKey"]) {
    if (filterKey === "todos") {
      setCategoriaFiltro("");
      setStatusFiltro("");
      setEscopoFiltro("");
      setBusca("");
      return;
    }

    if (filterKey === "indexadas") {
      setStatusFiltro("indexado");
      return;
    }

    if (filterKey === "ativas") {
      setStatusFiltro("");
      setEscopoFiltro("");
      setBusca("");
      return;
    }

    if (filterKey === "milho") {
      setEscopoFiltro("milho");
    }
  }

  function handleClearFilters() {
    setCategoriaFiltro("");
    setStatusFiltro("");
    setEscopoFiltro("");
    setBusca("");
  }

  function toggleExpanded(id: number) {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id],
    );
  }

  function resetFormState() {
    setFormData(initialFormState);
    setEditingItem(null);
    setSelectedFile(null);
  }

  function resetForm() {
    resetFormState();
    setSubmitError("");
    setSubmitMessage("");
  }

  function openCreateForm() {
    resetForm();
    setIsFormSheetOpen(true);
  }

  function closeFormSheet() {
    if (hasUnsavedFormData) {
      const confirmed = window.confirm(
        "Existem informações preenchidas que ainda não foram salvas. Deseja fechar mesmo assim?",
      );

      if (!confirmed) {
        return;
      }
    }

    resetForm();
    setIsFormSheetOpen(false);
  }

  function fillForm(item: FonteConhecimento) {
    setEditingItem(item);
    setSelectedFile(null);
    setSubmitError("");
    setSubmitMessage("");
    setFormData(mapFonteToPayload(item));
    setIsFormSheetOpen(true);
  }

  function updateField<K extends keyof FontePayload>(
    field: K,
    value: FontePayload[K],
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  function buildPayload() {
    const titulo = formData.titulo.trim();
    const anoPublicacao =
      formData.ano_publicacao.trim() === ""
        ? null
        : Number(formData.ano_publicacao);

    if (!titulo) {
      throw new Error("Informe o título do material.");
    }

    if (formData.ano_publicacao.trim() !== "" && Number.isNaN(anoPublicacao)) {
      throw new Error("Informe um ano de publicação válido.");
    }

    if (isPdfType && !editingItem && !selectedFile) {
      throw new Error("Selecione um arquivo PDF para enviar.");
    }

    if (isLinkType && !formData.url.trim()) {
      throw new Error("Informe o link do material.");
    }

    const payload = new FormData();
    payload.append("titulo", titulo);
    payload.append("descricao", formData.descricao.trim());
    payload.append("tipo", formData.tipo);
    payload.append("categoria", formData.categoria);
    payload.append("escopo_cultura", formData.escopo_cultura);
    payload.append("autor", formData.autor.trim());
    payload.append("instituicao", formData.instituicao.trim());
    payload.append(
      "ano_publicacao",
      anoPublicacao !== null ? String(anoPublicacao) : "",
    );
    payload.append("url", formData.url.trim());
    payload.append("palavras_chave", formData.palavras_chave.trim());
    payload.append("observacoes", formData.observacoes.trim());
    payload.append("ativa", String(formData.ativa));

    if (selectedFile) {
      payload.append("arquivo", selectedFile);
    }

    return payload;
  }

  async function invalidateBase() {
    await queryClient.invalidateQueries({
      queryKey: ["base-tecnica-lista"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["base-tecnica-resumo"],
    });
  }

  const createMutation = useMutation({
    mutationFn: async (): Promise<FonteConhecimento> => {
      const payload = buildPayload();
      const response = await http.post<FonteCreateOrUpdateResponse>(
        "/base-conhecimento/",
        payload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return extractFonteFromResponse(response.data);
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Material cadastrado com sucesso.");
      resetFormState();
      setIsFormSheetOpen(false);
      await invalidateBase();
    },
    onError: (error: unknown) => {
      console.error("Erro ao cadastrar fonte:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível cadastrar o material.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (): Promise<FonteConhecimento> => {
      if (!editingItem) {
        throw new Error("Nenhuma fonte selecionada para edição.");
      }

      const payload = buildPayload();
      const response = await http.put<FonteCreateOrUpdateResponse>(
        `/base-conhecimento/${editingItem.id}/`,
        payload,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return extractFonteFromResponse(response.data);
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Material atualizado com sucesso.");
      resetFormState();
      setIsFormSheetOpen(false);
      await invalidateBase();
    },
    onError: (error: unknown) => {
      console.error("Erro ao atualizar fonte:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível atualizar o material.");
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: async (id: number): Promise<ReprocessarFonteResponse> => {
      const response = await http.post<ReprocessarFonteResponse>(
        `/base-conhecimento/${id}/reprocessar/`,
      );
      return response.data;
    },
    onSuccess: async () => {
      setSubmitError("");
      setSubmitMessage("Leitura do material atualizada com sucesso.");
      await invalidateBase();
    },
    onError: (error: unknown) => {
      console.error("Erro ao reprocessar fonte:", error);
      setSubmitMessage("");
      setSubmitError("Não foi possível atualizar a leitura do material.");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    try {
      buildPayload();
    } catch (error) {
      setSubmitMessage("");
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Revise as informações do material.",
      );
      return;
    }

    if (editingItem) {
      await updateMutation.mutateAsync();
      return;
    }

    await createMutation.mutateAsync();
  }

  return (
    <>
      <div className="espiagro-base-page">
        <section className="espiagro-base-hero">
          <div className="espiagro-base-hero-main">
            <span className="espiagro-base-kicker">
              EspIAgro • Biblioteca técnica
            </span>

            <h1 className="espiagro-base-title">
              Biblioteca de materiais confiáveis para apoiar coletas, análises e
              relatórios da lavoura.
            </h1>

            <p className="espiagro-base-description">
              Organize documentos, links e referências importantes para deixar as
              informações da lavoura mais claras e rastreáveis.
            </p>

            <div className="espiagro-base-band">
              {isFetching ? "Atualizando biblioteca..." : "Biblioteca atualizada"} •{" "}
              {formatMaterialCount(fontesFiltradas.length)}
            </div>

            <div className="espiagro-base-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-primary"
                onClick={openCreateForm}
              >
                Novo material técnico
              </button>

              <NavLink
                to="/relatorios"
                className="espiagro-btn espiagro-btn-secondary"
              >
                Ir para relatórios
              </NavLink>

              <button
                type="button"
                className="espiagro-btn espiagro-btn-secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                {isFetching ? "Atualizando..." : "Atualizar biblioteca"}
              </button>
            </div>
          </div>

          <div className="espiagro-base-hero-side">
            <div className="espiagro-mini-card">
              <span className="espiagro-mini-label">Materiais encontrados</span>
              <strong>{formatNumber(fontesFiltradas.length)}</strong>
            </div>

            <div className="espiagro-mini-card">
              <span className="espiagro-mini-label">Em preparo</span>
              <strong>{formatNumber(processingCount)}</strong>
            </div>

            <div className="espiagro-mini-card">
              <span className="espiagro-mini-label">Foco da biblioteca</span>
              <strong>Milho, manejo e referências confiáveis</strong>
            </div>
          </div>
        </section>

        <section className="espiagro-insight-grid">
          <article className="espiagro-insight-card">
            <h3>Materiais para consultar com segurança</h3>
            <p>
              Organize documentos e referências que ajudam a entender a cultura,
              o manejo e as condições observadas em campo.
            </p>
          </article>

          <article className="espiagro-insight-card">
            <h3>Conteúdos prontos para uso</h3>
            <p>
              Acompanhe quais materiais já estão preparados para apoiar
              relatórios, consultas e análises da lavoura.
            </p>
          </article>

          <article className="espiagro-insight-card">
            <h3>Referências bem identificadas</h3>
            <p>
              Mantenha autoria, instituição, palavras-chave e observações bem
              organizadas para saber de onde vem cada informação.
            </p>
          </article>
        </section>

        <section className="espiagro-summary-grid">
          {summaryCards.map((card) => (
            <article
              key={card.title}
              className={`espiagro-summary-card espiagro-tone-${card.tone}`}
            >
              <button
                type="button"
                className="espiagro-summary-button"
                onClick={() => handleQuickFilter(card.filterKey)}
              >
                <h3>{card.title}</h3>
                <strong className="espiagro-summary-value">{card.value}</strong>
                <p>{card.hint}</p>
              </button>
            </article>
          ))}
        </section>

        {!isFormSheetOpen && (submitMessage || submitError) ? (
          <section>
            {submitMessage ? (
              <div className="espiagro-feedback-message">{submitMessage}</div>
            ) : null}

            {submitError ? (
              <div className="espiagro-feedback-error">{submitError}</div>
            ) : null}
          </section>
        ) : null}

        <section className="espiagro-filter-card">
          <div className="espiagro-filter-header">
            <div>
              <span className="espiagro-panel-kicker">Filtros</span>
              <h3>Encontrar materiais na biblioteca</h3>
              <p>
                Use os filtros para localizar materiais por categoria, situação,
                aplicação e texto pesquisado.
              </p>
            </div>

            <div className="espiagro-filter-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-ghost"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                Limpar filtros
              </button>
            </div>
          </div>

          <div className="espiagro-filter-fields">
            <div className="espiagro-field">
              <label htmlFor="buscaFonte">Buscar material</label>
              <input
                id="buscaFonte"
                type="text"
                placeholder="Buscar por título, instituição, palavras-chave ou conteúdo"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>

            <div className="espiagro-field">
              <label htmlFor="categoriaFiltro">Categoria</label>
              <select
                id="categoriaFiltro"
                value={categoriaFiltro}
                onChange={(event) =>
                  setCategoriaFiltro(event.target.value as FiltroCategoria)
                }
              >
                <option value="">Todas</option>
                <option value="geral">Geral</option>
                <option value="fenologia">Fenologia</option>
                <option value="pragas">Pragas</option>
                <option value="doencas">Doenças</option>
                <option value="nutricao">Nutrição</option>
                <option value="manejo">Manejo</option>
                <option value="solo">Solo</option>
                <option value="clima">Clima</option>
                <option value="ndvi">NDVI</option>
                <option value="geoprocessamento">Geoprocessamento</option>
              </select>
            </div>

            <div className="espiagro-field">
              <label htmlFor="statusFiltro">Situação do material</label>
              <select
                id="statusFiltro"
                value={statusFiltro}
                onChange={(event) =>
                  setStatusFiltro(event.target.value as FiltroStatus)
                }
              >
                <option value="">Todos</option>
                <option value="pendente">Aguardando leitura</option>
                <option value="processando">Em preparo</option>
                <option value="indexado">Pronto para uso</option>
                <option value="erro">Precisa de atenção</option>
              </select>
            </div>

            <div className="espiagro-field">
              <label htmlFor="escopoFiltro">Aplicação</label>
              <select
                id="escopoFiltro"
                value={escopoFiltro}
                onChange={(event) =>
                  setEscopoFiltro(event.target.value as FiltroEscopo)
                }
              >
                <option value="">Todos</option>
                <option value="milho">Milho</option>
                <option value="geral">Geral</option>
              </select>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="espiagro-active-filters">
              {busca.trim() ? (
                <span className="espiagro-filter-chip">
                  Busca: {busca.trim()}
                </span>
              ) : null}

              {categoriaFiltro ? (
                <span className="espiagro-filter-chip">
                  Categoria: {getCategoriaLabel(categoriaFiltro)}
                </span>
              ) : null}

              {statusFiltro ? (
                <span className="espiagro-filter-chip">
                  Situação: {getFiltroStatusLabel(statusFiltro)}
                </span>
              ) : null}

              {escopoFiltro ? (
                <span className="espiagro-filter-chip">
                  Aplicação: {getFiltroEscopoLabel(escopoFiltro)}
                </span>
              ) : null}
            </div>
          ) : null}
        </section>

        {isLoading ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">Carregando</span>
            <h2>Carregando biblioteca técnica</h2>
            <p>Os materiais cadastrados estão sendo carregados.</p>
          </section>
        ) : null}

        {isError ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">Não foi possível carregar</span>
            <h2>Não foi possível carregar a biblioteca técnica</h2>
            <p>Verifique sua conexão e tente novamente.</p>

            <div className="espiagro-state-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-retry"
                onClick={() => {
                  void refetch();
                }}
              >
                Tentar novamente
              </button>
            </div>
          </section>
        ) : null}

        {!isLoading && !isError ? (
          <>
            {fontesFiltradas.length === 0 ? (
              <section className="espiagro-empty-card">
                <span className="espiagro-panel-kicker">Sem resultados</span>
                <p>Nenhum material foi encontrado para os filtros atuais.</p>
              </section>
            ) : (
              <section className="espiagro-list-wrap">
                {fontesFiltradas.map((item) => {
                  const tone = getFonteTone(item);
                  const isExpanded = expandedIds.includes(item.id);

                  return (
                    <article key={item.id} className="espiagro-list-card">
                      <div className="espiagro-list-top">
                        <div>
                          <h3>{item.titulo || `Material #${item.id}`}</h3>
                          <p className="espiagro-list-meta">
                            {item.descricao || "Sem descrição cadastrada."}
                          </p>

                          <div className="espiagro-list-meta-row">
                            <span>
                              <strong>Instituição:</strong>{" "}
                              {item.instituicao || "Não informada"}
                            </span>
                            <span>
                              <strong>Autor:</strong>{" "}
                              {item.autor || "Não informado"}
                            </span>
                            <span>
                              <strong>Cadastrado em:</strong>{" "}
                              {formatDateTime(item.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="espiagro-badges">
                          <span
                            className={`espiagro-badge ${getStatusBadgeClass(
                              item.status_indexacao,
                            )}`}
                          >
                            {item.status_indexacao_display ||
                              item.status_indexacao ||
                              "Sem situação"}
                          </span>

                          <span className="espiagro-badge espiagro-badge-blue">
                            {getCategoriaLabel(
                              item.categoria,
                              item.categoria_display,
                            )}
                          </span>

                          <span
                            className={`espiagro-badge ${
                              tone === "green"
                                ? "espiagro-badge-green"
                                : tone === "amber"
                                  ? "espiagro-badge-amber"
                                  : tone === "red"
                                    ? "espiagro-badge-red"
                                    : "espiagro-badge-blue"
                            }`}
                          >
                            {getEscopoLabel(
                              item.escopo_cultura,
                              item.escopo_cultura_display,
                              item.escopo_agronomico,
                            )}
                          </span>

                          <span
                            className={`espiagro-badge ${
                              item.ativa
                                ? "espiagro-badge-green"
                                : "espiagro-badge-red"
                            }`}
                          >
                            {item.ativa ? "Ativa" : "Inativa"}
                          </span>
                        </div>
                      </div>

                      <div className="espiagro-detail-grid">
                        <div className="espiagro-detail-box">
                          <span className="espiagro-detail-label">Tipo</span>
                          <span className="espiagro-detail-value">
                            {getTipoLabel(item.tipo, item.tipo_display)}
                          </span>
                        </div>

                        <div className="espiagro-detail-box">
                          <span className="espiagro-detail-label">Categoria</span>
                          <span className="espiagro-detail-value">
                            {getCategoriaLabel(
                              item.categoria,
                              item.categoria_display,
                            )}
                          </span>
                        </div>

                        <div className="espiagro-detail-box">
                          <span className="espiagro-detail-label">Aplicação</span>
                          <span className="espiagro-detail-value">
                            {getEscopoLabel(
                              item.escopo_cultura,
                              item.escopo_cultura_display,
                              item.escopo_agronomico,
                            )}
                          </span>
                        </div>

                        <div className="espiagro-detail-box">
                          <span className="espiagro-detail-label">
                            Situação da leitura
                          </span>
                          <span className="espiagro-detail-value">
                            {item.status_indexacao_display ||
                              item.status_indexacao ||
                              "-"}
                          </span>
                        </div>
                      </div>

                      <div className="espiagro-list-actions-top">
                        <div className="espiagro-inline-actions">
                          <button
                            type="button"
                            className="espiagro-btn-inline"
                            onClick={() => fillForm(item)}
                          >
                            Editar material
                          </button>

                          <button
                            type="button"
                            className="espiagro-btn-inline"
                            onClick={() => {
                              setSubmitMessage("");
                              setSubmitError("");
                              void reprocessMutation.mutateAsync(item.id);
                            }}
                            disabled={reprocessMutation.isPending}
                          >
                            {reprocessMutation.isPending
                              ? "Atualizando leitura..."
                              : "Atualizar leitura"}
                          </button>
                        </div>

                        <button
                          type="button"
                          className="espiagro-expand-btn"
                          onClick={() => toggleExpanded(item.id)}
                        >
                          {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="espiagro-expanded-content">
                          <div className="espiagro-detail-grid">
                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">Autor</span>
                              <span className="espiagro-detail-value">
                                {item.autor || "-"}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Ano de publicação
                              </span>
                              <span className="espiagro-detail-value">
                                {item.ano_publicacao ?? "-"}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Arquivo
                              </span>
                              <span className="espiagro-detail-value">
                                {item.arquivo_nome || "-"}
                              </span>
                            </div>

                            <div className="espiagro-detail-box">
                              <span className="espiagro-detail-label">
                                Tamanho
                              </span>
                              <span className="espiagro-detail-value">
                                {formatFileSize(item.arquivo_tamanho_bytes)}
                              </span>
                            </div>
                          </div>

                          {item.arquivo_url ? (
                            <div className="espiagro-note-box">
                              <strong>Arquivo do material</strong>
                              <p>
                                <a
                                  href={item.arquivo_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="espiagro-link"
                                >
                                  Abrir arquivo enviado
                                </a>
                              </p>
                            </div>
                          ) : null}

                          {item.url ? (
                            <div className="espiagro-note-box">
                              <strong>Link do material</strong>
                              <p>
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="espiagro-link"
                                >
                                  {item.url}
                                </a>
                              </p>
                            </div>
                          ) : null}

                          {item.palavras_chave ? (
                            <div className="espiagro-note-box">
                              <strong>Palavras-chave</strong>
                              <p>{item.palavras_chave}</p>
                            </div>
                          ) : null}

                          {item.observacoes ? (
                            <div className="espiagro-note-box">
                              <strong>Observações</strong>
                              <p>{item.observacoes}</p>
                            </div>
                          ) : null}

                          {item.conteudo_extraido ? (
                            <div className="espiagro-note-box">
                              <strong>Trecho identificado no material</strong>
                              <p>{truncateText(item.conteudo_extraido, 700)}</p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </section>
            )}
          </>
        ) : null}
      </div>

      {isFormSheetOpen ? (
        <div
          className="espiagro-form-sheet-overlay"
          role="presentation"
          onClick={closeFormSheet}
        >
          <section
            className="espiagro-form-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={formTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <section className="espiagro-form-card">
              <div className="espiagro-form-header">
                <div>
                  <span className="espiagro-panel-kicker">Biblioteca</span>
                  <h3>{formTitle}</h3>
                  <p>{formDescription}</p>
                </div>

                <button
                  type="button"
                  className="espiagro-form-sheet-close"
                  onClick={closeFormSheet}
                  aria-label="Fechar formulário"
                >
                  ×
                </button>
              </div>

              {hasUnsavedFormData ? (
                <div className="espiagro-unsaved-alert">
                  <strong>Informações ainda não salvas</strong>
                  <span>
                    Se fechar agora, os dados preenchidos podem ser perdidos.
                  </span>
                </div>
              ) : null}

              <form onSubmit={(event) => void handleSubmit(event)}>
                <div className="espiagro-form-grid">
                  <div className="espiagro-field">
                    <label htmlFor="titulo">Título do material</label>
                    <input
                      id="titulo"
                      type="text"
                      value={formData.titulo}
                      onChange={(event) =>
                        updateField("titulo", event.target.value)
                      }
                      placeholder="Ex.: Manual de estádios fenológicos do milho"
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="tipo">Tipo do material</label>
                    <select
                      id="tipo"
                      value={formData.tipo}
                      onChange={(event) => updateField("tipo", event.target.value)}
                    >
                      <option value="pdf">PDF</option>
                      <option value="link">Link</option>
                      <option value="artigo">Artigo</option>
                      <option value="manual">Manual</option>
                      <option value="boletim">Boletim</option>
                      <option value="legislacao">Legislação</option>
                      <option value="base_publica">Base pública</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="categoria">Categoria</label>
                    <select
                      id="categoria"
                      value={formData.categoria}
                      onChange={(event) =>
                        updateField("categoria", event.target.value)
                      }
                    >
                      <option value="fenologia">Fenologia</option>
                      <option value="pragas">Pragas</option>
                      <option value="doencas">Doenças</option>
                      <option value="nutricao">Nutrição</option>
                      <option value="solo">Solo</option>
                      <option value="clima">Clima</option>
                      <option value="ndvi">NDVI</option>
                      <option value="manejo">Manejo</option>
                      <option value="geoprocessamento">Geoprocessamento</option>
                      <option value="geral">Geral</option>
                    </select>
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="escopo_cultura">Aplicação</label>
                    <select
                      id="escopo_cultura"
                      value={formData.escopo_cultura}
                      onChange={(event) =>
                        updateField("escopo_cultura", event.target.value)
                      }
                    >
                      <option value="milho">Milho</option>
                      <option value="geral">Geral</option>
                    </select>
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="autor">Autor</label>
                    <input
                      id="autor"
                      type="text"
                      value={formData.autor}
                      onChange={(event) => updateField("autor", event.target.value)}
                      placeholder="Ex.: Embrapa"
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="instituicao">Instituição</label>
                    <input
                      id="instituicao"
                      type="text"
                      value={formData.instituicao}
                      onChange={(event) =>
                        updateField("instituicao", event.target.value)
                      }
                      placeholder="Ex.: Universidade, Embrapa, Fundação"
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="ano_publicacao">Ano de publicação</label>
                    <input
                      id="ano_publicacao"
                      type="text"
                      inputMode="numeric"
                      value={formData.ano_publicacao}
                      onChange={(event) =>
                        updateField("ano_publicacao", event.target.value)
                      }
                      placeholder="Ex.: 2024"
                    />
                  </div>

                  <div className="espiagro-field">
                    <label htmlFor="palavras_chave">Palavras-chave</label>
                    <input
                      id="palavras_chave"
                      type="text"
                      value={formData.palavras_chave}
                      onChange={(event) =>
                        updateField("palavras_chave", event.target.value)
                      }
                      placeholder="Ex.: milho, fenologia, V4, V6, R1"
                    />
                  </div>

                  {isLinkType ? (
                    <div className="espiagro-field espiagro-field-full">
                      <label htmlFor="url">Link do material</label>
                      <input
                        id="url"
                        type="url"
                        value={formData.url}
                        onChange={(event) => updateField("url", event.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  ) : null}

                  {isPdfType ? (
                    <div className="espiagro-field espiagro-field-full">
                      <label htmlFor="arquivo">Arquivo PDF</label>
                      <input
                        id="arquivo"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                      />

                      <div className="espiagro-file-info">
                        {selectedFile
                          ? `Arquivo selecionado: ${selectedFile.name}`
                          : editingItem?.arquivo_nome
                            ? `Arquivo atual: ${editingItem.arquivo_nome}`
                            : "Selecione um PDF para adicionar à biblioteca."}

                        {selectedFile ? (
                          <div className="espiagro-file-meta">
                            <span>Tamanho: {formatFileSize(selectedFile.size)}</span>
                            <span>Tipo: {selectedFile.type || "arquivo local"}</span>
                          </div>
                        ) : editingItem?.arquivo_nome ? (
                          <div className="espiagro-file-meta">
                            <span>
                              Extensão: {editingItem.arquivo_extensao || "-"}
                            </span>
                            <span>
                              Tamanho:{" "}
                              {formatFileSize(editingItem.arquivo_tamanho_bytes)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="espiagro-field espiagro-field-full">
                    <label htmlFor="descricao">Descrição do material</label>
                    <textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(event) =>
                        updateField("descricao", event.target.value)
                      }
                      placeholder="Descreva o objetivo e a relevância da fonte."
                    />
                  </div>

                  <div className="espiagro-field espiagro-field-full">
                    <label htmlFor="observacoes">Observações</label>
                    <textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(event) =>
                        updateField("observacoes", event.target.value)
                      }
                      placeholder="Informações complementares sobre o uso da fonte."
                    />
                  </div>

                  <div className="espiagro-field espiagro-field-full">
                    <label>Status</label>
                    <div className="espiagro-switch-row">
                      <input
                        id="ativa"
                        type="checkbox"
                        checked={formData.ativa}
                        onChange={(event) =>
                          updateField("ativa", event.target.checked)
                        }
                      />
                      <label htmlFor="ativa">Material disponível</label>
                    </div>
                  </div>
                </div>

                {submitMessage ? (
                  <div className="espiagro-feedback-message">{submitMessage}</div>
                ) : null}

                {submitError ? (
                  <div className="espiagro-feedback-error">{submitError}</div>
                ) : null}

                <div className="espiagro-form-actions" style={{ marginTop: 20 }}>
                  <button
                    type="submit"
                    className="espiagro-btn espiagro-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? "Salvando..."
                      : editingItem
                        ? "Salvar alterações"
                        : "Cadastrar material"}
                  </button>

                  <button
                    type="button"
                    className="espiagro-btn espiagro-btn-ghost"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Limpar campos
                  </button>
                </div>
              </form>
            </section>
          </section>
        </div>
      ) : null}
    </>
  );
}