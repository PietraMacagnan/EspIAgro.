import http from "@/services/http";

import type {
  Monitoramento,
  TalhaoOption,
} from "../types/monitoramento.types";

const MONITORAMENTOS_ENDPOINT = "/monitoramentos/";
const TALHOES_ENDPOINT = "/talhoes/";

const MULTIPART_HEADERS = {
  headers: {
    "Content-Type": "multipart/form-data",
  },
};

export async function listarMonitoramentos(): Promise<Monitoramento[]> {
  const response = await http.get<Monitoramento[]>(MONITORAMENTOS_ENDPOINT);
  return response.data;
}

export async function listarTalhoesParaMonitoramentos(): Promise<
  TalhaoOption[]
> {
  const response = await http.get<TalhaoOption[]>(TALHOES_ENDPOINT);
  return response.data;
}

export async function criarMonitoramento(
  payload: FormData,
): Promise<Monitoramento> {
  const response = await http.post<Monitoramento>(
    MONITORAMENTOS_ENDPOINT,
    payload,
    MULTIPART_HEADERS,
  );

  return response.data;
}

export async function atualizarMonitoramento(
  monitoramentoId: number,
  payload: FormData,
): Promise<Monitoramento> {
  const response = await http.put<Monitoramento>(
    `${MONITORAMENTOS_ENDPOINT}${monitoramentoId}/`,
    payload,
    MULTIPART_HEADERS,
  );

  return response.data;
}

export async function arquivarMonitoramento(
  monitoramentoId: number,
): Promise<Monitoramento> {
  const response = await http.patch<Monitoramento>(
    `${MONITORAMENTOS_ENDPOINT}${monitoramentoId}/`,
    {
      ativa: false,
    },
  );

  return response.data;
}

export async function reativarMonitoramento(
  monitoramentoId: number,
): Promise<Monitoramento> {
  const response = await http.patch<Monitoramento>(
    `${MONITORAMENTOS_ENDPOINT}${monitoramentoId}/`,
    {
      ativa: true,
    },
  );

  return response.data;
}

export async function excluirMonitoramento(
  monitoramentoId: number,
): Promise<void> {
  await http.delete(`${MONITORAMENTOS_ENDPOINT}${monitoramentoId}/`);
}