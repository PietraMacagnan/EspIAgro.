import PhenologyBadge from "@/components/phenology/PhenologyBadge";

import ReportRiskExplanation from "@/features/relatorios/components/ReportRiskExplanation/ReportRiskExplanation";
import type {
  GenerationTaskType,
  Relatorio,
} from "@/features/relatorios/types/relatorio.types";
import {
  formatConfidence,
  formatDateTime,
  getIdentificationBadgeClass,
  getIdentificationLabel,
  getIaExplanation,
  getPdfExplanation,
  getPhenologyCode,
  getPhenologyDisplayDescription,
  getPhenologyLabel,
  getPhenologyUserGuidance,
  getRecordStatusExplanation,
  getReportDisplayTitle,
  getReportImageUrl,
  getStatusBadgeClass,
  getStatusExplanation,
  getTypeExplanation,
  isPdfAvailable,
} from "@/features/relatorios/utils/relatorio.helpers";

type ReportDetailsSheetProps = {
  relatorio: Relatorio | null;
  isGenerationRunning: (
    relatorioId: number,
    type: GenerationTaskType,
  ) => boolean;
  isRecordActionRunning: boolean;
  onClose: () => void;
  onGenerateComplete: (relatorio: Relatorio) => void;
  onGenerateContent: (relatorio: Relatorio) => void;
  onGeneratePdf: (relatorio: Relatorio) => void;
  onDownloadPdf: (relatorio: Relatorio) => void;
  onArchive: (relatorioId: number) => void;
  onReactivate: (relatorioId: number) => void;
  onDelete: (relatorioId: number) => void;
};

