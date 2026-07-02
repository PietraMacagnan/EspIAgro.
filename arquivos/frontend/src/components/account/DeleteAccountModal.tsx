import { type FormEvent, useEffect, useState } from "react";

import "./DeleteAccountModal.css";

type DeleteAccountModalProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onConfirm: (payload: {
    password: string;
    confirmationText: string;
  }) => Promise<void> | void;
};

export default function DeleteAccountModal({
  isOpen,
  isSubmitting = false,
  errorMessage = "",
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [password, setPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [localError, setLocalError] = useState("");

  const canConfirm =
    password.trim().length > 0 &&
    confirmationText.trim().toUpperCase() === "EXCLUIR";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  function resetForm(): void {
    setPassword("");
    setConfirmationText("");
    setLocalError("");
  }

  function handleClose(): void {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLocalError("");

    if (!password.trim()) {
      setLocalError("Informe sua senha para confirmar a exclusão.");
      return;
    }

    if (confirmationText.trim().toUpperCase() !== "EXCLUIR") {
      setLocalError("Digite EXCLUIR para confirmar esta ação.");
      return;
    }

    await onConfirm({
      password,
      confirmationText: confirmationText.trim().toUpperCase(),
    });
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="espiagro-delete-account-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onClick={handleClose}
    >
      <section
        className="espiagro-delete-account-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="espiagro-delete-account-header">
          <span>Conta</span>

          <h2 id="delete-account-title">Excluir conta</h2>

          <p>
            Esta ação remove o acesso à plataforma e pode apagar dados vinculados
            ao seu usuário.
          </p>
        </header>

        <form
          className="espiagro-delete-account-body"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <div className="espiagro-delete-account-warning">
            <strong>Atenção antes de continuar</strong>

            <p>
              Excluir a conta é diferente de sair da plataforma. Para apenas
              encerrar a sessão, use a opção “Sair”.
            </p>
          </div>

          <div className="espiagro-delete-account-list">
            <div>
              <strong>Acesso removido</strong>
              <span>Você não poderá acessar o app com este usuário.</span>
            </div>

            <div>
              <strong>Dados vinculados</strong>
              <span>
                Registros associados à conta podem ser removidos conforme as
                regras da plataforma.
              </span>
            </div>

            <div>
              <strong>Confirmação obrigatória</strong>
              <span>
                Para sua segurança, informe sua senha e confirme a ação.
              </span>
            </div>
          </div>

          <label className="espiagro-delete-account-field">
            <span>Senha atual</span>

            <input
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="espiagro-delete-account-field">
            <span>Confirmação</span>

            <input
              type="text"
              placeholder="Digite EXCLUIR"
              value={confirmationText}
              disabled={isSubmitting}
              onChange={(event) => setConfirmationText(event.target.value)}
            />

            <small>Digite exatamente EXCLUIR para liberar a confirmação.</small>
          </label>

          {localError || errorMessage ? (
            <div className="espiagro-delete-account-error" role="alert">
              {localError || errorMessage}
            </div>
          ) : null}

          <div className="espiagro-delete-account-actions">
            <button
              type="button"
              className="espiagro-delete-account-cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="espiagro-delete-account-confirm"
              disabled={!canConfirm || isSubmitting}
            >
              {isSubmitting ? "Excluindo..." : "Excluir minha conta"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}