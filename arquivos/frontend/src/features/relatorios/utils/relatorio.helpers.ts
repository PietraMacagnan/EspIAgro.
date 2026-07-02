import axios from "axios";

import type {
  FiltroStatus,
  FiltroTipo,
  GenerationTaskStatus,
  GenerationTaskType,
  GerarCompletoResponse,
  GerarPdfResponse,
  IdentificacaoFenologica,
  Relatorio,
  RelatorioTone,
  RelatoriosFilters,
  RiscoMonitoramento,
  SummaryCard,
} from "../types/relatorio.types";

import {
  GENERATION_TASK_STATUS,
  GENERATION_TASK_TYPE,
  RELATORIO_STATUS,
  RELATORIO_TIPO,
} from "../types/relatorio.types";

export function formatNumber(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("pt-BR");
}

export function formatConfidence(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

export function truncateText(
  text: string | undefined | null,
  maxLength = 120,
): string {
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

export function normalizeText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function extractPhenologyCode(value?: string | null): string {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return "";
  }

  const codeMatch = trimmedValue.match(/^(VE|VT|V\d{1,2}|R\d)/i);

  if (codeMatch?.[1]) {
    return codeMatch[1].toUpperCase();
  }

  return trimmedValue.split("-")[0]?.trim().toUpperCase() ?? "";
}

export function getPhenologyLabel(
  identificacao?: IdentificacaoFenologica,
): string {
  return (
    identificacao?.estadio_considerado_relatorio ||
    identificacao?.estadio_informado_display ||
    identificacao?.estadio_sugerido_ia ||
    "Identificação fenológica pendente"
  );
}

export function getPhenologyCode(
  identificacao?: IdentificacaoFenologica,
): string {
  return (
    extractPhenologyCode(identificacao?.estadio_informado) ||
    extractPhenologyCode(identificacao?.estadio_considerado_relatorio) ||
    extractPhenologyCode(identificacao?.estadio_informado_display) ||
    extractPhenologyCode(identificacao?.estadio_sugerido_ia)
  );
}

export function getPhenologyDisplayCode(
  identificacao?: IdentificacaoFenologica,
): string {
  return getPhenologyCode(identificacao) || "Em identificação";
}

export function getPhenologyDisplayDescription(
  identificacao?: IdentificacaoFenologica,
): string {
  const code = getPhenologyCode(identificacao);
  const label = getPhenologyLabel(identificacao);

  if (code) {
    return label;
  }

  if (identificacao?.mensagem_status) {
    return identificacao.mensagem_status;
  }

  return "Gere a análise para o app estimar a fase com base na coleta, imagem, datas e base técnica disponível.";
}

export function getPhenologyUserGuidance(
  identificacao?: IdentificacaoFenologica,
): string {
  if (getPhenologyCode(identificacao)) {
    return (
      identificacao?.mensagem_status ||
      "Fase considerada pelo relatório para apoiar a leitura da lavoura."
    );
  }

  return "A fase ainda precisa ser estimada pelo app. Gere o relatório completo ou atualize a análise para cruzar foto, dados da coleta, datas e base técnica.";
}

export function getRelatorioTone(relatorio: Relatorio): RelatorioTone {
  if (relatorio.status === RELATORIO_STATUS.ERRO) {
    return "red";
  }

  if (
    relatorio.status === RELATORIO_STATUS.PROCESSANDO ||
    relatorio.status === RELATORIO_STATUS.PENDENTE
  ) {
    return "amber";
  }

  if (relatorio.tipo === RELATORIO_TIPO.MONITORAMENTO) {
    return "blue";
  }

  return "green";
}

export function getStatusBadgeClass(status?: string): string {
  if (status === RELATORIO_STATUS.ERRO) {
    return "espiagro-badge-red";
  }

  if (
    status === RELATORIO_STATUS.PROCESSANDO ||
    status === RELATORIO_STATUS.PENDENTE
  ) {
    return "espiagro-badge-amber";
  }

  if (status === RELATORIO_STATUS.CONCLUIDO) {
    return "espiagro-badge-green";
  }

  return "espiagro-badge-blue";
}

export function getIdentificationBadgeClass(status?: string): string {
  if (status === "divergencia") {
    return "espiagro-badge-red";
  }

  if (status === "confirmada_por_ia") {
    return "espiagro-badge-green";
  }

  if (status === "sugerida_por_ia") {
    return "espiagro-badge-blue";
  }

  return "espiagro-badge-amber";
}

export function getIdentificationLabel(status?: string): string {
  if (status === "divergencia") {
    return "Leitura divergente";
  }

  if (status === "confirmada_por_ia") {
    return "Leitura confirmada";
  }

  if (status === "sugerida_por_ia") {
    return "Sugestão complementar";
  }

  return "Sem apoio complementar";
}

export function getStatusExplanation(status?: string): string {
  if (status === RELATORIO_STATUS.CONCLUIDO) {
    return "O relatório foi finalizado e está disponível para consulta.";
  }

  if (status === RELATORIO_STATUS.PROCESSANDO) {
    return "O sistema ainda está montando o conteúdo deste relatório.";
  }

  if (status === RELATORIO_STATUS.PENDENTE) {
    return "Este relatório ainda aguarda processamento.";
  }

  if (status === RELATORIO_STATUS.ERRO) {
    return "Houve uma falha na geração e o relatório precisa de nova tentativa.";
  }

  return "Situação atual do relatório no sistema.";
}

export function getTypeExplanation(tipo?: string): string {
  if (tipo === RELATORIO_TIPO.MONITORAMENTO) {
    return "Relatório gerado a partir de uma coleta de campo.";
  }

  if (tipo === RELATORIO_TIPO.TALHAO) {
    return "Relatório voltado para a leitura de um talhão específico.";
  }

  if (tipo === RELATORIO_TIPO.PROPRIEDADE) {
    return "Relatório voltado para a visão de uma propriedade rural.";
  }

  if (tipo === RELATORIO_TIPO.GERAL) {
    return "Relatório geral com informações consolidadas.";
  }

  return "Categoria do relatório registrada na plataforma.";
}

export function getFiltroStatusLabel(status: FiltroStatus): string {
  if (status === RELATORIO_STATUS.PENDENTE) {
    return "Aguardando";
  }

  if (status === RELATORIO_STATUS.PROCESSANDO) {
    return "Em preparo";
  }

  if (status === RELATORIO_STATUS.CONCLUIDO) {
    return "Finalizado";
  }

  if (status === RELATORIO_STATUS.ERRO) {
    return "Falha";
  }

  return "Todos";
}

export function getFiltroTipoLabel(tipo: FiltroTipo): string {
  if (tipo === RELATORIO_TIPO.MONITORAMENTO) {
    return "Coleta de campo";
  }

  if (tipo === RELATORIO_TIPO.TALHAO) {
    return "Talhão";
  }

  if (tipo === RELATORIO_TIPO.PROPRIEDADE) {
    return "Propriedade";
  }

  if (tipo === RELATORIO_TIPO.GERAL) {
    return "Geral";
  }

  return "Todos";
}

export function getRiskExplanation(faixaRisco?: string): string {
  const normalized = (faixaRisco ?? "").toLowerCase();

  if (normalized.includes("crít")) {
    return "A situação exige atenção imediata e prioridade no campo.";
  }

  if (normalized.includes("alto")) {
    return "A situação merece atenção elevada e acompanhamento próximo.";
  }

  if (normalized.includes("moder")) {
    return "Há sinais de atenção, mas sem urgência máxima no momento.";
  }

  if (normalized.includes("baix")) {
    return "O risco atual está em nível reduzido.";
  }

  return "Classificação de risco definida a partir das informações do relatório.";
}

export function getRiskScoreValue(risco?: RiscoMonitoramento): number | null {
  const score = risco?.score_risco;

  if (typeof score !== "number" || Number.isNaN(score)) {
    return null;
  }

  return Math.max(0, Math.min(100, score));
}

export function getRiskRangeLabel(risco?: RiscoMonitoramento): string {
  if (risco?.faixa_risco_display) {
    return risco.faixa_risco_display;
  }

  const score = getRiskScoreValue(risco);

  if (score === null) {
    return "Risco em análise";
  }

  if (score >= 85) {
    return "Crítico";
  }

  if (score >= 67) {
    return "Alto";
  }

  if (score >= 34) {
    return "Moderado";
  }

  return "Baixo";
}

export function getRiskSummary(risco?: RiscoMonitoramento): string {
  const score = getRiskScoreValue(risco);
  const label = getRiskRangeLabel(risco);

  if (score === null) {
    return label;
  }

  return `${label} — ${score.toFixed(0)}/100`;
}

export function getRiskUserExplanation(risco?: RiscoMonitoramento): string {
  const score = getRiskScoreValue(risco);
  const label = getRiskRangeLabel(risco).toLowerCase();
  const baseExplanation = getRiskExplanation(getRiskRangeLabel(risco));

  if (score === null) {
    return "O risco ainda precisa ser calculado a partir dos dados da coleta e da análise do relatório.";
  }

  return `${baseExplanation} O indicador usa uma escala de 0 a 100; quanto maior o número, maior a atenção necessária. Resultado atual: ${label} (${score.toFixed(0)}/100).`;
}

export function getRiskBadgeClassFromRisk(risco?: RiscoMonitoramento): string {
  const normalized = getRiskRangeLabel(risco).toLowerCase();

  if (normalized.includes("crít")) {
    return "espiagro-badge-red";
  }

  if (normalized.includes("alto")) {
    return "espiagro-badge-amber";
  }

  if (normalized.includes("moder")) {
    return "espiagro-badge-blue";
  }

  if (normalized.includes("baix")) {
    return "espiagro-badge-green";
  }

  return "espiagro-badge-blue";
}

export function getIaExplanation(status?: string): string {
  if (status === "confirmada_por_ia") {
    return "A leitura registrada ficou alinhada com a análise complementar do sistema.";
  }

  if (status === "sugerida_por_ia") {
    return "O sistema sugeriu uma leitura complementar para apoiar a interpretação.";
  }

  if (status === "divergencia") {
    return "Houve diferença entre a leitura registrada e a sugestão complementar do sistema.";
  }

  return "Este relatório não utilizou apoio complementar nesta etapa.";
}

export function getRecordStatusExplanation(ativa?: boolean): string {
  return ativa === false
    ? "O relatório está arquivado e fica guardado para consulta posterior."
    : "O relatório está ativo e disponível para consulta.";
}

export function resolveBestPdfUrl(relatorio?: Relatorio | null): string | null {
  if (!relatorio) {
    return null;
  }

  return (
    relatorio.pdf_download_url ||
    relatorio.pdf_url_absoluta ||
    relatorio.pdf_url ||
    null
  );
}

export function isPdfAvailable(relatorio?: Relatorio | null): boolean {
  if (!relatorio) {
    return false;
  }

  return Boolean(relatorio.pdf_disponivel || resolveBestPdfUrl(relatorio));
}

export function getPdfExplanation(relatorio?: Relatorio | null): string {
  if (!relatorio) {
    return "Nenhum relatório selecionado.";
  }

  if (isPdfAvailable(relatorio)) {
    return "O arquivo PDF já está pronto para baixar.";
  }

  return "O PDF ainda não foi gerado para este relatório.";
}

export function buildDownloadFileName(relatorio: Relatorio): string {
  const base = (relatorio.titulo || `relatorio-${relatorio.id}`)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return `${base || `relatorio-${relatorio.id}`}.pdf`;
}

export function getReportDisplayTitle(relatorio: Relatorio): string {
  return relatorio.titulo || `Relatório #${relatorio.id}`;
}

export function getReportImageUrl(relatorio?: Relatorio | null): string | null {
  if (!relatorio) {
    return null;
  }

  return relatorio.imagem_monitoramento_url || relatorio.foto_url || null;
}

export function getGenerationStartedMessage(type: GenerationTaskType): string {
  if (type === GENERATION_TASK_TYPE.COMPLETO) {
    return "O relatório completo está sendo preparado. Você pode continuar usando o app normalmente.";
  }

  if (type === GENERATION_TASK_TYPE.PDF) {
    return "O PDF está sendo preparado. Você pode continuar usando o app normalmente.";
  }

  return "A análise está sendo gerada. Você pode continuar usando o app normalmente.";
}

export function getGenerationLabel(type: GenerationTaskType): string {
  if (type === GENERATION_TASK_TYPE.COMPLETO) {
    return "Relatório completo";
  }

  if (type === GENERATION_TASK_TYPE.PDF) {
    return "PDF do relatório";
  }

  return "Análise do relatório";
}

export function getGenerationStage(
  type: GenerationTaskType,
  progress: number,
  status: GenerationTaskStatus,
): string {
  if (status === GENERATION_TASK_STATUS.DONE) {
    return "Concluído";
  }

  if (status === GENERATION_TASK_STATUS.ERROR) {
    return "Falha na geração";
  }

  if (type === GENERATION_TASK_TYPE.COMPLETO) {
    if (progress < 28) return "Organizando dados da coleta";
    if (progress < 52) return "Gerando análise técnica";
    if (progress < 78) return "Montando PDF";
    return "Finalizando arquivo";
  }

  if (type === GENERATION_TASK_TYPE.PDF) {
    if (progress < 35) return "Preparando conteúdo";
    if (progress < 75) return "Montando PDF";
    return "Finalizando arquivo";
  }

  if (progress < 40) return "Lendo informações da lavoura";
  if (progress < 78) return "Gerando interpretação";

  return "Finalizando análise";
}

export function getAxiosFriendlyMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (error.code === "ECONNABORTED") {
    return "A geração demorou mais do que o esperado. Tente novamente em alguns instantes.";
  }

  if (typeof error.response?.data === "object" && error.response?.data) {
    const detail = (error.response.data as { detail?: string }).detail;

    if (detail) {
      return detail;
    }
  }

  return fallback;
}

