import { INITIAL_MONITORAMENTO_FORM_STATE } from "../constants/monitoramento.constants";
import type {
  FiltroStatus,
  Monitoramento,
  MonitoramentoPayload,
  SummaryCard,
} from "../types/monitoramento.types";

type MonitoringTone = "green" | "amber" | "red" | "blue";

export type MonitoringFieldReading = {
  label: string;
  value: string;
  helper: string;
  tone?: MonitoringTone;
  isMissing?: boolean;
};

export type MonitoringSituationReading = {
  title: string;
  description: string;
  tone: MonitoringTone;
};

export function formatNumber(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("pt-BR");
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

export function parseNumericInput(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : NaN;
}

function toSafeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function normalizeKey(value: string | undefined | null): string {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasValue(value: unknown): boolean {
  return toSafeText(value) !== "";
}

function parseNumericValue(value: unknown): number | null {
  const text = toSafeText(value);

  if (!text) {
    return null;
  }

  const parsed = Number(text.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function formatDecimalValue(
  value: unknown,
  maximumFractionDigits = 2,
): string | null {
  const parsed = parseNumericValue(value);

  if (parsed === null) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
  }).format(parsed);
}

function formatIntegerValue(value: unknown): string | null {
  const parsed = parseNumericValue(value);

  if (parsed === null) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.trunc(parsed));
}

function formatTextValue(value: unknown): string | null {
  const text = toSafeText(value);

  if (!text) {
    return null;
  }

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function getRiskKey(item: Monitoramento): string {
  return normalizeKey(
    item.faixa_risco ??
      item.risco?.faixa_risco ??
      item.faixa_risco_display ??
      item.risco?.faixa_risco_display,
  );
}

function getPriorityKey(item: Monitoramento): string {
  return normalizeKey(
    item.prioridade_operacional ??
      item.risco?.prioridade_operacional ??
      item.prioridade_operacional_display ??
      item.risco?.prioridade_operacional_display,
  );
}

function getAttentionKey(item: Monitoramento): string {
  return normalizeKey(item.nivel_atencao ?? item.nivel_atencao_display);
}

function getDiagnosticKey(item: Monitoramento): string {
  return normalizeKey(
    item.status_diagnostico ?? item.status_diagnostico_display,
  );
}

export function getRiskSummary(item: Monitoramento): string {
  const risk = getRiskKey(item);

  if (risk.includes("critico")) {
    return "Risco crítico";
  }

  if (risk.includes("alto")) {
    return "Risco alto";
  }

  if (risk.includes("moderado") || risk.includes("medio")) {
    return "Risco moderado";
  }

  if (risk.includes("baixo")) {
    return "Risco baixo";
  }

  return "Risco ainda não classificado";
}

export function getPrioritySummary(item: Monitoramento): string {
  const priority = getPriorityKey(item);

  if (priority.includes("imediata")) {
    return "Ação imediata";
  }

  if (priority.includes("alta") || priority.includes("alto")) {
    return "Ação prioritária";
  }

  if (priority.includes("media") || priority.includes("moderada")) {
    return "Acompanhar em breve";
  }

  if (priority.includes("baixa") || priority.includes("baixo")) {
    return "Acompanhar normalmente";
  }

  return "Próxima ação ainda não definida";
}

export function getAttentionSummary(item: Monitoramento): string {
  const attention = getAttentionKey(item);

  if (attention.includes("critico")) {
    return "Atenção crítica";
  }

  if (attention.includes("alto") || attention.includes("alta")) {
    return "Atenção alta";
  }

  if (attention.includes("medio") || attention.includes("moderado")) {
    return "Atenção moderada";
  }

  if (attention.includes("baixo") || attention.includes("baixa")) {
    return "Atenção baixa";
  }

  return "Nível de atenção ainda não definido";
}

export function getDiagnosticSummary(item: Monitoramento): string {
  const diagnostic = getDiagnosticKey(item);

  if (diagnostic.includes("concluido")) {
    return "Análise técnica concluída";
  }

  if (diagnostic.includes("pendente")) {
    return "Aguardando análise técnica";
  }

  if (diagnostic.includes("analise") || diagnostic.includes("processando")) {
    return "Análise técnica em andamento";
  }

  if (diagnostic.includes("erro")) {
    return "Análise não concluída";
  }

  return "Análise técnica ainda não iniciada";
}

export function getPhenologyCode(item: Monitoramento): string {
  return item.estadio_fenologico?.trim().toUpperCase() ?? "";
}

export function getMonitoringImageUrl(item: Monitoramento): string | null {
  return (
    item.imagem_monitoramento?.foto_url ?? item.foto_monitoramento_url ?? null
  );
}

export function hasFilledFormData(formData: MonitoramentoPayload): boolean {
  return Object.entries(formData).some(([key, value]) => {
    const field = key as keyof MonitoramentoPayload;
    return value !== INITIAL_MONITORAMENTO_FORM_STATE[field];
  });
}

export function isCriticalMonitoring(item: Monitoramento): boolean {
  const risk = getRiskKey(item);
  const priority = getPriorityKey(item);
  const attention = getAttentionKey(item);

  return (
    risk.includes("critico") ||
    priority.includes("imediata") ||
    attention.includes("critico")
  );
}

export function isHighAttentionMonitoring(item: Monitoramento): boolean {
  const risk = getRiskKey(item);
  const priority = getPriorityKey(item);
  const attention = getAttentionKey(item);

  return (
    risk.includes("alto") ||
    priority.includes("alta") ||
    attention.includes("alto")
  );
}

export function isModerateAttentionMonitoring(item: Monitoramento): boolean {
  const risk = getRiskKey(item);
  const priority = getPriorityKey(item);
  const attention = getAttentionKey(item);

  return (
    risk.includes("moderado") ||
    risk.includes("medio") ||
    priority.includes("media") ||
    attention.includes("moderado") ||
    attention.includes("medio")
  );
}

export function isReadyForDiagnosis(item: Monitoramento): boolean {
  return Boolean(item.completude_coleta?.pronto_para_diagnostico);
}

export function hasMonitoringImage(item: Monitoramento): boolean {
  return Boolean(
    item.imagem_monitoramento?.possui_foto || getMonitoringImageUrl(item),
  );
}

export function getMonitoringSituationReading(
  item: Monitoramento,
): MonitoringSituationReading {
  const isActive = item.ativa !== false;

  if (isCriticalMonitoring(item)) {
    return {
      title: "Atenção urgente no campo",
      description: isActive
        ? "Esta coleta indica prioridade alta para vistoria, decisão ou acompanhamento técnico."
        : "Esta coleta está arquivada, mas registrou uma situação que exigia atenção urgente no campo.",
      tone: "red",
    };
  }

  if (isHighAttentionMonitoring(item)) {
    return {
      title: "Atenção necessária",
      description: isActive
        ? "Os dados registrados sugerem acompanhar este talhão com mais cuidado."
        : "Esta coleta está arquivada, mas contém sinais que merecem atenção no histórico.",
      tone: "amber",
    };
  }

  if (isModerateAttentionMonitoring(item)) {
    return {
      title: "Acompanhar em breve",
      description: isActive
        ? "A coleta não indica urgência, mas recomenda observar a evolução da lavoura."
        : "Esta coleta arquivada pode ser usada como referência para comparação futura.",
      tone: "blue",
    };
  }

  return {
    title: isActive ? "Situação estável no registro" : "Coleta arquivada",
    description: isActive
      ? "Os dados registrados não indicam prioridade alta no momento. Mantenha o acompanhamento normal da lavoura."
      : "Esta coleta não está ativa nos acompanhamentos atuais, mas permanece disponível para consulta.",
    tone: "green",
  };
}

export function getPlantHeightReading(
  item: Monitoramento,
): MonitoringFieldReading {
  const value = formatDecimalValue(item.altura_planta_cm);

  if (!value) {
    return {
      label: "Altura da planta",
      value: "Não informada",
      helper:
        "Preencha este dado quando houver medição de campo. O sistema não estima essa informação automaticamente.",
      tone: "amber",
      isMissing: true,
    };
  }

  return {
    label: "Altura informada",
    value: `${value} cm`,
    helper:
      "Dado preenchido na coleta a partir da observação ou medição feita em campo.",
    tone: "green",
  };
}

export function getPlantPopulationReading(
  item: Monitoramento,
): MonitoringFieldReading {
  const value = formatIntegerValue(item.populacao_plantas);

  if (!value) {
    return {
      label: "População de plantas",
      value: "Não informada",
      helper:
        "Informe este campo somente quando houver contagem, amostragem ou estimativa feita em campo.",
      tone: "amber",
      isMissing: true,
    };
  }

  return {
    label: "População informada",
    value: `${value} plantas`,
    helper:
      "Dado preenchido manualmente na coleta. O sistema não calculou esse número automaticamente.",
    tone: "green",
  };
}

export function getSoilHumidityReading(
  item: Monitoramento,
): MonitoringFieldReading {
  const value = formatDecimalValue(item.umidade_solo);

  if (!value) {
    return {
      label: "Umidade do solo",
      value: "Não informada",
      helper:
        "Registre este dado quando houver leitura, medição ou estimativa confiável no momento da coleta.",
      tone: "amber",
      isMissing: true,
    };
  }

  return {
    label: "Umidade informada",
    value: `${value}%`,
    helper:
      "Percentual informado na coleta. Quando vier de equipamento ou sensor, registre a origem nas anotações.",
    tone: "green",
  };
}

export function getCropHealthReading(
  item: Monitoramento,
): MonitoringFieldReading {
  const value = formatTextValue(item.sanidade);

  if (!value) {
    return {
      label: "Condição visual da lavoura",
      value: "Não informada",
      helper:
        "Use este campo para registrar sinais visuais como vigor, manchas, pragas, doenças ou estresse.",
      tone: "amber",
      isMissing: true,
    };
  }

  return {
    label: "Condição visual da lavoura",
    value,
    helper: "Informação registrada pelo usuário durante a coleta de campo.",
    tone: "green",
  };
}

export function getMonitoringImageReading(
  item: Monitoramento,
): MonitoringFieldReading {
  if (hasMonitoringImage(item)) {
    return {
      label: "Imagem da lavoura",
      value: "Imagem disponível",
      helper:
        "Foto anexada à coleta para apoiar a leitura visual, diagnósticos e relatórios.",
      tone: "green",
    };
  }

  return {
    label: "Imagem da lavoura",
    value: "Sem imagem",
    helper:
      "Adicionar uma foto melhora a interpretação visual da lavoura e a qualidade dos relatórios.",
    tone: "amber",
    isMissing: true,
  };
}

export function getUpdatedAtReading(item: Monitoramento): MonitoringFieldReading {
  return {
    label: "Última atualização",
    value: formatDateTime(item.updated_at),
    helper: "Momento em que este registro foi salvo ou atualizado no aplicativo.",
    tone: "blue",
  };
}

export function getLocationReading(item: Monitoramento): MonitoringFieldReading {
  const latitude = item.localizacao?.latitude ?? item.latitude;
  const longitude = item.localizacao?.longitude ?? item.longitude;

  if (!hasValue(latitude) || !hasValue(longitude)) {
    return {
      label: "Local da coleta",
      value: "Não informado",
      helper:
        "Marque o ponto no mapa ou use a localização atual para registrar onde a observação foi feita.",
      tone: "amber",
      isMissing: true,
    };
  }

  return {
    label: "Local da coleta",
    value: `Lat. ${toSafeText(latitude)} • Long. ${toSafeText(longitude)}`,
    helper: "Ponto informado na coleta para localizar a observação no mapa.",
    tone: "green",
  };
}

export function getMonitoringDataReadings(
  item: Monitoramento,
): MonitoringFieldReading[] {
  return [
    getPlantHeightReading(item),
    getPlantPopulationReading(item),
    getSoilHumidityReading(item),
    getCropHealthReading(item),
    getMonitoringImageReading(item),
    getUpdatedAtReading(item),
  ];
}

export function getMonitoringRiskReadings(
  item: Monitoramento,
): MonitoringFieldReading[] {
  const hasPhenology = Boolean(
    getPhenologyCode(item) || item.estadio_fenologico_display,
  );

  return [
    {
      label: "Fase da cultura",
      value:
        item.estadio_fenologico_display ||
        getPhenologyCode(item) ||
        "Não informada",
      helper: hasPhenology
        ? "Fase registrada na coleta para contextualizar a leitura da lavoura."
        : "Informe a fase da cultura para melhorar a interpretação técnica da coleta.",
      tone: hasPhenology ? "green" : "amber",
      isMissing: !hasPhenology,
    },
    {
      label: "Leitura de risco",
      value: getRiskSummary(item),
      helper:
        "Classificação gerada a partir dos dados disponíveis na coleta e das regras de análise do aplicativo.",
      tone: isCriticalMonitoring(item)
        ? "red"
        : isHighAttentionMonitoring(item)
          ? "amber"
          : "green",
    },
    {
      label: "Próxima ação sugerida",
      value: getPrioritySummary(item),
      helper:
        "Indicação de prioridade para orientar acompanhamento, vistoria ou decisão no campo.",
      tone: isCriticalMonitoring(item)
        ? "red"
        : isHighAttentionMonitoring(item)
          ? "amber"
          : "blue",
    },
    {
      label: "Acompanhamento",
      value: getAttentionSummary(item),
      helper:
        "Nível de atenção recomendado para acompanhar a evolução da lavoura.",
      tone: isCriticalMonitoring(item)
        ? "red"
        : isHighAttentionMonitoring(item)
          ? "amber"
          : "green",
    },
    {
      label: "Análise técnica",
      value: getDiagnosticSummary(item),
      helper:
        "Situação da análise gerada pelo aplicativo com base nas informações disponíveis.",
      tone: getDiagnosticKey(item).includes("concluido") ? "green" : "blue",
    },
  ];
}

export function filterMonitoramentosByStatus(
  monitoramentos: Monitoramento[],
  statusFiltro: FiltroStatus,
): Monitoramento[] {
  return monitoramentos.filter((item) => {
    if (statusFiltro === "criticos") {
      return isCriticalMonitoring(item);
    }

    if (statusFiltro === "prontos") {
      return isReadyForDiagnosis(item);
    }

    if (statusFiltro === "sem_foto") {
      return !hasMonitoringImage(item);
    }

    if (statusFiltro === "ativos") {
      return item.ativa !== false;
    }

    if (statusFiltro === "arquivados") {
      return item.ativa === false;
    }

    return true;
  });
}

export function buildMonitoramentoSummaryCards(
  monitoramentos: Monitoramento[],
): SummaryCard[] {
  const criticosCount = monitoramentos.filter(isCriticalMonitoring).length;
  const prontosDiagnosticoCount =
    monitoramentos.filter(isReadyForDiagnosis).length;
  const semFotoCount = monitoramentos.filter(
    (item) => !hasMonitoringImage(item),
  ).length;

  return [
    {
      title: "Coletas de campo",
      value: formatNumber(monitoramentos.length),
      hint: "Registros feitos durante o acompanhamento da lavoura.",
      tone: "green",
    },
    {
      title: "Atenção prioritária",
      value: formatNumber(criticosCount),
      hint: "Coletas que indicam necessidade de vistoria ou ação no campo.",
      tone: criticosCount > 0 ? "red" : "green",
    },
    {
      title: "Prontas para análise",
      value: formatNumber(prontosDiagnosticoCount),
      hint: "Coletas com dados suficientes para apoiar a leitura técnica da lavoura.",
      tone: "blue",
    },
    {
      title: "Sem imagem",
      value: formatNumber(semFotoCount),
      hint: "Coletas ainda sem foto da lavoura anexada.",
      tone: semFotoCount > 0 ? "amber" : "green",
    },
  ];
}

export function getFeedbackGuidance(item: Monitoramento): string[] {
  return (
    item.feedback_ui?.orientar_usuario ??
    item.feedback_ui?.orientacoes_usuario ??
    []
  );
}

export function getCriticalPendingFields(item: Monitoramento): string[] {
  return item.completude_coleta?.pendentes_criticos ?? [];
}

export function getRecommendedPendingFields(item: Monitoramento): string[] {
  return item.completude_coleta?.pendentes_recomendados ?? [];
}

export function getMonitoringInconsistencies(item: Monitoramento): string[] {
  return item.completude_coleta?.inconsistencias ?? [];
}