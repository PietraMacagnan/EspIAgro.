import type { ChangeEvent, FormEvent } from "react";

import { ESTADIOS_FENOLOGICOS } from "../../constants/monitoramento.constants";
import type {
  MapPoint,
  Monitoramento,
  MonitoramentoPayload,
  TalhaoOption,
} from "../../types/monitoramento.types";
import MonitoringMapPicker from "../MonitoringMapPicker/MonitoringMapPicker";

type UpdateMonitoramentoField = <K extends keyof MonitoramentoPayload>(
  field: K,
  value: MonitoramentoPayload[K],
) => void;

type MonitoringFormSheetProps = {
  isOpen: boolean;
  title: string;
  description: string;
  formData: MonitoramentoPayload;
  editingItem: Monitoramento | null;
  talhoesAtivos: TalhaoOption[];
  selectedTalhaoResumo: TalhaoOption | null;
  isLoadingTalhoes: boolean;
  isSubmitting: boolean;
  showUnsavedAlert: boolean;
  submitMessage: string;
  submitError: string;
  selectedFileName: string;
  previewUrl: string | null;
  currentMapPoint: MapPoint;
  mapInteractionEnabled: boolean;
  isGettingLocation: boolean;
  updateField: UpdateMonitoramentoField;
  onRequestClose: () => void;
  onKeepOpen: () => void;
  onConfirmClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEnableMapInteraction: () => void;
  onDisableMapInteraction: () => void;
  onUseCurrentLocation: () => void;
  onSelectMapPoint: (point: MapPoint) => void;
  onResetForm: () => void;
};

