import { useMemo, useState } from "react";

import GenerationProgressStack from "@/features/relatorios/components/GenerationProgressStack";
import ReportCard from "@/features/relatorios/components/ReportCard";
import ReportDetailsSheet from "@/features/relatorios/components/ReportDetailsSheet";
import ReportFilterSheet from "@/features/relatorios/components/ReportFilterSheet/ReportFilterSheet";
import ReportPageHero from "@/features/relatorios/components/ReportPageHero";
import ReportSearchBar from "@/features/relatorios/components/ReportSearchBar/ReportSearchBar";
import ReportSummaryGrid from "@/features/relatorios/components/ReportSummaryGrid";
import { useReportActions } from "@/features/relatorios/hooks/useReportActions";
import { useRelatorios } from "@/features/relatorios/hooks/useRelatorios";
import type {
  FiltroStatus,
  FiltroTipo,
  Relatorio,
} from "@/features/relatorios/types/relatorio.types";

import "./RelatoriosPage.css";

export default function RelatoriosPage() {
  const {
    relatorios,
    relatoriosFiltrados,
    selectedRelatorio: selectedRelatorioFromQuery,
    summaryCards,
    processingCount,
    hasActiveFilters,
    activeStructuredFilterCount,
    isLoading,
    isError,
    isFetching,
    filters,
    setStatusFiltro,
    setTipoFiltro,
    setBusca,
    selectedRelatorioId,
    setSelectedRelatorioId,
    openRelatorioDetails,
    closeRelatorioDetails,
    handleQuickFilter,
    handleClearFilters,
    refetchRelatorios,
  } = useRelatorios();

  const {
    tasks,
    isGenerationRunning,
    isRecordActionRunning,
    feedbackMessage,
    feedbackError,
    dismissGenerationTask,
    getRelatorioFromTask,
    handleGerarCompleto,
    handleGerarConteudo,
    handleGerarPdf,
    handleGerarPdfPorId,
    handleBaixarPdf,
    handleArchive,
    handleReactivate,
    handleDelete,
  } = useReportActions({
    relatorios,
    selectedRelatorioId,
    setSelectedRelatorioId,
  });

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [draftStatusFiltro, setDraftStatusFiltro] = useState<FiltroStatus>("");
  const [draftTipoFiltro, setDraftTipoFiltro] = useState<FiltroTipo>("");

  const selectedRelatorio = useMemo<Relatorio | null>(() => {
    if (!selectedRelatorioId) {
      return null;
    }

    return getRelatorioFromTask(selectedRelatorioId) ?? selectedRelatorioFromQuery;
  }, [getRelatorioFromTask, selectedRelatorioFromQuery, selectedRelatorioId]);

  function openFilterSheet(): void {
    setDraftStatusFiltro(filters.status);
    setDraftTipoFiltro(filters.tipo);
    setIsFilterSheetOpen(true);
  }

  function closeFilterSheet(): void {
    setIsFilterSheetOpen(false);
  }

  function applyFilterSheet(): void {
    setStatusFiltro(draftStatusFiltro);
    setTipoFiltro(draftTipoFiltro);
    setIsFilterSheetOpen(false);
  }

  function handleClearFiltersFromMain(): void {
    handleClearFilters();
    setDraftStatusFiltro("");
    setDraftTipoFiltro("");
  }

  function handleClearFiltersFromSheet(): void {
    handleClearFiltersFromMain();
    setIsFilterSheetOpen(false);
  }

  return (
    <>
      <div className="espiagro-relatorios-page">
        <ReportPageHero
          isFetching={isFetching}
          relatoriosCount={relatoriosFiltrados.length}
          processingCount={processingCount}
          onRefresh={refetchRelatorios}
        />

        <ReportSummaryGrid
          cards={summaryCards}
          onQuickFilter={handleQuickFilter}
        />

        <GenerationProgressStack
          tasks={tasks}
          relatorios={relatorios}
          isGenerationRunning={isGenerationRunning}
          onDismissTask={dismissGenerationTask}
          onGeneratePdfById={handleGerarPdfPorId}
          onDownloadPdf={(relatorio) => {
            void handleBaixarPdf(relatorio);
          }}
        />

        {feedbackMessage || feedbackError ? (
          <section>
            {feedbackMessage ? (
              <div className="espiagro-feedback-message">{feedbackMessage}</div>
            ) : null}

            {feedbackError ? (
              <div className="espiagro-feedback-error">{feedbackError}</div>
            ) : null}
          </section>
        ) : null}

        <ReportSearchBar
          busca={filters.busca}
          statusFiltro={filters.status}
          tipoFiltro={filters.tipo}
          hasActiveFilters={hasActiveFilters}
          activeStructuredFilterCount={activeStructuredFilterCount}
          onBuscaChange={setBusca}
          onOpenFilters={openFilterSheet}
          onClearFilters={handleClearFiltersFromMain}
        />

        {isLoading ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">Carregando</span>
            <h2>Buscando relatórios</h2>
            <p>Buscando as informações mais recentes.</p>
          </section>
        ) : null}

        {isError ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">Relatórios indisponíveis</span>
            <h2>Não foi possível carregar os relatórios</h2>
            <p>Verifique sua conexão e tente novamente em alguns instantes.</p>

            <div className="espiagro-state-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-retry"
                onClick={refetchRelatorios}
              >
                Tentar novamente
              </button>
            </div>
          </section>
        ) : null}

        {!isLoading && !isError ? (
          <>
            {relatoriosFiltrados.length === 0 ? (
              <section className="espiagro-empty-card">
                <span className="espiagro-panel-kicker">Sem resultados</span>
                <p>Nenhum relatório foi encontrado com os filtros atuais.</p>
              </section>
            ) : (
              <section className="espiagro-report-list">
                {relatoriosFiltrados.map((relatorio) => (
                  <ReportCard
                    key={relatorio.id}
                    relatorio={relatorio}
                    onOpenDetails={openRelatorioDetails}
                  />
                ))}
              </section>
            )}
          </>
        ) : null}
      </div>

      <ReportFilterSheet
        isOpen={isFilterSheetOpen}
        statusFiltro={draftStatusFiltro}
        tipoFiltro={draftTipoFiltro}
        onStatusChange={setDraftStatusFiltro}
        onTipoChange={setDraftTipoFiltro}
        onApply={applyFilterSheet}
        onClear={handleClearFiltersFromSheet}
        onClose={closeFilterSheet}
      />

      <ReportDetailsSheet
        relatorio={selectedRelatorio}
        isGenerationRunning={isGenerationRunning}
        isRecordActionRunning={isRecordActionRunning}
        onClose={closeRelatorioDetails}
        onGenerateComplete={handleGerarCompleto}
        onGenerateContent={handleGerarConteudo}
        onGeneratePdf={handleGerarPdf}
        onDownloadPdf={(relatorio) => {
          void handleBaixarPdf(relatorio);
        }}
        onArchive={(relatorioId) => {
          void handleArchive(relatorioId);
        }}
        onReactivate={(relatorioId) => {
          void handleReactivate(relatorioId);
        }}
        onDelete={(relatorioId) => {
          void handleDelete(relatorioId);
        }}
      />
    </>
  );
}