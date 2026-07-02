import { NavLink } from "react-router-dom";

import MonitoringDetailsSheet from "@/features/monitoramentos/components/MonitoringDetailsSheet/MonitoringDetailsSheet";
import MonitoringFilterBar from "@/features/monitoramentos/components/MonitoringFilterBar/MonitoringFilterBar";
import MonitoringFormSheet from "@/features/monitoramentos/components/MonitoringFormSheet/MonitoringFormSheet";
import MonitoringHero from "@/features/monitoramentos/components/MonitoringHero/MonitoringHero";
import MonitoringList from "@/features/monitoramentos/components/MonitoringList/MonitoringList";
import MonitoringSummaryCards from "@/features/monitoramentos/components/MonitoringSummaryCards/MonitoringSummaryCards";
import { useMonitoramentos } from "@/features/monitoramentos/hooks/useMonitoramentos";

import "./MonitoramentosPage.css";

export default function MonitoramentosPage() {
  const {
    statusFiltro,
    setStatusFiltro,
    formData,
    editingItem,
    selectedDetailItem,
    submitError,
    submitMessage,
    selectedFileName,
    previewUrl,
    mapInteractionEnabled,
    setMapInteractionEnabled,
    isGettingLocation,
    isFormSheetOpen,
    isDetailsSheetOpen,
    showUnsavedAlert,
    monitoramentosQuery,
    talhoesQuery,
    monitoramentos,
    talhoesAtivos,
    monitoramentosFiltrados,
    summaryCards,
    formTitle,
    formDescription,
    selectedTalhaoResumo,
    currentMapPoint,
    isSubmitting,
    updateField,
    resetForm,
    openCreateFormSheet,
    requestCloseFormSheet,
    confirmCloseFormSheet,
    keepFormSheetOpen,
    openDetailsSheet,
    closeDetailsSheet,
    fillForm,
    handleFileChange,
    handleMapPointSelect,
    handleUseCurrentLocation,
    handleSubmit,
    handleArchive,
    handleRestore,
    handleDelete,
  } = useMonitoramentos();

  const isLoading = monitoramentosQuery.isLoading;
  const isError = monitoramentosQuery.isError;
  const isFetching = monitoramentosQuery.isFetching;
  const isLoadingTalhoes = talhoesQuery.isLoading;

  return (
    <>
      <div className="espiagro-monitoramentos-page">
        <MonitoringHero
          monitoramentos={monitoramentos}
          onCreateMonitoring={openCreateFormSheet}
        />

        <section className="espiagro-filter-card">
          <div className="espiagro-filter-header">
            <div>
              <span className="espiagro-panel-kicker">Ações rápidas</span>
              <h3>Atualize os dados ou avance para os relatórios</h3>
              <p>
                Mantenha as coletas sincronizadas e use os relatórios para
                transformar os registros de campo em leitura técnica da lavoura.
              </p>
            </div>
          </div>

          <div className="espiagro-filter-actions">
            <NavLink
              to="/relatorios"
              className="espiagro-btn espiagro-btn-secondary"
            >
              Ver relatórios
            </NavLink>

            <button
              type="button"
              className="espiagro-btn espiagro-btn-ghost"
              onClick={() => {
                void monitoramentosQuery.refetch();
              }}
            >
              {isFetching ? "Atualizando..." : "Atualizar coletas"}
            </button>
          </div>
        </section>

        <MonitoringSummaryCards cards={summaryCards} />

        <MonitoringFilterBar
          statusFiltro={statusFiltro}
          totalResultados={monitoramentosFiltrados.length}
          totalGeral={monitoramentos.length}
          onStatusChange={setStatusFiltro}
          onCreateMonitoring={openCreateFormSheet}
        />

        {!isFormSheetOpen && !isDetailsSheetOpen && submitMessage ? (
          <div className="espiagro-feedback-message">{submitMessage}</div>
        ) : null}

        {!isFormSheetOpen && !isDetailsSheetOpen && submitError ? (
          <div className="espiagro-feedback-error">{submitError}</div>
        ) : null}

        {isLoading ? (
          <section className="espiagro-state-card">
            <h2>Buscando coletas de campo</h2>
            <p>Aguarde enquanto os registros da lavoura são carregados.</p>
          </section>
        ) : null}

        {isError ? (
          <section className="espiagro-state-card">
            <h2>As coletas não carregaram agora</h2>
            <p>Verifique sua conexão e tente novamente.</p>

            <div className="espiagro-state-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-retry"
                onClick={() => {
                  void monitoramentosQuery.refetch();
                }}
              >
                Tentar novamente
              </button>
            </div>
          </section>
        ) : null}

        {!isLoading && !isError ? (
          <MonitoringList
            monitoramentos={monitoramentosFiltrados}
            isSubmitting={isSubmitting}
            onCreateMonitoring={openCreateFormSheet}
            onOpenDetails={openDetailsSheet}
          />
        ) : null}
      </div>

      <MonitoringFormSheet
        isOpen={isFormSheetOpen}
        title={formTitle}
        description={formDescription}
        formData={formData}
        editingItem={editingItem}
        talhoesAtivos={talhoesAtivos}
        selectedTalhaoResumo={selectedTalhaoResumo}
        isLoadingTalhoes={isLoadingTalhoes}
        isSubmitting={isSubmitting}
        showUnsavedAlert={showUnsavedAlert}
        submitMessage={submitMessage}
        submitError={submitError}
        selectedFileName={selectedFileName}
        previewUrl={previewUrl}
        currentMapPoint={currentMapPoint}
        mapInteractionEnabled={mapInteractionEnabled}
        isGettingLocation={isGettingLocation}
        updateField={updateField}
        onRequestClose={requestCloseFormSheet}
        onKeepOpen={keepFormSheetOpen}
        onConfirmClose={confirmCloseFormSheet}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        onFileChange={handleFileChange}
        onEnableMapInteraction={() => setMapInteractionEnabled(true)}
        onDisableMapInteraction={() => setMapInteractionEnabled(false)}
        onUseCurrentLocation={handleUseCurrentLocation}
        onSelectMapPoint={handleMapPointSelect}
        onResetForm={resetForm}
      />

      <MonitoringDetailsSheet
        item={selectedDetailItem}
        isOpen={isDetailsSheetOpen}
        isSubmitting={isSubmitting}
        onClose={closeDetailsSheet}
        onEdit={fillForm}
        onArchive={(item) => {
          void handleArchive(item);
        }}
        onRestore={(item) => {
          void handleRestore(item);
        }}
        onDelete={(item) => {
          void handleDelete(item);
        }}
      />
    </>
  );
}