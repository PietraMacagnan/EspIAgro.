import type {
  Alerta,
  AlertaPayload,
  AlertasFilters,
  AlertSummaryFilterKey,
  AlertTone,
  FiltroLido,
  FiltroSeveridade,
  FiltroStatus,
  FiltroTipo,
  SummaryCard,
} from "../types/alerta.types";

export const initialAlertaFormState: AlertaPayload = {
  titulo: "",
  mensagem: "",
  recomendacao: "",
  status: "ativo",
  lido: false,
  ativa: true,
};

export const alertaPayloadKeys = Object.keys(
  initialAlertaFormState,
) as (keyof AlertaPayload)[];

export function formatAlertNumber(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatAlertDateTime(
  dateString: string | undefined | null,
): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString("pt-BR");
}

export function normalizeAlertText(value: string | undefined | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function getAlertTone(alerta: Alerta): AlertTone {
  if (
    alerta.severidade === "critica" ||
    alerta.severidade === "alta" ||
    alerta.prioridade === "imediata" ||
    alerta.prioridade === "alta"
  ) {
    return "red";
  }

  if (
    alerta.severidade === "media" ||
    alerta.prioridade === "media" ||
    alerta.status === "em_analise"
  ) {
    return "orange";
  }

  if (alerta.status === "ativo" || alerta.lido === false) {
    return "amber";
  }

  if (
    alerta.status === "ignorado" ||
    alerta.tipo === "imagem" ||
    alerta.tipo === "clima" ||
    alerta.tipo === "anomalia"
  ) {
    return "blue";
  }

  return "green";
}

export function getStatusBadgeClass(status?: string): string {
  if (status === "resolvido") {
    return "espiagro-badge-green";
  }

  if (status === "ativo") {
    return "espiagro-badge-amber";
  }

  if (status === "em_analise") {
    return "espiagro-badge-orange";
  }

  if (status === "ignorado") {
    return "espiagro-badge-blue";
  }

  return "espiagro-badge-blue";
}

export function getSeverityBadgeClass(severidade?: string): string {
  if (severidade === "critica" || severidade === "alta") {
    return "espiagro-badge-red";
  }

  if (severidade === "media") {
    return "espiagro-badge-orange";
  }

  if (severidade === "baixa") {
    return "espiagro-badge-green";
  }

  return "espiagro-badge-blue";
}

export function getPriorityBadgeClass(prioridade?: string): string {
  if (prioridade === "imediata" || prioridade === "alta") {
    return "espiagro-badge-red";
  }

  if (prioridade === "media") {
    return "espiagro-badge-orange";
  }

  if (prioridade === "baixa") {
    return "espiagro-badge-green";
  }

  return "espiagro-badge-blue";
}

export function getStatusDescription(status?: string): string {
  if (status === "ativo") {
    return "Este aviso ainda precisa de acompanhamento. Verifique a situação e defina a próxima ação no campo.";
  }

  if (status === "em_analise") {
    return "O aviso já está sendo acompanhado, mas ainda não foi encerrado.";
  }

  if (status === "resolvido") {
    return "A situação foi tratada e o aviso não está mais como pendência principal.";
  }

  if (status === "ignorado") {
    return "O aviso foi retirado da prioridade atual, mas permanece registrado no histórico.";
  }

  return "A situação deste aviso ainda não foi informada.";
}

export function getSeverityDescription(severidade?: string): string {
  if (severidade === "critica") {
    return "Atenção urgente. Esta situação pode exigir ação rápida para reduzir risco na lavoura.";
  }

  if (severidade === "alta") {
    return "Atenção elevada. A situação deve ser observada com prioridade.";
  }

  if (severidade === "media") {
    return "Atenção moderada. Acompanhe nos próximos monitoramentos.";
  }

  if (severidade === "baixa") {
    return "Atenção baixa. Acompanhe normalmente, sem urgência no momento.";
  }

  return "A gravidade ainda não foi informada para este aviso.";
}

export function getPriorityDescription(prioridade?: string): string {
  if (prioridade === "imediata") {
    return "Ação recomendada o quanto antes.";
  }

  if (prioridade === "alta") {
    return "Priorize este aviso na próxima vistoria.";
  }

  if (prioridade === "media") {
    return "Acompanhe a situação, sem urgência imediata.";
  }

  if (prioridade === "baixa") {
    return "Mantenha em observação durante o acompanhamento normal.";
  }

  return "A prioridade ainda não foi informada.";
}

export function getTypeDescription(tipo?: string, tipoDisplay?: string): string {
  if (tipo === "diagnostico") {
    return "Aviso gerado a partir da análise de uma coleta de campo.";
  }

  if (tipo === "risco") {
    return "Aviso relacionado ao nível de risco observado na lavoura.";
  }

  if (tipo === "clima") {
    return "Aviso relacionado às condições climáticas que podem afetar a lavoura.";
  }

  if (tipo === "sanidade") {
    return "Aviso relacionado à sanidade ou possível ocorrência na lavoura.";
  }

  if (tipo === "umidade_solo") {
    return "Aviso relacionado à umidade do solo.";
  }

  if (tipo === "imagem") {
    return "Aviso gerado com apoio de imagem ou evidência visual registrada.";
  }

  if (tipo === "operacional") {
    return "Aviso de acompanhamento operacional da lavoura.";
  }

  if (tipo === "anomalia") {
    return "Aviso sobre possível anomalia observada no acompanhamento.";
  }

  return tipoDisplay
    ? `Aviso classificado como ${tipoDisplay.toLowerCase()}.`
    : "O tipo deste aviso ainda não foi informado.";
}

export function getReadDescription(lido?: boolean): string {
  return lido
    ? "Este aviso já foi visualizado."
    : "Este é um novo aviso e ainda precisa ser visualizado.";
}

export function getActiveDescription(ativa?: boolean): string {
  return ativa === false
    ? "Este aviso está arquivado e fora da lista principal."
    : "Este aviso está disponível para acompanhamento.";
}

export function getStatusFilterLabel(status: FiltroStatus): string {
  if (status === "ativo") return "Em aberto";
  if (status === "em_analise") return "Em acompanhamento";
  if (status === "resolvido") return "Resolvido";
  if (status === "ignorado") return "Fora da prioridade";

  return "Todos";
}

export function getTipoFilterLabel(tipo: FiltroTipo): string {
  if (tipo === "diagnostico") return "Diagnóstico";
  if (tipo === "risco") return "Risco";
  if (tipo === "clima") return "Clima";
  if (tipo === "sanidade") return "Sanidade";
  if (tipo === "umidade_solo") return "Umidade do solo";
  if (tipo === "imagem") return "Imagem";
  if (tipo === "operacional") return "Acompanhamento";
  if (tipo === "anomalia") return "Anomalia";

  return "Todos";
}

export function getSeveridadeFilterLabel(
  severidade: FiltroSeveridade,
): string {
  if (severidade === "baixa") return "Baixa";
  if (severidade === "media") return "Média";
  if (severidade === "alta") return "Alta";
  if (severidade === "critica") return "Crítica";

  return "Todas";
}

export function getLidoFilterLabel(lido: FiltroLido): string {
  if (lido === "true") return "Já vistos";
  if (lido === "false") return "Novos avisos";

  return "Todos";
}

export function getPrimaryTitle(alerta: Alerta): string {
  return (
    alerta.titulo ||
    alerta.resumo_operacional?.titulo ||
    `Aviso da lavoura #${alerta.id}`
  );
}

export function getPrimaryMessage(alerta: Alerta): string {
  return (
    alerta.mensagem ||
    alerta.resumo_operacional?.mensagem ||
    "Este aviso ainda não possui uma descrição detalhada."
  );
}

export function getPrimaryRecommendation(alerta: Alerta): string {
  return (
    alerta.recomendacao ||
    alerta.resumo_operacional?.recomendacao ||
    "Abra os detalhes para revisar este aviso e definir a melhor ação."
  );
}

export function getReadableSeverity(alerta: Alerta): string {
  return alerta.severidade_display || alerta.severidade || "Sem gravidade";
}

export function getReadablePriority(alerta: Alerta): string {
  return alerta.prioridade_display || alerta.prioridade || "Sem prioridade";
}

export function getReadableStatus(alerta: Alerta): string {
  return alerta.status_display || alerta.status || "Sem situação";
}

export function getReadableType(alerta: Alerta): string {
  return alerta.tipo_display || alerta.tipo || "Sem tipo";
}

export function getAlertCardIcon(tone: AlertTone): string {
  if (tone === "red") return "!";
  if (tone === "orange") return "!";
  if (tone === "amber") return "•";
  if (tone === "blue") return "i";

  return "✓";
}

export function mapAlertaToPayload(item: Alerta): AlertaPayload {
  return {
    titulo: item.titulo ?? "",
    mensagem: item.mensagem ?? "",
    recomendacao: item.recomendacao ?? "",
    status: item.status ?? "ativo",
    lido: item.lido ?? false,
    ativa: item.ativa !== false,
  };
}

export function filterAlertas(
  alertas: Alerta[],
  filters: AlertasFilters,
): Alerta[] {
  const buscaNormalizada = normalizeAlertText(filters.busca);

  return alertas.filter((item) => {
    const resumo = item.resumo_operacional;

    const textoBase = normalizeAlertText(
      [
        item.titulo,
        item.mensagem,
        item.recomendacao,
        item.regra_origem,
        item.propriedade_nome,
        item.talhao_nome,
        item.tipo_display,
        item.status_display,
        item.prioridade_display,
        item.severidade_display,
        item.escopo_agronomico,
        resumo?.titulo,
        resumo?.mensagem,
        resumo?.recomendacao,
        resumo?.escopo_agronomico,
      ]
        .filter(Boolean)
        .join(" "),
    );

    return buscaNormalizada ? textoBase.includes(buscaNormalizada) : true;
  });
}

export function buildAlertSummaryCards(alertas: Alerta[]): SummaryCard[] {
  const total = alertas.length;
  const ativos = countActiveAlertas(alertas);
  const criticos = countCriticalAlertas(alertas);
  const naoLidos = countUnreadAlertas(alertas);

  return [
    {
      title: "Avisos da lavoura",
      value: formatAlertNumber(total),
      hint: "Alertas registrados para acompanhamento",
      tone: "blue",
      filterKey: "todos",
    },
    {
      title: "Precisam de atenção",
      value: formatAlertNumber(ativos),
      hint: "Ainda estão em aberto",
      tone: ativos > 0 ? "amber" : "green",
      filterKey: "ativos",
    },
    {
      title: "Ação urgente",
      value: formatAlertNumber(criticos),
      hint: "Prioridade maior no campo",
      tone: criticos > 0 ? "red" : "green",
      filterKey: "criticos",
    },
    {
      title: "Novos avisos",
      value: formatAlertNumber(naoLidos),
      hint: "Ainda não visualizados",
      tone: naoLidos > 0 ? "amber" : "green",
      filterKey: "nao_lidos",
    },
  ];
}

export function countActiveAlertas(alertas: Alerta[]): number {
  return alertas.filter((item) => item.status === "ativo").length;
}

export function countCriticalAlertas(alertas: Alerta[]): number {
  return alertas.filter(
    (item) =>
      item.severidade === "critica" || item.prioridade === "imediata",
  ).length;
}

export function countUnreadAlertas(alertas: Alerta[]): number {
  return alertas.filter((item) => !item.lido).length;
}

export function hasAlertFilters(filters: AlertasFilters): boolean {
  return Boolean(
    filters.status ||
      filters.tipo ||
      filters.severidade ||
      filters.lido ||
      filters.busca.trim(),
  );
}

export function countStructuredAlertFilters(filters: AlertasFilters): number {
  return (
    Number(Boolean(filters.status)) +
    Number(Boolean(filters.tipo)) +
    Number(Boolean(filters.severidade)) +
    Number(Boolean(filters.lido))
  );
}

export function applyAlertQuickFilter(
  filterKey?: AlertSummaryFilterKey,
): AlertasFilters {
  const emptyFilters: AlertasFilters = {
    status: "",
    tipo: "",
    severidade: "",
    lido: "",
    busca: "",
  };

  if (filterKey === "ativos") {
    return {
      ...emptyFilters,
      status: "ativo",
    };
  }

  if (filterKey === "criticos") {
    return {
      ...emptyFilters,
      severidade: "critica",
    };
  }

  if (filterKey === "nao_lidos") {
    return {
      ...emptyFilters,
      lido: "false",
    };
  }

  return emptyFilters;
}