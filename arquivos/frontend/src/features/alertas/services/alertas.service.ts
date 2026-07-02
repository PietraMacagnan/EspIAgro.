import http from "@/services/http";

import type {
  Alerta,
  AlertaActionResponse,
  AlertaPayload,
  FiltroLido,
  FiltroSeveridade,
  FiltroStatus,
  FiltroTipo,
} from "../types/alerta.types";

export type AlertasListParams = {
  status?: FiltroStatus;
  tipo?: FiltroTipo;
  severidade?: FiltroSeveridade;
  lido?: FiltroLido;
};

export type AlertaUpdatePayload = Partial<AlertaPayload>;

const ALERTAS_ENDPOINT = "/alertas/";

function getAlertaDetailEndpoint(alertaId: number): string {
  return `/alertas/${alertaId}/`;
}

function getMarcarLidoEndpoint(alertaId: number): string {
  return `/alertas/${alertaId}/marcar-lido/`;
}

function getResolverEndpoint(alertaId: number): string {
  return `/alertas/${alertaId}/resolver/`;
}

function getReativarEndpoint(alertaId: number): string {
  return `/alertas/${alertaId}/reativar/`;
}

export async function listarAlertas(
  params?: AlertasListParams,
): Promise<Alerta[]> {
  const response = await http.get<Alerta[]>(ALERTAS_ENDPOINT, {
    params: {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.tipo ? { tipo: params.tipo } : {}),
      ...(params?.severidade ? { severidade: params.severidade } : {}),
      ...(params?.lido ? { lido: params.lido } : {}),
    },
  });

  return response.data;
}

export async function buscarAlertaPorId(alertaId: number): Promise<Alerta> {
  const response = await http.get<Alerta>(getAlertaDetailEndpoint(alertaId));

  return response.data;
}

export async function atualizarAlerta(
  alertaId: number,
  payload: AlertaUpdatePayload,
): Promise<Alerta> {
  const response = await http.patch<Alerta>(
    getAlertaDetailEndpoint(alertaId),
    payload,
  );

  return response.data;
}

export async function marcarAlertaComoLido(
  alertaId: number,
): Promise<AlertaActionResponse> {
  const response = await http.post<AlertaActionResponse>(
    getMarcarLidoEndpoint(alertaId),
  );

  return response.data;
}

export async function resolverAlerta(
  alertaId: number,
): Promise<AlertaActionResponse> {
  const response = await http.post<AlertaActionResponse>(
    getResolverEndpoint(alertaId),
  );

  return response.data;
}

export async function reativarAlerta(
  alertaId: number,
): Promise<AlertaActionResponse> {
  const response = await http.post<AlertaActionResponse>(
    getReativarEndpoint(alertaId),
  );

  return response.data;
}

export async function arquivarAlerta(alertaId: number): Promise<Alerta> {
  return atualizarAlerta(alertaId, {
    ativa: false,
  });
}

export async function excluirAlerta(alertaId: number): Promise<number> {
  await http.delete(getAlertaDetailEndpoint(alertaId));

  return alertaId;
}