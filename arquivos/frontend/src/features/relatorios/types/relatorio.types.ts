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

export type RelatorioStatus =
  (typeof RELATORIO_STATUS)[keyof typeof RELATORIO_STATUS];

export type RelatorioTipo =
  (typeof RELATORIO_TIPO)[keyof typeof RELATORIO_TIPO];

export type FiltroStatus = "" | RelatorioStatus;

export type FiltroTipo = "" | RelatorioTipo;

export type GenerationTaskType =
  (typeof GENERATION_TASK_TYPE)[keyof typeof GENERATION_TASK_TYPE];

export type GenerationTaskStatus =
  (typeof GENERATION_TASK_STATUS)[keyof typeof GENERATION_TASK_STATUS];

export type RelatorioTone = "green" | "amber" | "red" | "blue";

export type SummaryFilterKey =
  | "todos"
  | "concluido"
  | "monitoramento"
  | "com_imagem";

export type ReferenciaTecnicaDetalhe = {
  id?: number;
  titulo?: string;
  autor?: string;
  instituicao?: string;
  ano_publicacao?: number | null;
  categoria?: string;
  categoria_display?: string;
  escopo_cultura?: string;
  escopo_cultura_display?: string;
  escopo_agronomico?: string;
  status_indexacao?: string;
  status_indexacao_display?: string;
};

export type ApoioDiagnosticoUi = {
  status_ia?: string;
  mensagem_status?: string;
  resumo_principal?: string;
  pontos_principais?: string[];
  interpretacao_agronomica?: string;
  recomendacoes_iniciais?: string[];
  limitacoes?: string;
  fontes_utilizadas?: string[];
};

export type ApoioDiagnostico = {
  resumo_tecnico?: string;
  pontos_atencao?: string[];
  modo_geracao?: string;
  modelo_ia?: string | null;
  erro_ia?: string | null;
  ui?: ApoioDiagnosticoUi;
};

export type IdentificacaoFenologica = {
  estadio_informado?: string;
  estadio_informado_display?: string;
  estadio_sugerido_ia?: string | null;
  confianca_ia?: number | null;
  houve_sugestao_ia?: boolean;
  houve_convergencia?: boolean;
  divergencia_detectada?: boolean;
  status_identificacao?: string;
  mensagem_status?: string;
  estadio_considerado_relatorio?: string;
};

export type RiscoMonitoramento = {
  score_risco?: number;
  faixa_risco_display?: string;
  prioridade_operacional_display?: string;
  justificativa_risco?: string;
  nivel_gravidade?: string;
  nivel_gravidade_display?: string;
  prioridade_operacional?: string;

};

export type ClimaRelatorio = {
  sucesso?: boolean;
  erro?: string | null;
  dados?: {
    temperatura?: number;
    umidade?: number;
    descricao?: string;
  };
};

export type ImagemMonitoramentoRelatorio = {
  possui_foto?: boolean;
  status_imagem_ia_display?: string;
  ia_estadio_fenologico_sugerido?: string | null;
  ia_confianca_imagem?: number | null;
};

export type ConteudoRelatorioJson = {
  apoio_diagnostico?: ApoioDiagnostico;
  identificacao_fenologica?: IdentificacaoFenologica;
  risco_monitoramento?: RiscoMonitoramento;
  clima?: ClimaRelatorio;
  imagem_monitoramento?: ImagemMonitoramentoRelatorio;
};

export type Relatorio = {
  id: number;
  titulo?: string;
  resumo?: string;
  tipo?: string;
  tipo_display?: string;
  status?: string;
  status_display?: string;
  observacoes?: string;
  ativa?: boolean;
  gerado_em?: string | null;
  created_at?: string;
  updated_at?: string;
  pdf_url?: string | null;
  pdf_url_absoluta?: string | null;
  pdf_download_url?: string | null;
  pdf_disponivel?: boolean;
  imagem_monitoramento_url?: string | null;
  foto_url?: string | null;
  referencias_tecnicas_detalhes?: ReferenciaTecnicaDetalhe[];
  monitoramento?: number | null;
  talhao?: number | null;
  talhao_nome?: string | null;
  propriedade?: number | null;
  propriedade_nome?: string | null;
  conteudo_json?: ConteudoRelatorioJson;
};

export type GerarConteudoResponse = {
  detail?: string;
  relatorio?: Relatorio;
};

export type GerarPdfResponse = {
  detail?: string;
  pdf_url?: string;
  arquivo?: string;
  relatorio?: Relatorio;
};

export type GerarCompletoResponse = {
  detail?: string;
  pdf_url?: string;
  arquivo?: string;
  conteudo_gerado?: boolean;
  pdf_gerado?: boolean;
  relatorio?: Relatorio;
};

export type SummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: RelatorioTone;
  filterKey?: SummaryFilterKey;
};

export type GenerationTask = {
  id: string;
  relatorioId: number;
  relatorioTitle: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  message: string;
  stage: string;
  progress: number;
  startedAt: string;
  finishedAt?: string;
  pdfUrl?: string | null;
  relatorio?: Relatorio;
};

export type RelatoriosFilters = {
  status: FiltroStatus;
  tipo: FiltroTipo;
  busca: string;
};

export type RelatorioActionHandlers = {
  onOpenDetails: (relatorioId: number) => void;
  onGenerateComplete: (relatorio: Relatorio) => void;
  onGenerateContent: (relatorio: Relatorio) => void;
  onGeneratePdf: (relatorio: Relatorio) => void;
  onDownloadPdf: (relatorio: Relatorio) => void;
  onArchive: (relatorioId: number) => void;
  onReactivate: (relatorioId: number) => void;
  onDelete: (relatorioId: number) => void;
};

export type RelatorioGenerationState = {
  tasks: GenerationTask[];
  isGenerationRunning: (
    relatorioId: number,
    type: GenerationTaskType,
  ) => boolean;
};

export type RelatorioRecordActionState = {
  isRecordActionRunning: boolean;
};

export type RelatoriosQueryState = {
  relatorios: Relatorio[];
  relatoriosFiltrados: Relatorio[];
  selectedRelatorio: Relatorio | null;
  summaryCards: SummaryCard[];
  processingCount: number;
  hasActiveFilters: boolean;
  activeStructuredFilterCount: number;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
};