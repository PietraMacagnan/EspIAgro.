import { NavLink } from "react-router-dom";

import "./NotFoundPage.css";

const quickActions = [
  {
    title: "Voltar ao painel",
    text: "Veja a visão geral da lavoura, últimos registros, clima e pontos de atenção.",
    path: "/",
    label: "Abrir painel",
  },
  {
    title: "Consultar o mapa",
    text: "Visualize propriedades, talhões e coletas de campo em uma visão espacial.",
    path: "/mapa",
    label: "Abrir mapa",
  },
  {
    title: "Registrar coleta",
    text: "Continue o acompanhamento da lavoura criando um novo registro de campo.",
    path: "/monitoramentos",
    label: "Abrir coletas",
  },
];

export default function NotFoundPage() {
  return (
    <div className="espiagro-not-found-page">
      <section className="espiagro-not-found-hero">
        <div className="espiagro-not-found-main">
          <span className="espiagro-not-found-kicker">
            Página não encontrada
          </span>

          <h1 className="espiagro-not-found-title">
            Não encontramos essa área do app.
          </h1>

          <p className="espiagro-not-found-description">
            O endereço pode ter mudado, sido digitado incorretamente ou não estar
            disponível neste momento. Use uma das opções abaixo para continuar
            navegando pelo EspIAgro.
          </p>

          <div className="espiagro-not-found-band">
            EspIAgro • Monitoramento da lavoura • Navegação segura
          </div>

          <div className="espiagro-not-found-actions">
            <NavLink
              to="/"
              className="espiagro-not-found-button espiagro-not-found-button-primary"
            >
              Voltar ao painel
            </NavLink>

            <NavLink
              to="/sobre"
              className="espiagro-not-found-button espiagro-not-found-button-secondary"
            >
              Sobre o app
            </NavLink>
          </div>
        </div>

        <div className="espiagro-not-found-side">
          <div className="espiagro-not-found-code-card">
            <span>Erro</span>
            <strong>404</strong>
            <p>Esta rota não está disponível no app.</p>
          </div>

          <div className="espiagro-not-found-mini-card">
            <span>O que fazer agora?</span>
            <strong>Use o menu inferior ou escolha um atalho seguro.</strong>
          </div>
        </div>
      </section>

      <section className="espiagro-not-found-grid" aria-label="Atalhos do app">
        {quickActions.map((item) => (
          <article key={item.path} className="espiagro-not-found-card">
            <div>
              <span className="espiagro-not-found-card-kicker">
                Atalho recomendado
              </span>

              <h2>{item.title}</h2>

              <p>{item.text}</p>
            </div>

            <NavLink to={item.path} className="espiagro-not-found-card-link">
              {item.label}
            </NavLink>
          </article>
        ))}
      </section>
    </div>
  );
}