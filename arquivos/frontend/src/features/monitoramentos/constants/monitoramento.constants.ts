import type {
  EstadioOption,
  FiltroStatus,
  MapPoint,
  MonitoramentoPayload,
} from "../types/monitoramento.types";

export const DEFAULT_MAP_CENTER: MapPoint = [-16.47, -54.635];

export const DEFAULT_MAP_ZOOM = 13;

export const MONITORAMENTO_QUERY_KEYS = {
  lista: ["monitoramentos-lista"],
  talhoesOptions: ["talhoes-options-monitoramentos"],
} as const;

export const INITIAL_MONITORAMENTO_FORM_STATE: MonitoramentoPayload = {
  talhao: "",
  data_observacao: "",
  estadio_fenologico: "",
  altura_planta_cm: "",
  populacao_plantas: "",
  umidade_solo: "",
  sanidade: "",
  latitude: "",
  longitude: "",
  observacoes: "",
  ativa: true,
};

export const ESTADIOS_FENOLOGICOS: EstadioOption[] = [
  { value: "VE", label: "VE - Emergência" },
  { value: "V1", label: "V1 - 1 folha expandida" },
  { value: "V2", label: "V2 - 2 folhas expandidas" },
  { value: "V3", label: "V3 - 3 folhas expandidas" },
  { value: "V4", label: "V4 - 4 folhas expandidas" },
  { value: "V5", label: "V5 - 5 folhas expandidas" },
  { value: "V6", label: "V6 - 6 folhas expandidas" },
  { value: "V7", label: "V7 - 7 folhas expandidas" },
  { value: "V8", label: "V8 - 8 folhas expandidas" },
  { value: "V9", label: "V9 - 9 folhas expandidas" },
  { value: "V10", label: "V10 - 10 folhas expandidas" },
  { value: "V11", label: "V11 - 11 folhas expandidas" },
  { value: "V12", label: "V12 - 12 folhas expandidas" },
  { value: "V13", label: "V13 - 13 folhas expandidas" },
  { value: "V14", label: "V14 - 14 folhas expandidas" },
  { value: "V15", label: "V15 - 15 folhas expandidas" },
  { value: "V16", label: "V16 - 16 folhas expandidas" },
  { value: "V17", label: "V17 - 17 folhas expandidas" },
  { value: "V18", label: "V18 - 18 folhas expandidas" },
  { value: "R1", label: "R1 - Florescimento" },
  { value: "R2", label: "R2 - Grão bolha" },
  { value: "R3", label: "R3 - Grão leitoso" },
  { value: "R4", label: "R4 - Grão pastoso" },
  { value: "R5", label: "R5 - Grão dentado" },
  { value: "R6", label: "R6 - Maturidade fisiológica" },
];

export const MONITORAMENTO_STATUS_FILTER_OPTIONS: Array<{
  value: FiltroStatus;
  label: string;
}> = [
  { value: "", label: "Todas as coletas" },
  { value: "criticos", label: "Atenção prioritária" },
  { value: "prontos", label: "Prontas para análise" },
  { value: "sem_foto", label: "Sem imagem" },
  { value: "ativos", label: "Coletas ativas" },
  { value: "arquivados", label: "Coletas arquivadas" },
];