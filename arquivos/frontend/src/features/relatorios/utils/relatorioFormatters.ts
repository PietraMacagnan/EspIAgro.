import axios from "axios";

import type {
  GenerationTaskStatus,
  GenerationTaskType,
  GerarCompletoResponse,
  GerarPdfResponse,
  IdentificacaoFenologica,
  Relatorio,
  RelatorioStatus,
  RelatorioTipo,
  RelatorioTone,
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
    "Estádio em análise"
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
  return getPhenologyCode(identificacao) || "Em análise";
}

export function getPhenologyDisplayDescription(
  identificacao?: IdentificacaoFenologica,
): string {
  const label = getPhenologyLabel(identificacao);

  if (label && label !== "Estádio em análise") {
    return label;
  }

  return "O sistema deve estimar o estádio fenológico com base na coleta, imagem, data, histórico do talhão e informações técnicas disponíveis.";
}

export function getRelatorioTone(relatorio: Relatorio): RelatorioTone {
  if (relatorio.status === "erro") {
    return "red";
  }

  if (relatorio.status === "processando" || relatorio.status === "pendente") {
    return "amber";
  }

  if (relatorio.tipo === "monitoramento") {
    return "blue";
  }

  return "green";
}

export function getStatusBadgeClass(status?: string): string {
  if (status === "erro") {
    return "espiagro-badge-red";
  }

  if (status === "processando" || status === "pendente") {
    return "espiagro-badge-amber";
  }

  if (status === "concluido") {
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

  return "Em análise";
}

export function getStatusExplanation(status?: string): string {
  if (status === "concluido") {
    return "O relatório foi finalizado e está disponível para consulta.";
  }

  if (status === "processando") {
    return "O sistema ainda está montando o conteúdo deste relatório.";
  }

  if (status === "pendente") {
    return "Este relatório ainda aguarda processamento.";
  }

  if (status === "erro") {
    return "Houve uma falha na geração e o relatório precisa de nova tentativa.";
  }

  return "Situação atual do relatório no sistema.";
}

export function getTypeExplanation(tipo?: string): string {
  if (tipo === "monitoramento") {
    return "Relatório gerado a partir de uma coleta de campo.";
  }

  if (tipo === "talhao") {
    return "Relatório voltado para a leitura de um talhão específico.";
  }

  if (tipo === "propriedade") {
    return "Relatório voltado para a visão de uma propriedade rural.";
  }

  if (tipo === "geral") {
    return "Relatório geral com informações consolidadas.";
  }

  return "Categoria do relatório registrada na plataforma.";
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

export function getRiskScoreExplanation(score?: number): string {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "Ainda não há pontuação de risco calculada para este relatório.";
  }

  if (score >= 80) {
    return `Pontuação ${score}/100: risco crítico. Exige atenção imediata.`;
  }

  if (score >= 60) {
    return `Pontuação ${score}/100: risco alto. Requer acompanhamento próximo.`;
  }

  if (score >= 30) {
    return `Pontuação ${score}/100: risco moderado. Observe a evolução do talhão.`;
  }

  return `Pontuação ${score}/100: risco baixo. A situação está controlada no momento.`;
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

  return "O sistema ainda está consolidando a leitura técnica deste relatório.";
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

export function getFiltroStatusLabel(status: RelatorioStatus | ""): string {
  if (status === "pendente") {
    return "Aguardando";
  }

  if (status === "processando") {
    return "Em preparo";
  }

  if (status === "concluido") {
    return "Finalizado";
  }

  if (status === "erro") {
    return "Falha";
  }

  return "Todos";
}

export function getFiltroTipoLabel(tipo: RelatorioTipo | ""): string {
  if (tipo === "monitoramento") {
    return "Coleta de campo";
  }

  if (tipo === "talhao") {
    return "Talhão";
  }

  if (tipo === "propriedade") {
    return "Propriedade";
  }

  if (tipo === "geral") {
    return "Geral";
  }

  return "Todos";
}

export function getGenerationStartedMessage(type: GenerationTaskType): string {
  if (type === "completo") {
    return "O relatório completo está sendo preparado. Você pode continuar usando o app normalmente.";
  }

  if (type === "pdf") {
    return "O PDF está sendo preparado. Você pode continuar usando o app normalmente.";
  }

  return "A análise está sendo gerada. Você pode continuar usando o app normalmente.";
}

export function getGenerationLabel(type: GenerationTaskType): string {
  if (type === "completo") {
    return "Relatório completo";
  }

  if (type === "pdf") {
    return "PDF do relatório";
  }

  return "Análise do relatório";
}

export function getGenerationStage(
  type: GenerationTaskType,
  progress: number,
  status: GenerationTaskStatus,
): string {
  if (status === "done") {
    return "Concluído";
  }

  if (status === "error") {
    return "Falha na geração";
  }

  if (type === "completo") {
    if (progress < 28) return "Organizando dados da coleta";
    if (progress < 52) return "Gerando análise técnica";
    if (progress < 78) return "Montando PDF";
    return "Finalizando arquivo";
  }

  if (type === "pdf") {
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