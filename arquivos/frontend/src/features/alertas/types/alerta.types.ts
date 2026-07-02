export type AlertaResumoOperacional = {
  titulo?: string;
  mensagem?: string;
  recomendacao?: string;
  tipo?: string;
  tipo_display?: string;
  severidade?: string;
  severidade_display?: string;
  prioridade?: string;
  prioridade_display?: string;
  status?: string;
  status_display?: string;
  lido?: boolean;
  exige_confirmacao?: boolean;
  escopo_agronomico?: string;
};

export type Alerta = {
  id: number;
  monitoramento?: number | null;
  monitoramento_id?: number | null;
  talhao?: number | null;
  talhao_nome?: string | null;
  propriedade?: number | null;
  propriedade_nome?: string | null;
  escopo_agronomico?: string;
  tipo?: string;
  tipo_display?: string;
  severidade?: string;
  severidade_display?: string;
  prioridade?: string;
  prioridade_display?: string;
  status?: string;
  status_display?: string;
  titulo?: string;
  mensagem?: string;
  recomendacao?: string;
  regra_origem?: string;
  lido?: boolean;
  exige_confirmacao?: boolean;
  ativa?: boolean;
  resumo_operacional?: AlertaResumoOperacional;
  gerado_em?: string;
  resolvido_em?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AlertaActionResponse = {
  detail: string;
  alerta: Alerta;
};

export type AlertaPayload = {
  titulo: string;
  mensagem: string;
  recomendacao: string;
  status: string;
  lido: boolean;
  ativa: boolean;
};

export type AlertSummaryTone = "green" | "amber" | "orange" | "red" | "blue";

export type AlertSummaryFilterKey =
  | "todos"
  | "ativos"
  | "criticos"
  | "nao_lidos";

export type SummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: AlertSummaryTone;
  filterKey?: AlertSummaryFilterKey;
};

export type FiltroStatus =
  | ""
  | "ativo"
  | "em_analise"
  | "resolvido"
  | "ignorado";

export type FiltroTipo =
  | ""
  | "diagnostico"
  | "risco"
  | "clima"
  | "sanidade"
  | "umidade_solo"
  | "imagem"
  | "operacional"
  | "anomalia";

export type FiltroSeveridade = "" | "baixa" | "media" | "alta" | "critica";

export type FiltroLido = "" | "true" | "false";

export type AlertasFilters = {
  status: FiltroStatus;
  tipo: FiltroTipo;
  severidade: FiltroSeveridade;
  lido: FiltroLido;
  busca: string;
};

export type AlertasDraftFilters = {
  status: FiltroStatus;
  tipo: FiltroTipo;
  severidade: FiltroSeveridade;
  lido: FiltroLido;
};

export type AlertTone = "green" | "amber" | "orange" | "red" | "blue";