export function resolvePdfUrlFromResponse(
  responseData: GerarPdfResponse | GerarCompletoResponse,
): string | null {
  return (
    responseData.pdf_url ||
    responseData.arquivo ||
    resolveBestPdfUrl(responseData.relatorio) ||
    null
  );
}

export function mergeReportWithPdfUrl(
  relatorio: Relatorio,
  responseReport: Relatorio | undefined,
  pdfUrl: string | null,
): Relatorio {
  const baseReport = responseReport ?? relatorio;

  return {
    ...baseReport,
    pdf_url: pdfUrl ?? baseReport.pdf_url ?? relatorio.pdf_url ?? null,
    pdf_download_url:
      baseReport.pdf_download_url ?? relatorio.pdf_download_url ?? null,
    pdf_url_absoluta:
      baseReport.pdf_url_absoluta ?? relatorio.pdf_url_absoluta ?? null,
    pdf_disponivel:
      baseReport.pdf_disponivel ?? relatorio.pdf_disponivel ?? Boolean(pdfUrl),
  };
}

export function filterRelatorios(
  relatorios: Relatorio[],
  filters: RelatoriosFilters,
): Relatorio[] {
  const buscaNormalizada = normalizeText(filters.busca);

  return relatorios.filter((item) => {
    const matchStatus = filters.status ? item.status === filters.status : true;
    const matchTipo = filters.tipo ? item.tipo === filters.tipo : true;

    const textoBase = normalizeText(
      [
        item.titulo,
        item.resumo,
        item.talhao_nome,
        item.propriedade_nome,
        item.tipo_display,
        item.status_display,
        item.observacoes,
        item.conteudo_json?.apoio_diagnostico?.ui?.resumo_principal,
        item.conteudo_json?.apoio_diagnostico?.resumo_tecnico,
        item.conteudo_json?.apoio_diagnostico?.ui?.interpretacao_agronomica,
        item.conteudo_json?.risco_monitoramento?.justificativa_risco,
        item.conteudo_json?.identificacao_fenologica?.estadio_informado_display,
        item.conteudo_json?.identificacao_fenologica?.estadio_sugerido_ia,
        item.conteudo_json?.identificacao_fenologica?.estadio_considerado_relatorio,
      ]
        .filter(Boolean)
        .join(" "),
    );

    const matchBusca = buscaNormalizada
      ? textoBase.includes(buscaNormalizada)
      : true;

    return matchStatus && matchTipo && matchBusca;
  });
}

