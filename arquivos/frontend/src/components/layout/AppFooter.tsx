import { NavLink } from "react-router-dom";

import { appNavItems, FOOTER_LOGO_SRC } from "@/config/appNavigation";

import "./AppFooter.css";

export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="espiagro-app-footer" aria-label="Rodapé institucional">
      <div className="espiagro-app-footer-shell">
        <section
          className="espiagro-app-footer-brand"
          aria-labelledby="espiagro-footer-title"
        >
          <div className="espiagro-app-footer-logo-card">
            <img src={FOOTER_LOGO_SRC} alt="EspIAgro" decoding="async" />
          </div>

          <div className="espiagro-app-footer-brand-text">
            <span className="espiagro-app-footer-kicker">EspIAgro</span>

            <strong id="espiagro-footer-title">
              Monitoramento inteligente de lavouras
            </strong>

            <p>
              Plataforma para organizar propriedades, talhões, coletas de campo,
              alertas e relatórios agrícolas em uma experiência simples, visual
              e profissional.
            </p>
          </div>
        </section>

        <section className="espiagro-app-footer-section">
          <div className="espiagro-app-footer-section-header">
            <strong>Módulos do app</strong>
            <span>Acesso rápido</span>
          </div>

          <nav
            className="espiagro-app-footer-links"
            aria-label="Links rápidos do rodapé"
          >
            {appNavItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `espiagro-app-footer-link ${isActive ? "active" : ""}`
                }
              >
                <span
                  className="espiagro-app-footer-link-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </section>
      </div>

      <div className="espiagro-app-footer-bottom">
        <p>
          <strong>EspIAgro</strong>
          <span>Decleones Andrade • Direitos Reservados • AndradeSystem - Sistemas Inteligentes</span>
          <small>© {currentYear}</small>
        </p>
      </div>
    </footer>
  );
}