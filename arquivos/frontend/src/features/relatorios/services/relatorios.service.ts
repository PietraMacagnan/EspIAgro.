import http from "@/services/http";

import type {
  GerarCompletoResponse,
  GerarConteudoResponse,
  GerarPdfResponse,
  Relatorio,
  RelatorioStatus,
  RelatorioTipo,
} from "../types/relatorio.types";

export type RelatoriosListParams = {
  status?: RelatorioStatus | "";
  tipo?: RelatorioTipo | "";
};

export type RelatorioUpdatePayload = Partial<
  Pick<Relatorio, "ativa" | "titulo" | "resumo" | "observacoes" | "status" | "tipo">
>;

const RELATORIOS_ENDPOINT = "/relatorios/";

function getRelatorioDetailEndpoint(relatorioId: number): string {
  return `/relatorios/${relatorioId}/`;
}

function getGerarConteudoEndpoint(relatorioId: number): string {
  return `/relatorios/${relatorioId}/gerar-conteudo/`;
}

function getGerarPdfEndpoint(relatorioId: number): string {
  return `/relatorios/${relatorioId}/gerar-pdf/`;
}

function getGerarCompletoEndpoint(relatorioId: number): string {
  return `/relatorios/${relatorioId}/gerar-completo/`;
}

function resolveBackendFileUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const baseURL = http.defaults.baseURL;

  if (!baseURL) {
    return url;
  }

  try {
    const apiUrl = new URL(baseURL);
    const backendOrigin = apiUrl.origin;

    if (url.startsWith("/")) {
      return `${backendOrigin}${url}`;
    }

    return `${backendOrigin}/${url}`;
  } catch {
    return url;
  }
}

export async function listarRelatorios(
  params?: RelatoriosListParams,
): Promise<Relatorio[]> {
  const response = await http.get<Relatorio[]>(RELATORIOS_ENDPOINT, {
    params: {
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.tipo ? { tipo: params.tipo } : {}),
    },
  });

  return response.data;
}

export async function buscarRelatorioPorId(
  relatorioId: number,
): Promise<Relatorio> {
  const response = await http.get<Relatorio>(
    getRelatorioDetailEndpoint(relatorioId),
  );

  return response.data;
}

export async function atualizarRelatorio(
  relatorioId: number,
  payload: RelatorioUpdatePayload,
): Promise<Relatorio> {
  const response = await http.patch<Relatorio>(
    getRelatorioDetailEndpoint(relatorioId),
    payload,
  );

  return response.data;
}

export async function arquivarRelatorio(
  relatorioId: number,
): Promise<Relatorio> {
  return atualizarRelatorio(relatorioId, {
    ativa: false,
  });
}

export async function reativarRelatorio(
  relatorioId: number,
): Promise<Relatorio> {
  return atualizarRelatorio(relatorioId, {
    ativa: true,
  });
}

export async function excluirRelatorio(relatorioId: number): Promise<number> {
  await http.delete(getRelatorioDetailEndpoint(relatorioId));

  return relatorioId;
}

export async function gerarConteudoRelatorio(
  relatorioId: number,
): Promise<GerarConteudoResponse> {
  const response = await http.post<GerarConteudoResponse>(
    getGerarConteudoEndpoint(relatorioId),
    undefined,
    {
      timeout: 120000,
    },
  );

  return response.data;
}

export async function gerarPdfRelatorio(
  relatorioId: number,
): Promise<GerarPdfResponse> {
  const response = await http.post<GerarPdfResponse>(
    getGerarPdfEndpoint(relatorioId),
    undefined,
    {
      timeout: 120000,
    },
  );

  return response.data;
}

export async function gerarRelatorioCompleto(
  relatorioId: number,
): Promise<GerarCompletoResponse> {
  const response = await http.post<GerarCompletoResponse>(
    getGerarCompletoEndpoint(relatorioId),
    undefined,
    {
      timeout: 180000,
    },
  );

  return response.data;
}

export async function baixarArquivoPdf(pdfUrl: string): Promise<Blob> {
  const resolvedUrl = resolveBackendFileUrl(pdfUrl);

  const response = await http.get<Blob>(resolvedUrl, {
    responseType: "blob",
    timeout: 120000,
  });

  return response.data;
}