export function buildSummaryCards(relatorios: Relatorio[]): SummaryCard[] {
  const total = relatorios.length;
  const concluidos = relatorios.filter(
    (item) => item.status === RELATORIO_STATUS.CONCLUIDO,
  ).length;
  const monitoramento = relatorios.filter(
    (item) => item.tipo === RELATORIO_TIPO.MONITORAMENTO,
  ).length;
  const comFoto = relatorios.filter(
    (item) => item.conteudo_json?.imagem_monitoramento?.possui_foto,
  ).length;

  return [
    {
      title: "Relatórios",
      value: formatNumber(total),
      hint: "Disponíveis",
      tone: "blue",
      filterKey: "todos",
    },
    {
      title: "Finalizados",
      value: formatNumber(concluidos),
      hint: "Prontos para consulta",
      tone: concluidos > 0 ? "green" : "amber",
      filterKey: "concluido",
    },
    {
      title: "Coletas",
      value: formatNumber(monitoramento),
      hint: "Com vínculo de campo",
      tone: "amber",
      filterKey: "monitoramento",
    },
    {
      title: "Com imagem",
      value: formatNumber(comFoto),
      hint: "Com registro visual",
      tone: comFoto > 0 ? "green" : "blue",
      filterKey: "com_imagem",
    },
  ];
}

export function countProcessingRelatorios(relatorios: Relatorio[]): number {
  return relatorios.filter(
    (item) =>
      item.status === RELATORIO_STATUS.PROCESSANDO ||
      item.status === RELATORIO_STATUS.PENDENTE,
  ).length;
}