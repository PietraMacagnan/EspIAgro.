import type { FormEvent } from "react";

import type {
  Alerta,
  AlertaPayload,
} from "@/features/alertas/types/alerta.types";

type AlertReviewSheetProps = {
  isOpen: boolean;
  editingItem: Alerta | null;
  formData: AlertaPayload;
  formTitle: string;
  formDescription: string;
  actionMessage: string;
  actionError: string;
  isMutating: boolean;
  hasUnsavedFormData: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onUpdateField: <K extends keyof AlertaPayload>(
    field: K,
    value: AlertaPayload[K],
  ) => void;
};

export default function AlertReviewSheet({
  isOpen,
  editingItem,
  formData,
  formTitle,
  formDescription,
  actionMessage,
  actionError,
  isMutating,
  hasUnsavedFormData,
  onClose,
  onSubmit,
  onUpdateField,
}: AlertReviewSheetProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="espiagro-form-sheet-overlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="espiagro-form-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={formTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <section className="espiagro-form-card">
          <div className="espiagro-form-header">
            <div>
              <span className="espiagro-panel-kicker">Revisão do aviso</span>
              <h3>{formTitle}</h3>
              <p>{formDescription}</p>
            </div>

            <button
              type="button"
              className="espiagro-form-sheet-close"
              onClick={onClose}
              aria-label="Fechar revisão do aviso"
            >
              ×
            </button>
          </div>

          {hasUnsavedFormData ? (
            <div className="espiagro-unsaved-alert">
              <strong>Alterações ainda não salvas</strong>
              <span>
                Se fechar agora, as informações alteradas podem ser perdidas.
              </span>
            </div>
          ) : null}

          <form onSubmit={(event) => void onSubmit(event)}>
            <div className="espiagro-form-grid">
              <div className="espiagro-field">
                <label htmlFor="titulo">Título do aviso</label>
                <input
                  id="titulo"
                  type="text"
                  value={formData.titulo}
                  onChange={(event) =>
                    onUpdateField("titulo", event.target.value)
                  }
                  placeholder="Ex.: Atenção no Talhão A1"
                />
              </div>

              <div className="espiagro-field">
                <label htmlFor="status">Situação</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(event) =>
                    onUpdateField("status", event.target.value)
                  }
                >
                  <option value="ativo">Em aberto</option>
                  <option value="em_analise">Em acompanhamento</option>
                  <option value="resolvido">Resolvido</option>
                  <option value="ignorado">Fora da prioridade</option>
                </select>
              </div>

              <div className="espiagro-field espiagro-field-full">
                <label htmlFor="mensagem">Mensagem principal</label>
                <textarea
                  id="mensagem"
                  value={formData.mensagem}
                  onChange={(event) =>
                    onUpdateField("mensagem", event.target.value)
                  }
                  placeholder="Descreva a situação observada"
                />
              </div>

              <div className="espiagro-field espiagro-field-full">
                <label htmlFor="recomendacao">Orientação recomendada</label>
                <textarea
                  id="recomendacao"
                  value={formData.recomendacao}
                  onChange={(event) =>
                    onUpdateField("recomendacao", event.target.value)
                  }
                  placeholder="Oriente a próxima ação no campo"
                />
              </div>

              <div className="espiagro-field">
                <label>Visualização</label>
                <div className="espiagro-switch-row">
                  <input
                    id="lido"
                    type="checkbox"
                    checked={formData.lido}
                    onChange={(event) =>
                      onUpdateField("lido", event.target.checked)
                    }
                  />
                  <label htmlFor="lido">Este aviso já foi visualizado</label>
                </div>
              </div>

              <div className="espiagro-field">
                <label>Histórico</label>
                <div className="espiagro-switch-row">
                  <input
                    id="ativa"
                    type="checkbox"
                    checked={formData.ativa}
                    onChange={(event) =>
                      onUpdateField("ativa", event.target.checked)
                    }
                  />
                  <label htmlFor="ativa">Manter disponível na lista</label>
                </div>
              </div>
            </div>

            {editingItem ? (
              <div className="espiagro-note-box espiagro-section-spacer">
                <strong>Aviso selecionado</strong>
                <p>
                  {editingItem.titulo || `Aviso #${editingItem.id}`}
                  {editingItem.talhao_nome
                    ? ` • Talhão: ${editingItem.talhao_nome}`
                    : ""}
                  {editingItem.propriedade_nome
                    ? ` • Propriedade: ${editingItem.propriedade_nome}`
                    : ""}
                </p>
              </div>
            ) : null}

            {actionMessage ? (
              <div className="espiagro-feedback-message">{actionMessage}</div>
            ) : null}

            {actionError ? (
              <div className="espiagro-feedback-error">{actionError}</div>
            ) : null}

            <div className="espiagro-form-actions" style={{ marginTop: 18 }}>
              <button
                type="submit"
                className="espiagro-btn espiagro-btn-primary"
                disabled={!editingItem || isMutating}
              >
                {isMutating ? "Salvando..." : "Salvar alterações"}
              </button>

              <button
                type="button"
                className="espiagro-btn espiagro-btn-ghost"
                onClick={onClose}
                disabled={isMutating}
              >
                Fechar
              </button>
            </div>
          </form>
        </section>
      </section>
    </div>
  );
}