export default function ReportDetailsSheet({
  relatorio,
  isGenerationRunning,
  isRecordActionRunning,
  onClose,
  onGenerateComplete,
  onGenerateContent,
  onGeneratePdf,
  onDownloadPdf,
  onArchive,
  onReactivate,
  onDelete,
}: ReportDetailsSheetProps) {
  if (!relatorio) {
    return null;
  }

  const apoioDiagnostico = relatorio.conteudo_json?.apoio_diagnostico;
  const riscoMonitoramento = relatorio.conteudo_json?.risco_monitoramento;
  const imagemMonitoramento = relatorio.conteudo_json?.imagem_monitoramento;
  const clima = relatorio.conteudo_json?.clima;
  const identificacaoFenologica =
    relatorio.conteudo_json?.identificacao_fenologica;

  const estadioFenologicoLabel = getPhenologyLabel(identificacaoFenologica);
  const estadioFenologicoCode = getPhenologyCode(identificacaoFenologica);
  const estadioFenologicoDescricao = getPhenologyDisplayDescription(
    identificacaoFenologica,
  );
  const estadioFenologicoOrientacao = getPhenologyUserGuidance(
    identificacaoFenologica,
  );

  const fontesUtilizadas = apoioDiagnostico?.ui?.fontes_utilizadas || [];
  const referencias = relatorio.referencias_tecnicas_detalhes || [];
  const imageUrl = getReportImageUrl(relatorio);
  const hasRiskExplanation = Boolean(riscoMonitoramento || apoioDiagnostico);

  const isGeneratingComplete = isGenerationRunning(relatorio.id, "completo");
  const isGeneratingContent = isGenerationRunning(relatorio.id, "conteudo");
  const isGeneratingPdf = isGenerationRunning(relatorio.id, "pdf");

  return (
    <section
      className="espiagro-report-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="espiagro-report-sheet-title"
      aria-describedby="espiagro-report-sheet-description"
      onClick={onClose}
    >
      <div
        className="espiagro-report-sheet"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="espiagro-report-sheet-handle" aria-hidden="true" />

        <header className="espiagro-report-sheet-header">
          <div>
            <span className="espiagro-panel-kicker">Relatório selecionado</span>

            <h2 id="espiagro-report-sheet-title">
              {getReportDisplayTitle(relatorio)}
            </h2>

            <p id="espiagro-report-sheet-description">
              {relatorio.talhao_nome || "Talhão não informado"}
              {relatorio.propriedade_nome
                ? ` • ${relatorio.propriedade_nome}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            className="espiagro-report-sheet-close"
            onClick={onClose}
            aria-label="Fechar detalhes do relatório"
          >
            ×
          </button>
        </header>

        <div className="espiagro-report-sheet-scroll">
          {estadioFenologicoCode ? (
            <PhenologyBadge
              code={estadioFenologicoCode}
              label={estadioFenologicoLabel}
              variant="card"
              showSupportText
            />
          ) : (
            <div className="espiagro-note-box">
              <strong>Identificação fenológica pendente</strong>
              <p>{estadioFenologicoDescricao}</p>
              <p>{estadioFenologicoOrientacao}</p>
            </div>
          )}

          {hasRiskExplanation ? (
            <ReportRiskExplanation
              riscoMonitoramento={riscoMonitoramento}
              apoioDiagnostico={apoioDiagnostico}
              referencias={referencias}
            />
          ) : null}

          <div className="espiagro-status-grid">
            <div className="espiagro-status-box">
              <span className="espiagro-status-label">Status do relatório</span>
              <span
                className={`espiagro-badge ${getStatusBadgeClass(
                  relatorio.status,
                )}`}
              >
                {relatorio.status_display || relatorio.status || "Sem status"}
              </span>
              <p>{getStatusExplanation(relatorio.status)}</p>
            </div>

            <div className="espiagro-status-box">
              <span className="espiagro-status-label">Tipo de relatório</span>
              <span className="espiagro-badge espiagro-badge-blue">
                {relatorio.tipo_display || relatorio.tipo || "Sem tipo"}
              </span>
              <p>{getTypeExplanation(relatorio.tipo)}</p>
            </div>

            <div className="espiagro-status-box">
              <span className="espiagro-status-label">Análise por IA</span>
              <span
                className={`espiagro-badge ${getIdentificationBadgeClass(
                  identificacaoFenologica?.status_identificacao,
                )}`}
              >
                {getIdentificationLabel(
                  identificacaoFenologica?.status_identificacao,
                )}
              </span>
              <p>{getIaExplanation(identificacaoFenologica?.status_identificacao)}</p>
            </div>

            <div className="espiagro-status-box">
              <span className="espiagro-status-label">PDF</span>
              <span
                className={`espiagro-badge ${
                  isPdfAvailable(relatorio)
                    ? "espiagro-badge-green"
                    : "espiagro-badge-amber"
                }`}
              >
                {isPdfAvailable(relatorio) ? "Disponível" : "Pendente"}
              </span>
              <p>{getPdfExplanation(relatorio)}</p>
            </div>

            <div className="espiagro-status-box">
              <span className="espiagro-status-label">Situação do registro</span>
              <span
                className={`espiagro-badge ${
                  relatorio.ativa === false
                    ? "espiagro-badge-red"
                    : "espiagro-badge-green"
                }`}
              >
                {relatorio.ativa === false ? "Arquivado" : "Ativo"}
              </span>
              <p>{getRecordStatusExplanation(relatorio.ativa)}</p>
            </div>
          </div>

          <div className="espiagro-detail-grid">
            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Registro do usuário</span>
              <span className="espiagro-detail-value">
                {identificacaoFenologica?.estadio_informado_display ||
                  "Não registrado pelo usuário"}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">
                Leitura estimada da imagem
              </span>
              <span className="espiagro-detail-value">
                {identificacaoFenologica?.estadio_sugerido_ia ||
                  identificacaoFenologica?.estadio_considerado_relatorio ||
                  "Aguardando análise"}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">
                Nível de segurança da análise
              </span>
              <span className="espiagro-detail-value">
                {identificacaoFenologica?.confianca_ia != null
                  ? formatConfidence(identificacaoFenologica.confianca_ia)
                  : "Aguardando dados"}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Gerado em</span>
              <span className="espiagro-detail-value">
                {formatDateTime(relatorio.gerado_em || relatorio.created_at)}
              </span>
            </div>
          </div>

          {imageUrl || imagemMonitoramento ? (
            <div className="espiagro-report-image-card">
              <div>
                <strong>Imagem da lavoura</strong>
                <p>
                  {imagemMonitoramento?.status_imagem_ia_display ||
                    (imagemMonitoramento?.possui_foto
                      ? "Imagem disponível para apoiar a leitura."
                      : "Sem imagem registrada.")}
                </p>
              </div>

              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Imagem da lavoura vinculada ao relatório"
                />
              ) : null}
            </div>
          ) : null}

          {apoioDiagnostico?.ui?.mensagem_status ? (
            <div className="espiagro-note-box">
              <strong>Status técnico</strong>
              <p>{apoioDiagnostico.ui.mensagem_status}</p>
            </div>
          ) : null}

          {identificacaoFenologica?.mensagem_status ? (
            <div className="espiagro-note-box">
              <strong>Fase da cultura</strong>
              <p>{identificacaoFenologica.mensagem_status}</p>
            </div>
          ) : null}

          {apoioDiagnostico?.ui?.resumo_principal ||
          apoioDiagnostico?.resumo_tecnico ||
          relatorio.resumo ? (
            <div className="espiagro-note-box">
              <strong>Resumo principal</strong>
              <p>
                {apoioDiagnostico?.ui?.resumo_principal ||
                  apoioDiagnostico?.resumo_tecnico ||
                  relatorio.resumo}
              </p>
            </div>
          ) : null}

          {apoioDiagnostico?.ui?.limitacoes ? (
            <div className="espiagro-note-box">
              <strong>Limitações</strong>
              <p>{apoioDiagnostico.ui.limitacoes}</p>
            </div>
          ) : null}

          {clima?.dados ? (
            <div className="espiagro-note-box">
              <strong>Condição climática</strong>
              <p>
                Temperatura: {clima.dados.temperatura ?? "-"}°C • Umidade:{" "}
                {clima.dados.umidade ?? "-"}% • Condição:{" "}
                {clima.dados.descricao || "-"}
              </p>
            </div>
          ) : null}

          <div className="espiagro-detail-grid">
            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Propriedade</span>
              <span className="espiagro-detail-value">
                {relatorio.propriedade_nome || "-"}
              </span>
            </div>

            <div className="espiagro-detail-box">
              <span className="espiagro-detail-label">Talhão</span>
              <span className="espiagro-detail-value">
                {relatorio.talhao_nome || "-"}
              </span>
            </div>
          </div>

          {referencias.length > 0 ? (
            <div className="espiagro-note-box">
              <strong>Fontes técnicas utilizadas</strong>

              <div className="espiagro-reference-list">
                {referencias.map((referencia, index) => (
                  <article
                    key={`${relatorio.id}-referencia-${
                      referencia.id ?? index
                    }`}
                    className="espiagro-reference-card"
                  >
                    <strong>{referencia.titulo || `Fonte ${index + 1}`}</strong>

                    <p>
                      {referencia.instituicao || "Instituição não informada"}
                      {referencia.ano_publicacao
                        ? ` • ${referencia.ano_publicacao}`
                        : ""}
                    </p>

                    <small>
                      {referencia.categoria_display ||
                        referencia.categoria ||
                        "Categoria não informada"}
                      {" • "}
                      {referencia.status_indexacao_display ||
                        referencia.status_indexacao ||
                        "Situação não informada"}
                    </small>
                  </article>
                ))}
              </div>
            </div>
          ) : fontesUtilizadas.length > 0 ? (
            <div className="espiagro-note-box">
              <strong>Fontes técnicas utilizadas</strong>
              <ul>
                {fontesUtilizadas.map((fonte, index) => (
                  <li key={`${relatorio.id}-fonte-${index}`}>{fonte}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {relatorio.observacoes ? (
            <div className="espiagro-note-box">
              <strong>Observações</strong>
              <p>{relatorio.observacoes}</p>
            </div>
          ) : null}
        </div>

        <footer className="espiagro-report-sheet-footer">
          <div className="espiagro-report-sheet-action-panel">
            <strong>Ações do relatório</strong>
            <p>
              Gere o relatório completo, atualize apenas a análise ou exporte o
              PDF quando precisar.
            </p>

            <div className="espiagro-report-sheet-action-grid">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-primary"
                onClick={() => onGenerateComplete(relatorio)}
                disabled={isGeneratingComplete}
              >
                {isGeneratingComplete
                  ? "Gerando completo..."
                  : "Gerar relatório completo"}
              </button>

              <button
                type="button"
                className="espiagro-btn espiagro-btn-warning"
                onClick={() => onGenerateContent(relatorio)}
                disabled={isGeneratingContent}
              >
                {isGeneratingContent ? "Gerando análise..." : "Atualizar análise"}
              </button>

              <button
                type="button"
                className="espiagro-btn espiagro-btn-info"
                onClick={() => onGeneratePdf(relatorio)}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? "Gerando PDF..." : "Gerar PDF"}
              </button>

              {isPdfAvailable(relatorio) ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-primary"
                  onClick={() => onDownloadPdf(relatorio)}
                  disabled={isRecordActionRunning}
                >
                  Baixar PDF
                </button>
              ) : null}

              {relatorio.ativa === false ? (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={() => onReactivate(relatorio.id)}
                  disabled={isRecordActionRunning}
                >
                  Reativar relatório
                </button>
              ) : (
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={() => onArchive(relatorio.id)}
                  disabled={isRecordActionRunning}
                >
                  Arquivar relatório
                </button>
              )}

              <button
                type="button"
                className="espiagro-btn espiagro-btn-danger"
                onClick={() => onDelete(relatorio.id)}
                disabled={isRecordActionRunning}
              >
                Excluir relatório
              </button>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}