import { useState } from "react";

import AlertCard from "@/features/alertas/components/AlertCard";
import AlertDetailsSheet from "@/features/alertas/components/AlertDetailsSheet";
import AlertFilterSheet from "@/features/alertas/components/AlertFilterSheet";
import AlertPageHero from "@/features/alertas/components/AlertPageHero";
import AlertReviewSheet from "@/features/alertas/components/AlertReviewSheet";
import AlertSearchCard from "@/features/alertas/components/AlertSearchCard";
import AlertSummaryGrid from "@/features/alertas/components/AlertSummaryGrid";
import { useAlertaActions } from "@/features/alertas/hooks/useAlertaActions";
import { useAlertas } from "@/features/alertas/hooks/useAlertas";
import type {
  FiltroLido,
  FiltroSeveridade,
  FiltroStatus,
  FiltroTipo,
} from "@/features/alertas/types/alerta.types";

import "./AlertasPage.css";

export default function AlertasPage() {
  const {
    alertasFiltrados,
    selectedAlerta,
    summaryCards,
    ativosCount,
    criticosCount,
    naoLidosCount,
    hasActiveFilters,
    activeStructuredFilterCount,
    isLoading,
    isError,
    isFetching,
    filters,
    statusFiltro,
    tipoFiltro,
    severidadeFiltro,
    lidoFiltro,
    busca,
    setStatusFiltro,
    setTipoFiltro,
    setSeveridadeFiltro,
    setLidoFiltro,
    setBusca,
    selectedAlertaId,
    setSelectedAlertaId,
    openAlertaDetails,
    closeAlertaDetails,
    handleQuickFilter,
    handleClearFilters,
    refetchAlertas,
  } = useAlertas();

  const {
    editingItem,
    formData,
    actionMessage,
    actionError,
    isFormSheetOpen,
    isMutating,
    hasUnsavedFormData,
    formTitle,
    formDescription,
    closeFormSheet,
    fillForm,
    handleSubmit,
    handleMarcarLido,
    handleResolver,
    handleReativar,
    handleArquivar,
    handleExcluir,
    updateField,
  } = useAlertaActions({
    selectedAlertaId,
    setSelectedAlertaId,
  });

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [draftStatusFiltro, setDraftStatusFiltro] = useState<FiltroStatus>("");
  const [draftTipoFiltro, setDraftTipoFiltro] = useState<FiltroTipo>("");
  const [draftSeveridadeFiltro, setDraftSeveridadeFiltro] =
    useState<FiltroSeveridade>("");
  const [draftLidoFiltro, setDraftLidoFiltro] = useState<FiltroLido>("");

  function openFilterSheet(): void {
    setDraftStatusFiltro(statusFiltro);
    setDraftTipoFiltro(tipoFiltro);
    setDraftSeveridadeFiltro(severidadeFiltro);
    setDraftLidoFiltro(lidoFiltro);
    setIsFilterSheetOpen(true);
  }

  function closeFilterSheet(): void {
    setIsFilterSheetOpen(false);
  }

  function applyFilterSheet(): void {
    setStatusFiltro(draftStatusFiltro);
    setTipoFiltro(draftTipoFiltro);
    setSeveridadeFiltro(draftSeveridadeFiltro);
    setLidoFiltro(draftLidoFiltro);
    setIsFilterSheetOpen(false);
  }

  function clearFilterSheet(): void {
    handleClearFilters();
    setDraftStatusFiltro("");
    setDraftTipoFiltro("");
    setDraftSeveridadeFiltro("");
    setDraftLidoFiltro("");
    setIsFilterSheetOpen(false);
  }

  return (
    <>
      <div className="espiagro-alertas-page">
        <AlertPageHero
          isFetching={isFetching}
          totalFiltrado={alertasFiltrados.length}
          ativosCount={ativosCount}
          criticosCount={criticosCount}
          naoLidosCount={naoLidosCount}
          onRefresh={refetchAlertas}
        />

        <AlertSummaryGrid
          summaryCards={summaryCards}
          onQuickFilter={handleQuickFilter}
        />

        {!isFormSheetOpen && !selectedAlerta && (actionMessage || actionError) ? (
          <section>
            {actionMessage ? (
              <div className="espiagro-feedback-message">{actionMessage}</div>
            ) : null}

            {actionError ? (
              <div className="espiagro-feedback-error">{actionError}</div>
            ) : null}
          </section>
        ) : null}

        <AlertSearchCard
          busca={busca}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          activeStructuredFilterCount={activeStructuredFilterCount}
          onBuscaChange={setBusca}
          onOpenFilters={openFilterSheet}
          onClearFilters={handleClearFilters}
        />

        {isLoading ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">Atualizando</span>
            <h2>Buscando avisos da lavoura</h2>
            <p>Aguarde enquanto carregamos os avisos mais recentes.</p>
          </section>
        ) : null}

        {isError ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">
              Não foi possível atualizar
            </span>
            <h2>Não foi possível carregar os avisos</h2>
            <p>Verifique sua conexão com a internet e tente novamente.</p>

            <div className="espiagro-state-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-retry"
                onClick={refetchAlertas}
              >
                Tentar novamente
              </button>
            </div>
          </section>
        ) : null}

        {!isLoading && !isError ? (
          <>
            {alertasFiltrados.length === 0 ? (
              <section className="espiagro-empty-card">
                <span className="espiagro-panel-kicker">
                  Nenhum aviso encontrado
                </span>
                <p>
                  Não encontramos avisos com os filtros selecionados. Ajuste a
                  busca ou limpe os filtros.
                </p>
              </section>
            ) : (
              <section className="espiagro-alert-list">
                {alertasFiltrados.map((alerta) => (
                  <AlertCard
                    key={alerta.id}
                    alerta={alerta}
                    onOpenDetails={openAlertaDetails}
                  />
                ))}
              </section>
            )}
          </>
        ) : null}
      </div>

      <AlertFilterSheet
        isOpen={isFilterSheetOpen}
        draftStatusFiltro={draftStatusFiltro}
        draftTipoFiltro={draftTipoFiltro}
        draftSeveridadeFiltro={draftSeveridadeFiltro}
        draftLidoFiltro={draftLidoFiltro}
        onStatusChange={setDraftStatusFiltro}
        onTipoChange={setDraftTipoFiltro}
        onSeveridadeChange={setDraftSeveridadeFiltro}
        onLidoChange={setDraftLidoFiltro}
        onApply={applyFilterSheet}
        onClear={clearFilterSheet}
        onClose={closeFilterSheet}
      />

      <AlertDetailsSheet
        alerta={selectedAlerta}
        isMutating={isMutating}
        onClose={closeAlertaDetails}
        onEdit={fillForm}
        onMarkAsRead={(alertaId) => {
          void handleMarcarLido(alertaId);
        }}
        onResolve={(alertaId) => {
          void handleResolver(alertaId);
        }}
        onReactivate={(alertaId) => {
          void handleReativar(alertaId);
        }}
        onArchive={(alertaId) => {
          void handleArquivar(alertaId);
        }}
        onDelete={(alertaId) => {
          void handleExcluir(alertaId);
        }}
      />

      <AlertReviewSheet
        isOpen={isFormSheetOpen}
        editingItem={editingItem}
        formData={formData}
        formTitle={formTitle}
        formDescription={formDescription}
        actionMessage={actionMessage}
        actionError={actionError}
        isMutating={isMutating}
        hasUnsavedFormData={hasUnsavedFormData}
        onClose={closeFormSheet}
        onSubmit={handleSubmit}
        onUpdateField={updateField}
      />
    </>
  );
}