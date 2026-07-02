import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import http from "@/services/http";
import { isAuthenticated, login } from "@/services/auth";
import "./LoginPage.css";

const APP_DESKTOP_LOGO_SRC = "/images/logo/logo_oficial.png";
const APP_MOBILE_LOGO_SRC = "/images/logo/espiagro.png";

const REGISTER_ENDPOINT = "/auth/register/";
const PASSWORD_RESET_ENDPOINT = "/auth/password-reset/";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Informe o usuário."),
  password: z.string().min(1, "Informe a senha."),
});

const registerSchema = z
  .object({
    first_name: z.string().trim().optional(),
    last_name: z.string().trim().optional(),
    username: z
      .string()
      .trim()
      .min(3, "Informe um usuário com pelo menos 3 caracteres."),
    email: z
      .string()
      .trim()
      .min(1, "Informe o e-mail.")
      .email("Informe um e-mail válido."),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

const recoverSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail.")
    .email("Informe um e-mail válido."),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type RecoverFormData = z.infer<typeof recoverSchema>;

type AuthMode = "login" | "register" | "recover";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

function getAxiosMessage(
  error: unknown,
  fallbackMessage: string,
  endpointName: "register" | "recover" | "login",
): string {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  if (error.code === "ECONNABORTED") {
    return "A solicitação demorou mais do que o esperado. Tente novamente.";
  }

  if (error.response?.status === 404) {
    if (endpointName === "register") {
      return "O cadastro de novos usuários não está disponível no momento.";
    }

    if (endpointName === "recover") {
      return "A recuperação de senha não está disponível no momento.";
    }

    return fallbackMessage;
  }

  if (error.response?.status === 400) {
    const responseData: unknown = error.response?.data;

    if (responseData && typeof responseData === "object") {
      const values = Object.values(responseData).flatMap((value): string[] => {
        if (typeof value === "string") {
          return [value];
        }

        if (Array.isArray(value)) {
          return value.filter(
            (item): item is string => typeof item === "string",
          );
        }

        return [];
      });

      if (values.length > 0) {
        return values.join(" ");
      }
    }

    return fallbackMessage;
  }

  if (error.response?.status === 401) {
    return "Credenciais inválidas. Verifique usuário e senha.";
  }

  const responseData: unknown = error.response?.data;

  if (
    responseData &&
    typeof responseData === "object" &&
    "detail" in responseData
  ) {
    const detail = responseData.detail;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return fallbackMessage;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] =
    useState(false);

  const [brandLogoFailed, setBrandLogoFailed] = useState(false);
  const [formLogoFailed, setFormLogoFailed] = useState(false);

  useEffect(() => {
    const rootElement = document.getElementById("root");

    const previousHtmlOverflowY = document.documentElement.style.overflowY;
    const previousHtmlHeight = document.documentElement.style.height;

    const previousBodyOverflowY = document.body.style.overflowY;
    const previousBodyOverflowX = document.body.style.overflowX;
    const previousBodyHeight = document.body.style.height;
    const previousBodyMinHeight = document.body.style.minHeight;

    const previousRootOverflowY = rootElement?.style.overflowY ?? "";
    const previousRootOverflowX = rootElement?.style.overflowX ?? "";
    const previousRootHeight = rootElement?.style.height ?? "";
    const previousRootMinHeight = rootElement?.style.minHeight ?? "";

    document.documentElement.style.overflowY = "auto";
    document.documentElement.style.height = "auto";

    document.body.style.overflowY = "auto";
    document.body.style.overflowX = "hidden";
    document.body.style.height = "auto";
    document.body.style.minHeight = "100dvh";

    if (rootElement) {
      rootElement.style.overflowY = "auto";
      rootElement.style.overflowX = "hidden";
      rootElement.style.height = "auto";
      rootElement.style.minHeight = "100dvh";
    }

    return () => {
      document.documentElement.style.overflowY = previousHtmlOverflowY;
      document.documentElement.style.height = previousHtmlHeight;

      document.body.style.overflowY = previousBodyOverflowY;
      document.body.style.overflowX = previousBodyOverflowX;
      document.body.style.height = previousBodyHeight;
      document.body.style.minHeight = previousBodyMinHeight;

      if (rootElement) {
        rootElement.style.overflowY = previousRootOverflowY;
        rootElement.style.overflowX = previousRootOverflowX;
        rootElement.style.height = previousRootHeight;
        rootElement.style.minHeight = previousRootMinHeight;
      }
    };
  }, []);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const recoverForm = useForm<RecoverFormData>({
    resolver: zodResolver(recoverSchema),
    defaultValues: {
      email: "",
    },
  });

  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    setValue: setLoginValue,
    formState: { errors: loginErrors, isSubmitting: isSubmittingLogin },
  } = loginForm;

  const {
    register: registerCreate,
    handleSubmit: handleSubmitRegister,
    reset: resetRegisterForm,
    formState: { errors: registerErrors, isSubmitting: isSubmittingRegister },
  } = registerForm;

  const {
    register: registerRecover,
    handleSubmit: handleSubmitRecover,
    reset: resetRecoverForm,
    formState: { errors: recoverErrors, isSubmitting: isSubmittingRecover },
  } = recoverForm;

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  function clearFeedback(): void {
    setSubmitError("");
    setSubmitMessage("");
  }

  function switchMode(mode: AuthMode): void {
    setAuthMode(mode);
    clearFeedback();
  }

  async function onSubmitLogin(values: LoginFormData): Promise<void> {
    try {
      clearFeedback();
      await login(values);

      const state = location.state as LocationState | null;
      const redirectTo = state?.from?.pathname || "/";

      void navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(
        getAxiosMessage(
          error,
          "Não foi possível entrar. Verifique seus dados e tente novamente.",
          "login",
        ),
      );
      console.error("Erro no login do EspIAgro:", error);
    }
  }

  async function onSubmitRegister(values: RegisterFormData): Promise<void> {
    try {
      clearFeedback();

      await http.post(REGISTER_ENDPOINT, {
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
        first_name: values.first_name?.trim() || "",
        last_name: values.last_name?.trim() || "",
      });

      setSubmitMessage(
        "Cadastro realizado com sucesso. Agora entre com seu usuário e senha.",
      );

      setLoginValue("username", values.username.trim());
      resetRegisterForm();
      setAuthMode("login");
    } catch (error) {
      setSubmitError(
        getAxiosMessage(
          error,
          "Não foi possível concluir o cadastro.",
          "register",
        ),
      );
      console.error("Erro ao cadastrar usuário no EspIAgro:", error);
    }
  }

  async function onSubmitRecover(values: RecoverFormData): Promise<void> {
    try {
      clearFeedback();

      await http.post(PASSWORD_RESET_ENDPOINT, {
        email: values.email.trim(),
      });

      setSubmitMessage(
        "Solicitação enviada com sucesso. Verifique seu e-mail para continuar.",
      );

      resetRecoverForm();
    } catch (error) {
      setSubmitError(
        getAxiosMessage(
          error,
          "Não foi possível solicitar a recuperação de senha.",
          "recover",
        ),
      );
      console.error("Erro ao solicitar recuperação de senha no EspIAgro:", error);
    }
  }

  const isSubmitting =
    isSubmittingLogin || isSubmittingRegister || isSubmittingRecover;

  return (
    <div className="espiagro-auth-page">
      <section className="espiagro-auth-brand">
        <div className="espiagro-auth-brand-card">
          <div className="espiagro-auth-topline">
            <div className="espiagro-auth-logo">
              <div className="espiagro-auth-logo-spotlight">
                {!brandLogoFailed ? (
                  <>
                    <img
                      src={APP_DESKTOP_LOGO_SRC}
                      alt="Logo do EspIAgro"
                      className="espiagro-auth-logo-image espiagro-auth-logo-image-desktop"
                      onError={() => setBrandLogoFailed(true)}
                    />

                    <img
                      src={APP_MOBILE_LOGO_SRC}
                      alt="Logo do EspIAgro"
                      className="espiagro-auth-logo-image espiagro-auth-logo-image-mobile"
                      onError={() => setBrandLogoFailed(true)}
                    />
                  </>
                ) : (
                  <div className="espiagro-auth-logo-mark">IA</div>
                )}
              </div>
            </div>
          </div>

          <h1 className="espiagro-auth-title">
            Acompanhe a lavoura com mais clareza, organização e apoio técnico.
          </h1>

          <p className="espiagro-auth-description">
            Entre para consultar monitoramentos, receber alertas, acessar relatórios
            e acompanhar informações importantes da operação.
          </p>
        </div>

        <div className="espiagro-auth-highlights">
          <div className="espiagro-auth-highlight monitoramento">
            <strong>Monitoramento</strong>
            <span>
              Registre observações de campo, imagens e informações importantes
              da lavoura.
            </span>
          </div>

          <div className="espiagro-auth-highlight alertas">
            <strong>Alertas</strong>
            <span>
              Acompanhe ocorrências prioritárias e pontos que merecem maior
              atenção.
            </span>
          </div>

          <div className="espiagro-auth-highlight relatorios">
            <strong>Relatórios</strong>
            <span>
              Consulte diagnósticos organizados e documentos gerados para apoio
              técnico.
            </span>
          </div>
        </div>

        <div className="espiagro-auth-footer-card">
          <strong>EspIAgro • Plataforma de apoio ao monitoramento agrícola</strong>
          <p>
            Um ambiente pensado para facilitar o acompanhamento da operação no
            campo com leitura mais clara, prática e organizada.
          </p>
        </div>
      </section>

      <section className="espiagro-auth-form-wrap">
        <div className="espiagro-auth-form-card">
          <div className="espiagro-auth-form-head">
            <div className="espiagro-auth-form-logo">
              {!formLogoFailed ? (
                <>
                  <img
                    src={APP_DESKTOP_LOGO_SRC}
                    alt="Logo do EspIAgro"
                    className="espiagro-auth-form-logo-image espiagro-auth-form-logo-image-desktop"
                    onError={() => setFormLogoFailed(true)}
                  />

                  <img
                    src={APP_MOBILE_LOGO_SRC}
                    alt="Logo do EspIAgro"
                    className="espiagro-auth-form-logo-image espiagro-auth-form-logo-image-mobile"
                    onError={() => setFormLogoFailed(true)}
                  />
                </>
              ) : (
                <span className="espiagro-auth-form-logo-fallback">IA</span>
              )}
            </div>

            <h1>
              {authMode === "login"
                ? "Acessar sistema"
                : authMode === "register"
                  ? "Criar conta"
                  : "Recuperar senha"}
            </h1>
          </div>

          <p className="espiagro-auth-form-description">
            {authMode === "login"
              ? "Entre com seus dados para continuar."
              : authMode === "register"
                ? "Preencha os dados abaixo para criar seu acesso."
                : "Informe seu e-mail para receber as instruções de recuperação."}
          </p>

          <div className="espiagro-auth-tabs">
            <button
              type="button"
              className={`espiagro-auth-tab ${authMode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Entrar
            </button>

            <button
              type="button"
              className={`espiagro-auth-tab ${authMode === "register" ? "active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Cadastrar
            </button>

            <button
              type="button"
              className={`espiagro-auth-tab ${authMode === "recover" ? "active" : ""}`}
              onClick={() => switchMode("recover")}
            >
              Recuperar
            </button>
          </div>

          {submitMessage ? (
            <div className="espiagro-submit-message" aria-live="polite">
              {submitMessage}
            </div>
          ) : null}

          {submitError ? (
            <div className="espiagro-submit-error" aria-live="polite">
              {submitError}
            </div>
          ) : null}

          {authMode === "login" ? (
            <form
              className="espiagro-auth-form"
              onSubmit={(event) => {
                void handleSubmitLogin(onSubmitLogin)(event);
              }}
            >
              <div className="espiagro-field">
                <label htmlFor="username">Usuário</label>
                <div className="espiagro-input-wrap">
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Digite seu usuário"
                    {...registerLogin("username")}
                  />
                </div>

                {loginErrors.username ? (
                  <span className="espiagro-field-error">
                    {loginErrors.username.message}
                  </span>
                ) : null}
              </div>

              <div className="espiagro-field">
                <label htmlFor="password">Senha</label>
                <div className="espiagro-input-wrap">
                  <input
                    id="password"
                    className="espiagro-input-with-action"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    {...registerLogin("password")}
                  />
                  <button
                    type="button"
                    className="espiagro-input-action"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>

                {loginErrors.password ? (
                  <span className="espiagro-field-error">
                    {loginErrors.password.message}
                  </span>
                ) : null}
              </div>

              <button
                type="submit"
                className="espiagro-auth-submit"
                disabled={isSubmitting}
              >
                {isSubmittingLogin ? "Entrando..." : "Entrar na plataforma"}
              </button>

              <div className="espiagro-auth-link-row">
                <button
                  type="button"
                  className="espiagro-auth-link-btn"
                  onClick={() => switchMode("recover")}
                >
                  Esqueci minha senha
                </button>

                <button
                  type="button"
                  className="espiagro-auth-link-btn"
                  onClick={() => switchMode("register")}
                >
                  Criar novo usuário
                </button>
              </div>
            </form>
          ) : null}

          {authMode === "register" ? (
            <form
              className="espiagro-auth-form"
              onSubmit={(event) => {
                void handleSubmitRegister(onSubmitRegister)(event);
              }}
            >
              <div className="espiagro-auth-grid">
                <div className="espiagro-field">
                  <label htmlFor="first_name">Nome</label>
                  <input
                    id="first_name"
                    type="text"
                    placeholder="Digite seu nome"
                    {...registerCreate("first_name")}
                  />

                  {registerErrors.first_name ? (
                    <span className="espiagro-field-error">
                      {registerErrors.first_name.message}
                    </span>
                  ) : null}
                </div>

                <div className="espiagro-field">
                  <label htmlFor="last_name">Sobrenome</label>
                  <input
                    id="last_name"
                    type="text"
                    placeholder="Digite seu sobrenome"
                    {...registerCreate("last_name")}
                  />

                  {registerErrors.last_name ? (
                    <span className="espiagro-field-error">
                      {registerErrors.last_name.message}
                    </span>
                  ) : null}
                </div>

                <div className="espiagro-field">
                  <label htmlFor="register_username">Usuário</label>
                  <input
                    id="register_username"
                    type="text"
                    autoComplete="username"
                    placeholder="Crie um usuário"
                    {...registerCreate("username")}
                  />

                  {registerErrors.username ? (
                    <span className="espiagro-field-error">
                      {registerErrors.username.message}
                    </span>
                  ) : null}
                </div>

                <div className="espiagro-field">
                  <label htmlFor="register_email">E-mail</label>
                  <input
                    id="register_email"
                    type="email"
                    autoComplete="email"
                    placeholder="Digite seu e-mail"
                    {...registerCreate("email")}
                  />

                  {registerErrors.email ? (
                    <span className="espiagro-field-error">
                      {registerErrors.email.message}
                    </span>
                  ) : null}
                </div>

                <div className="espiagro-field">
                  <label htmlFor="register_password">Senha</label>
                  <div className="espiagro-input-wrap">
                    <input
                      id="register_password"
                      className="espiagro-input-with-action"
                      type={showRegisterPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Crie uma senha"
                      {...registerCreate("password")}
                    />
                    <button
                      type="button"
                      className="espiagro-input-action"
                      onClick={() => setShowRegisterPassword((value) => !value)}
                    >
                      {showRegisterPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>

                  {registerErrors.password ? (
                    <span className="espiagro-field-error">
                      {registerErrors.password.message}
                    </span>
                  ) : null}
                </div>

                <div className="espiagro-field">
                  <label htmlFor="confirm_password">Confirmar senha</label>
                  <div className="espiagro-input-wrap">
                    <input
                      id="confirm_password"
                      className="espiagro-input-with-action"
                      type={showRegisterConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repita a senha"
                      {...registerCreate("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="espiagro-input-action"
                      onClick={() =>
                        setShowRegisterConfirmPassword((value) => !value)
                      }
                    >
                      {showRegisterConfirmPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>

                  {registerErrors.confirmPassword ? (
                    <span className="espiagro-field-error">
                      {registerErrors.confirmPassword.message}
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                className="espiagro-auth-submit"
                disabled={isSubmitting}
              >
                {isSubmittingRegister ? "Cadastrando..." : "Criar conta"}
              </button>

              <div className="espiagro-auth-link-row">
                <button
                  type="button"
                  className="espiagro-auth-link-btn"
                  onClick={() => switchMode("login")}
                >
                  Já tenho conta
                </button>
              </div>
            </form>
          ) : null}

          {authMode === "recover" ? (
            <form
              className="espiagro-auth-form"
              onSubmit={(event) => {
                void handleSubmitRecover(onSubmitRecover)(event);
              }}
            >
              <div className="espiagro-field">
                <label htmlFor="recover_email">E-mail</label>
                <input
                  id="recover_email"
                  type="email"
                  autoComplete="email"
                  placeholder="Informe seu e-mail cadastrado"
                  {...registerRecover("email")}
                />

                {recoverErrors.email ? (
                  <span className="espiagro-field-error">
                    {recoverErrors.email.message}
                  </span>
                ) : null}
              </div>

              <button
                type="submit"
                className="espiagro-auth-submit"
                disabled={isSubmitting}
              >
                {isSubmittingRecover ? "Enviando..." : "Solicitar recuperação"}
              </button>

              <div className="espiagro-auth-link-row">
                <button
                  type="button"
                  className="espiagro-auth-link-btn"
                  onClick={() => switchMode("login")}
                >
                  Voltar para o login
                </button>

                <button
                  type="button"
                  className="espiagro-auth-link-btn"
                  onClick={() => switchMode("register")}
                >
                  Criar novo usuário
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}