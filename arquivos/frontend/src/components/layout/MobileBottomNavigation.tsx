import { NavLink, useLocation } from "react-router-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { AppNavItem } from "@/config/appNavigation";
import { appNavItems } from "@/config/appNavigation";
import "./MobileBottomNavigation.css";

type MobileBottomNavigationProps = {
  onLogout: () => void;
  onDeleteAccount: () => void;
};

const primaryNavKeys = [
  "dashboard",
  "propriedades",
  "talhoes",
  "monitoramentos",
];

const primaryLabelByKey: Record<string, string> = {
  dashboard: "Painel",
  propriedades: "Propriedades",
  talhoes: "Talhões",
  monitoramentos: "Monitoramento",
};

function isPathActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === "/") {
    return currentPath === "/";
  }

  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

function getPrimaryItems(): AppNavItem[] {
  return primaryNavKeys
    .map((key) => appNavItems.find((item) => item.key === key))
    .filter((item): item is AppNavItem => Boolean(item));
}

function getPrimaryLabel(item: AppNavItem): string {
  return primaryLabelByKey[item.key] ?? item.label ?? item.shortLabel;
}

export default function MobileBottomNavigation({
  onLogout,
  onDeleteAccount,
}: MobileBottomNavigationProps) {
  const location = useLocation();
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const moreMenuId = useId();
  const moreMenuTitleId = useId();
  const moreMenuDescriptionId = useId();

  const [openMenuLocationKey, setOpenMenuLocationKey] = useState<string | null>(
    null,
  );

  const primaryItems = getPrimaryItems();

  const secondaryItems = appNavItems.filter(
    (item) => !primaryNavKeys.includes(item.key),
  );

  const isMoreOpen = openMenuLocationKey === location.key;

  const isMoreActive =
    isMoreOpen ||
    secondaryItems.some((item) => isPathActive(item.path, location.pathname));

  const closeMoreMenu = useCallback((): void => {
    setOpenMenuLocationKey(null);
  }, []);

  function toggleMoreMenu(): void {
    setOpenMenuLocationKey((current) =>
      current === location.key ? null : location.key,
    );
  }

  function handleLogout(): void {
    closeMoreMenu();
    onLogout();
  }

  function handleDeleteAccount(): void {
    closeMoreMenu();
    onDeleteAccount();
  }

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMoreMenu();
        moreButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMoreMenu, isMoreOpen]);

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMoreOpen]);

  return (
    <>
      <nav
        className="espiagro-mobile-bottom-nav"
        aria-label="Navegação principal do aplicativo"
      >
        {primaryItems.map((item: AppNavItem) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `espiagro-mobile-bottom-link ${isActive ? "active" : ""}`
            }
            onClick={closeMoreMenu}
            aria-label={getPrimaryLabel(item)}
          >
            <span className="espiagro-mobile-bottom-icon" aria-hidden="true">
              {item.icon}
            </span>

            <span className="espiagro-mobile-bottom-label">
              {getPrimaryLabel(item)}
            </span>
          </NavLink>
        ))}

        <button
          ref={moreButtonRef}
          type="button"
          className={`espiagro-mobile-bottom-link ${
            isMoreActive ? "active" : ""
          }`}
          onClick={toggleMoreMenu}
          aria-haspopup="dialog"
          aria-expanded={isMoreOpen}
          aria-controls={isMoreOpen ? moreMenuId : undefined}
          aria-label={isMoreOpen ? "Fechar mais opções" : "Abrir mais opções"}
        >
          <span className="espiagro-mobile-bottom-icon" aria-hidden="true">
            ☰
          </span>

          <span className="espiagro-mobile-bottom-label">Mais</span>
        </button>
      </nav>

      {isMoreOpen ? (
        <div
          className="espiagro-mobile-more-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMoreMenu();
              moreButtonRef.current?.focus();
            }
          }}
        >
          <section
            id={moreMenuId}
            className="espiagro-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={moreMenuTitleId}
            aria-describedby={moreMenuDescriptionId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="espiagro-mobile-more-header">
              <div>
                <strong id={moreMenuTitleId}>Mais opções</strong>
                <span id={moreMenuDescriptionId}>
                  Acesse outras áreas do app e opções da conta.
                </span>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                className="espiagro-mobile-more-close"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  closeMoreMenu();
                  moreButtonRef.current?.focus();
                }}
                aria-label="Fechar menu de mais opções"
              >
                ×
              </button>
            </div>

            <div className="espiagro-mobile-more-list">
              {secondaryItems.map((item: AppNavItem) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  className={({ isActive }) =>
                    `espiagro-mobile-more-item ${isActive ? "active" : ""}`
                  }
                  onClick={closeMoreMenu}
                  aria-label={`${item.label}: ${item.description}`}
                >
                  <span
                    className="espiagro-mobile-more-icon"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <span className="espiagro-mobile-more-text">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </NavLink>
              ))}
            </div>

            <div
              className="espiagro-mobile-account-actions"
              aria-label="Ações da conta"
            >
              <button
                type="button"
                className="espiagro-mobile-account-action danger"
                onClick={handleDeleteAccount}
              >
                Excluir conta
              </button>

              <button
                type="button"
                className="espiagro-mobile-account-action"
                onClick={handleLogout}
              >
                Sair da plataforma
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}