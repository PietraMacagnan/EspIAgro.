export type TalhaoOption = {
  id: number;
  nome?: string;
  propriedade_nome?: string;
  ativa?: boolean;
};

export type CompletudeColeta = {
  percentual_completude?: number;
  pendentes_criticos?: string[];
  pendentes_recomendados?: string[];
  inconsistencias?: string[];
  pronto_para_diagnostico?: boolean;
  pronto_para_relatorio?: boolean;
  pronto_para_analise_imagem?: boolean;
};

export type FeedbackUI = {
  status_preenchimento?: string;
  mensagem_status?: string;
  sugerir_foto?: boolean;
  orientar_usuario?: string[];
  orientacoes_usuario?: string[];
};

export type ImagemMonitoramento = {
  possui_foto?: boolean;
  status_imagem_ia?: string;
  status_imagem_ia_display?: string;
  foto_url?: string | null;
};

export type LocalizacaoMonitoramento = {
  latitude: number;
  longitude: number;
  point?: {
    type: "Point";
    coordinates: [number, number];
  };
};

export type RiscoMonitoramento = {
  score_risco?: number;
  faixa_risco?: string;
  faixa_risco_display?: string;
  prioridade_operacional?: string;
  prioridade_operacional_display?: string;
  justificativa_risco?: string;
};

export type Monitoramento = {
  id: number;
  talhao?: number | null;
  talhao_nome?: string;
  data_observacao: string;
  estadio_fenologico?: string;
  estadio_fenologico_display?: string;
  nivel_atencao?: string;
  nivel_atencao_display?: string;
  status_diagnostico?: string;
  status_diagnostico_display?: string;
  resumo_diagnostico?: string;
  score_risco?: number | string;
  faixa_risco?: string;
  faixa_risco_display?: string;
  prioridade_operacional?: string;
  prioridade_operacional_display?: string;
  justificativa_risco?: string;
  imagem_monitoramento?: ImagemMonitoramento;
  completude_coleta?: CompletudeColeta;
  feedback_ui?: FeedbackUI;
  localizacao?: LocalizacaoMonitoramento | null;
  risco?: RiscoMonitoramento | null;
  altura_planta_cm?: number | string | null;
  populacao_plantas?: number | null;
  umidade_solo?: number | string | null;
  sanidade?: string;
  observacoes?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  foto_monitoramento_url?: string | null;
  updated_at?: string;
  ativa?: boolean;
};

export type MonitoramentoPayload = {
  talhao: string;
  data_observacao: string;
  estadio_fenologico: string;
  altura_planta_cm: string;
  populacao_plantas: string;
  umidade_solo: string;
  sanidade: string;
  latitude: string;
  longitude: string;
  observacoes: string;
  ativa: boolean;
};

export type SummaryCardTone = "green" | "amber" | "red" | "blue";

export type SummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: SummaryCardTone;
};

export type FiltroStatus =
  | ""
  | "criticos"
  | "prontos"
  | "sem_foto"
  | "ativos"
  | "arquivados";

export type EstadioOption = {
  value: string;
  label: string;
};

export type MapPoint = [number, number];

export type MonitoramentoMutationMessage = {
  success: string;
  error: string;
};