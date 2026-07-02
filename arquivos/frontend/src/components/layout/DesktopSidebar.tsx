import { NavLink } from "react-router-dom";

import { appNavItems, BRAND_LOGO_SRC } from "@/config/appNavigation";

import "./DesktopSidebar.css";

type DesktopSidebarProps = {
  onLogout: () => void;
  onDeleteAccount: () => void;
};

export default function DesktopSidebar({
  onLogout,
  onDeleteAccount,
}: DesktopSidebarProps) {
  return (
    <aside className="espiagro-desktop-sidebar" aria-label="Menu principal">
      <div className="espiagro-desktop-sidebar-brand">
        <div className="espiagro-desktop-sidebar-logo">
          <img
            src={BRAND_LOGO_SRC}
            alt="EspIAgro"
            decoding="async"
          />
        </div>
      </div>

      <nav
        className="espiagro-desktop-sidebar-nav"
        aria-label="Módulos do aplicativo"
      >
        {appNavItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `espiagro-desktop-sidebar-link ${isActive ? "active" : ""}`
            }
            aria-label={`${item.label}: ${item.description}`}
            title={item.label}
          >
            <span className="espiagro-desktop-sidebar-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span className="espiagro-desktop-sidebar-text">
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </NavLink>
        ))}
      </nav>

      <div
        className="espiagro-desktop-sidebar-actions"
        aria-label="Ações da conta"
      >
        <button
          type="button"
          className="espiagro-desktop-sidebar-action danger"
          onClick={onDeleteAccount}
          aria-label="Excluir conta"
        >
          Excluir conta
        </button>

        <button
          type="button"
          className="espiagro-desktop-sidebar-action"
          onClick={onLogout}
          aria-label="Sair da plataforma"
        >
          Sair da plataforma
        </button>
      </div>
    </aside>
  );
}