export default function MonitoringFormSheet({
  isOpen,
  title,
  description,
  formData,
  editingItem,
  talhoesAtivos,
  selectedTalhaoResumo,
  isLoadingTalhoes,
  isSubmitting,
  showUnsavedAlert,
  submitMessage,
  submitError,
  selectedFileName,
  previewUrl,
  currentMapPoint,
  mapInteractionEnabled,
  isGettingLocation,
  updateField,
  onRequestClose,
  onKeepOpen,
  onConfirmClose,
  onSubmit,
  onFileChange,
  onEnableMapInteraction,
  onDisableMapInteraction,
  onUseCurrentLocation,
  onSelectMapPoint,
  onResetForm,
}: MonitoringFormSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="espiagro-form-sheet-overlay"
      role="presentation"
      onClick={onRequestClose}
    >
      <section
        className="espiagro-form-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitoramento-form-title"
        aria-describedby="monitoramento-form-description"
        onClick={(event) => event.stopPropagation()}
      >
        <section className="espiagro-form-card">
          <div className="espiagro-form-header">
            <div>
              <span className="espiagro-panel-kicker">
                {editingItem ? "Atualizar coleta" : "Nova coleta de campo"}
              </span>

              <h3 id="monitoramento-form-title">{title}</h3>

              <p id="monitoramento-form-description">{description}</p>
            </div>

            <button
              type="button"
              className="espiagro-form-sheet-close"
              onClick={onRequestClose}
              aria-label="Fechar formulário de coleta"
              disabled={isSubmitting}
            >
              ×
            </button>
          </div>

          <div className="espiagro-form-intro-card">
            <strong>Registre apenas dados observados ou medidos</strong>
            <p>
              As informações deste formulário alimentam alertas, diagnósticos e
              relatórios. Quando um dado não tiver sido medido ou estimado com
              segurança, deixe o campo em branco e use as anotações para
              explicar a situação.
            </p>
          </div>

          {showUnsavedAlert ? (
            <div className="espiagro-unsaved-alert">
              <strong>Existem informações não salvas</strong>
              <span>
                Ao fechar agora, os dados preenchidos nesta coleta serão
                perdidos.
              </span>

              <div className="espiagro-unsaved-actions">
                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-ghost"
                  onClick={onKeepOpen}
                >
                  Continuar preenchendo
                </button>

                <button
                  type="button"
                  className="espiagro-btn espiagro-btn-danger"
                  onClick={onConfirmClose}
                >
                  Fechar sem salvar
                </button>
              </div>
            </div>
          ) : null}

          <form onSubmit={(event) => onSubmit(event)}>
            <div className="espiagro-form-section">
              <div className="espiagro-form-section-header">
                <strong>Identificação da coleta</strong>
                <p>
                  Informe onde e quando a observação foi feita. Esses dados são
                  essenciais para relacionar a coleta ao talhão correto.
                </p>
              </div>

              <div className="espiagro-form-grid">
                <div className="espiagro-field">
                  <label htmlFor="talhao">Talhão observado</label>
                  <select
                    id="talhao"
                    value={formData.talhao}
                    onChange={(event) =>
                      updateField("talhao", event.target.value)
                    }
                    disabled={isLoadingTalhoes}
                  >
                    <option value="">
                      {isLoadingTalhoes
                        ? "Carregando talhões..."
                        : "Selecione o talhão da coleta"}
                    </option>

                    {talhoesAtivos.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome || `Talhão #${item.id}`}
                        {item.propriedade_nome
                          ? ` • ${item.propriedade_nome}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <small>
                    A coleta será vinculada a este talhão nos alertas, mapas e
                    relatórios.
                  </small>
                </div>

                <div className="espiagro-field">
                  <label htmlFor="data_observacao">Data da observação</label>
                  <input
                    id="data_observacao"
                    type="date"
                    value={formData.data_observacao}
                    onChange={(event) =>
                      updateField("data_observacao", event.target.value)
                    }
                  />
                  <small>
                    Use a data em que a lavoura foi realmente observada.
                  </small>
                </div>

                <div className="espiagro-field">
                  <label htmlFor="estadio_fenologico">
                    Fase da cultura do milho
                  </label>
                  <select
                    id="estadio_fenologico"
                    value={formData.estadio_fenologico}
                    onChange={(event) =>
                      updateField("estadio_fenologico", event.target.value)
                    }
                  >
                    <option value="">Selecione a fase observada</option>
                    {ESTADIOS_FENOLOGICOS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <small>
                    A fase da cultura muda a interpretação dos sintomas, do
                    risco e das recomendações.
                  </small>
                </div>
              </div>
            </div>

            <div className="espiagro-form-section">
              <div className="espiagro-form-section-header">
                <strong>Leitura visual e medições de campo</strong>
                <p>
                  Estes dados devem vir da sua observação, medição, contagem,
                  amostragem ou estimativa feita em campo. O aplicativo não
                  inventa esses valores.
                </p>
              </div>

              <div className="espiagro-form-grid">
                <div className="espiagro-field">
                  <label htmlFor="sanidade">
                    Condição visual da lavoura
                  </label>
                  <input
                    id="sanidade"
                    type="text"
                    value={formData.sanidade}
                    onChange={(event) =>
                      updateField("sanidade", event.target.value)
                    }
                    placeholder="Ex.: boa, manchas nas folhas, presença de pragas"
                  />
                  <small>
                    Descreva o que foi visto: vigor, manchas, pragas, doenças,
                    estresse hídrico ou outra alteração.
                  </small>
                </div>

                <div className="espiagro-field">
                  <label htmlFor="altura_planta_cm">
                    Altura da planta (cm)
                  </label>
                  <input
                    id="altura_planta_cm"
                    type="text"
                    inputMode="decimal"
                    value={formData.altura_planta_cm}
                    onChange={(event) =>
                      updateField("altura_planta_cm", event.target.value)
                    }
                    placeholder="Ex.: 120"
                  />
                  <small>
                    Informe somente se houve medição ou estimativa confiável em
                    campo.
                  </small>
                </div>

                <div className="espiagro-field">
                  <label htmlFor="populacao_plantas">
                    População de plantas
                  </label>
                  <input
                    id="populacao_plantas"
                    type="text"
                    inputMode="numeric"
                    value={formData.populacao_plantas}
                    onChange={(event) =>
                      updateField("populacao_plantas", event.target.value)
                    }
                    placeholder="Ex.: 58000"
                  />
                  <small>
                    Dado informado pelo usuário. Preencha apenas quando houver
                    contagem, amostragem ou estimativa feita no talhão.
                  </small>
                </div>

                <div className="espiagro-field">
                  <label htmlFor="umidade_solo">
                    Umidade do solo (%)
                  </label>
                  <input
                    id="umidade_solo"
                    type="text"
                    inputMode="decimal"
                    value={formData.umidade_solo}
                    onChange={(event) =>
                      updateField("umidade_solo", event.target.value)
                    }
                    placeholder="Ex.: 24,5"
                  />
                  <small>
                    Informe quando houver leitura, medição ou estimativa
                    confiável. Se vier de sensor ou equipamento, registre a
                    origem nas anotações.
                  </small>
                </div>
              </div>
            </div>

            <div className="espiagro-form-section">
              <div className="espiagro-form-section-header">
                <strong>Imagem e localização</strong>
                <p>
                  Foto e ponto no mapa aumentam a qualidade da leitura visual,
                  dos relatórios e do histórico da lavoura.
                </p>
              </div>

              <div className="espiagro-form-grid">
                <div className="espiagro-field espiagro-field-full">
                  <label htmlFor="foto_monitoramento">
                    Foto da lavoura
                  </label>
                  <input
                    id="foto_monitoramento"
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                  />
                  <small>
                    Use uma foto nítida da área observada. Ela ajuda a comparar
                    a evolução da lavoura e melhora a análise visual.
                  </small>

                  {selectedFileName ? (
                    <div className="espiagro-file-box">
                      Arquivo selecionado: <strong>{selectedFileName}</strong>
                    </div>
                  ) : null}

                  {previewUrl ? (
                    <div className="espiagro-preview-box">
                      <strong>Pré-visualização</strong>
                      <img
                        src={previewUrl}
                        alt="Pré-visualização da imagem da lavoura"
                        className="espiagro-preview-image"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="espiagro-field">
                  <label htmlFor="latitude">Latitude</label>
                  <input
                    id="latitude"
                    type="text"
                    inputMode="decimal"
                    value={formData.latitude}
                    onChange={(event) =>
                      updateField("latitude", event.target.value)
                    }
                    placeholder="Ex.: -16.470000"
                  />
                  <small>
                    Pode ser preenchida automaticamente pelo botão de
                    localização ou escolhida no mapa.
                  </small>
                </div>

                <div className="espiagro-field">
                  <label htmlFor="longitude">Longitude</label>
                  <input
                    id="longitude"
                    type="text"
                    inputMode="decimal"
                    value={formData.longitude}
                    onChange={(event) =>
                      updateField("longitude", event.target.value)
                    }
                    placeholder="Ex.: -54.635000"
                  />
                  <small>
                    Use junto com a latitude para localizar exatamente onde a
                    coleta foi feita.
                  </small>
                </div>

                <MonitoringMapPicker
                  point={currentMapPoint}
                  interactionEnabled={mapInteractionEnabled}
                  isGettingLocation={isGettingLocation}
                  onEnableInteraction={onEnableMapInteraction}
                  onDisableInteraction={onDisableMapInteraction}
                  onUseCurrentLocation={onUseCurrentLocation}
                  onSelectPoint={onSelectMapPoint}
                />
              </div>
            </div>

            <div className="espiagro-form-section">
              <div className="espiagro-form-section-header">
                <strong>Anotações e uso da coleta</strong>
                <p>
                  Registre informações que ajudam a interpretar os números,
                  como clima recente, manejo aplicado, pragas observadas ou
                  origem dos dados medidos.
                </p>
              </div>

              <div className="espiagro-form-grid">
                <div className="espiagro-field espiagro-field-full">
                  <label htmlFor="observacoes">Anotações de campo</label>
                  <textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(event) =>
                      updateField("observacoes", event.target.value)
                    }
                    placeholder="Ex.: área com solo mais úmido, presença de lagarta, leitura feita com sensor, estimativa por amostragem..."
                  />
                  <small>
                    Use este espaço para explicar a origem dos dados e qualquer
                    observação importante para a tomada de decisão.
                  </small>
                </div>

                <div className="espiagro-field espiagro-field-full">
                  <div className="espiagro-collection-status-card">
                    <div>
                      <strong>
                        {formData.ativa ? "Coleta ativa" : "Coleta arquivada"}
                      </strong>
                      <p>
                        {formData.ativa
                          ? "Esta coleta será considerada nos acompanhamentos, alertas, mapas e relatórios."
                          : "Esta coleta ficará guardada para consulta, mas não será priorizada nos acompanhamentos atuais."}
                      </p>
                    </div>

                    <label
                      className="espiagro-collection-status-toggle"
                      htmlFor="ativa"
                    >
                      <input
                        id="ativa"
                        type="checkbox"
                        checked={formData.ativa}
                        onChange={(event) =>
                          updateField("ativa", event.target.checked)
                        }
                      />
                      <span>{formData.ativa ? "Ativa" : "Arquivada"}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {selectedTalhaoResumo ? (
              <div className="espiagro-note-box">
                <strong>Talhão selecionado</strong>
                <p>
                  {selectedTalhaoResumo.nome ||
                    `Talhão #${selectedTalhaoResumo.id}`}
                  {selectedTalhaoResumo.propriedade_nome
                    ? ` • ${selectedTalhaoResumo.propriedade_nome}`
                    : ""}
                </p>
              </div>
            ) : null}

            {submitMessage ? (
              <div className="espiagro-feedback-message">{submitMessage}</div>
            ) : null}

            {submitError ? (
              <div className="espiagro-feedback-error">{submitError}</div>
            ) : null}

            <div className="espiagro-form-actions">
              <button
                type="submit"
                className="espiagro-btn espiagro-btn-primary"
                disabled={isSubmitting || isLoadingTalhoes}
              >
                {isSubmitting
                  ? "Salvando..."
                  : editingItem
                    ? "Salvar alterações"
                    : "Registrar coleta"}
              </button>

              <button
                type="button"
                className="espiagro-btn espiagro-btn-ghost"
                onClick={onResetForm}
                disabled={isSubmitting}
              >
                Limpar campos
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}