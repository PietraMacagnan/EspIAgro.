export const RELATORIO_STATUS = {
  PENDENTE: "pendente",
  PROCESSANDO: "processando",
  CONCLUIDO: "concluido",
  ERRO: "erro",
} as const;

export const RELATORIO_TIPO = {
  MONITORAMENTO: "monitoramento",
  TALHAO: "talhao",
  PROPRIEDADE: "propriedade",
  GERAL: "geral",
} as const;

export const GENERATION_TASK_TYPE = {
  COMPLETO: "completo",
  CONTEUDO: "conteudo",
  PDF: "pdf",
} as const;

export const GENERATION_TASK_STATUS = {
  RUNNING: "running",
  DONE: "done",
  ERROR: "error",
} as const;

export const RELATORIO_TONE = {
  GREEN: "green",
  AMBER: "amber",
  RED: "red",
  BLUE: "blue",
} as const;

export const RELATORIO_FILTER_OPTIONS = {
  status: [
    { value: "", label: "Todos" },
    { value: RELATORIO_STATUS.PENDENTE, label: "Aguardando" },
    { value: RELATORIO_STATUS.PROCESSANDO, label: "Em preparo" },
    { value: RELATORIO_STATUS.CONCLUIDO, label: "Finalizado" },
    { value: RELATORIO_STATUS.ERRO, label: "Falha" },
  ],
  tipo: [
    { value: "", label: "Todos" },
    { value: RELATORIO_TIPO.MONITORAMENTO, label: "Coleta de campo" },
    { value: RELATORIO_TIPO.TALHAO, label: "Talhão" },
    { value: RELATORIO_TIPO.PROPRIEDADE, label: "Propriedade" },
    { value: RELATORIO_TIPO.GERAL, label: "Geral" },
  ],
} as const;

export const RELATORIO_SUMMARY_FILTER = {
  TODOS: "todos",
  CONCLUIDO: "concluido",
  MONITORAMENTO: "monitoramento",
  COM_IMAGEM: "com_imagem",
} as const;

export const RELATORIO_MESSAGES = {
  loading: {
    title: "Buscando relatórios",
    description: "Buscando as informações mais recentes.",
  },
  error: {
    title: "Não foi possível carregar os relatórios",
    description: "Verifique sua conexão e tente novamente em alguns instantes.",
  },
  empty: {
    title: "Sem resultados",
    description: "Nenhum relatório foi encontrado com os filtros atuais.",
  },
  feedback: {
    arquivoArquivado: "Relatório arquivado com sucesso.",
    arquivoReativado: "Relatório reativado com sucesso.",
    arquivoExcluido: "Relatório excluído com sucesso.",
    erroArquivar: "Não foi possível arquivar o relatório.",
    erroReativar: "Não foi possível reativar o relatório.",
    erroExcluir: "Não foi possível excluir o relatório.",
    erroGerarCompleto: "Não foi possível gerar o relatório completo.",
    erroGerarAnalise: "Não foi possível gerar a análise do relatório.",
    erroGerarPdf: "Não foi possível gerar o PDF do relatório.",
    erroLocalizarPdf: "Não foi possível localizar este relatório para gerar o PDF.",
    erroPdfIndisponivel: "Este relatório ainda não possui PDF disponível para download.",
    downloadIniciado: "Download do PDF iniciado com sucesso.",
    completoConcluido: "Relatório completo concluído com sucesso.",
    analiseConcluida: "Análise concluída com sucesso.",
    pdfConcluido: "PDF concluído com sucesso.",
  },
} as const;

export const CONFIRMATION_MESSAGES = {
  archive:
    "Deseja arquivar este relatório? Ele ficará guardado, mas fora da lista principal.",
  reactivate:
    "Deseja reativar este relatório e deixá-lo disponível novamente?",
  delete:
    "Deseja excluir definitivamente este relatório? Esta ação não poderá ser desfeita.",
} as const;

export const GENERATION_STARTED_MESSAGES = {
  [GENERATION_TASK_TYPE.COMPLETO]:
    "O relatório completo está sendo preparado. Você pode continuar usando o app normalmente.",
  [GENERATION_TASK_TYPE.CONTEUDO]:
    "A análise está sendo gerada. Você pode continuar usando o app normalmente.",
  [GENERATION_TASK_TYPE.PDF]:
    "O PDF está sendo preparado. Você pode continuar usando o app normalmente.",
} as const;

export const GENERATION_LABELS = {
  [GENERATION_TASK_TYPE.COMPLETO]: "Relatório completo",
  [GENERATION_TASK_TYPE.CONTEUDO]: "Análise do relatório",
  [GENERATION_TASK_TYPE.PDF]: "PDF do relatório",
} as const;

export const GENERATION_ENDPOINT_TIMEOUT = {
  completo: 180000,
  conteudo: 120000,
  pdf: 120000,
  download: 120000,
} as const;

export const GENERATION_PROGRESS = {
  initial: 8,
  maxBeforeFinish: 92,
  intervalMs: 1100,
  completeIncrement: 5,
  defaultIncrement: 6,
} as const;

export const RELATORIO_QUERY_KEYS = {
  lista: ["relatorios-lista"],
} as const;

export const RELATORIO_ENDPOINTS = {
  list: "/relatorios/",
  detail: (id: number) => `/relatorios/${id}/`,
  gerarCompleto: (id: number) => `/relatorios/${id}/gerar-completo/`,
  gerarConteudo: (id: number) => `/relatorios/${id}/gerar-conteudo/`,
  gerarPdf: (id: number) => `/relatorios/${id}/gerar-pdf/`,
} as const;

export function getGenerationStageLabel(
  type: keyof typeof GENERATION_LABELS,
  progress: number,
  status: keyof typeof GENERATION_TASK_STATUS | "running" | "done" | "error",
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