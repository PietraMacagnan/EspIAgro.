export type AppNavKey =
  | "dashboard"
  | "mapa"
  | "propriedades"
  | "talhoes"
  | "monitoramentos"
  | "alertas"
  | "relatorios"
  | "base"
  | "sobre";

export type AppNavItem = {
  key: AppNavKey;
  label: string;
  shortLabel: string;
  description: string;
  path: string;
  icon: string;
};

export type PageSupportContent = {
  title: string;
  helper: string;
  image: string;
  mobileImage: string;
};

export const BRAND_LOGO_SRC = "/logo_oficial.png";
export const FOOTER_LOGO_SRC = "/espiagro.png";
export const MOBILE_ICON_SRC = "/icon.png";

export const appNavItems: AppNavItem[] = [
  {
    key: "dashboard",
    label: "Painel",
    shortLabel: "Painel",
    description: "Resumo geral da lavoura",
    path: "/",
    icon: "🏠",
  },
  {
    key: "mapa",
    label: "Mapa da lavoura",
    shortLabel: "Mapa",
    description: "Áreas e coletas no mapa",
    path: "/mapa",
    icon: "🛰️",
  },
  {
    key: "propriedades",
    label: "Propriedades",
    shortLabel: "Propriedades",
    description: "Fazendas cadastradas",
    path: "/propriedades",
    icon: "🌾",
  },
  {
    key: "talhoes",
    label: "Talhões",
    shortLabel: "Talhões",
    description: "Áreas de cultivo",
    path: "/talhoes",
    icon: "🗺️",
  },
  {
    key: "monitoramentos",
    label: "Coletas de campo",
    shortLabel: "Coletas",
    description: "Registros da lavoura",
    path: "/monitoramentos",
    icon: "📷",
  },
  {
    key: "alertas",
    label: "Alertas",
    shortLabel: "Alertas",
    description: "Pontos de atenção",
    path: "/alertas",
    icon: "🚨",
  },
  {
    key: "relatorios",
    label: "Relatórios",
    shortLabel: "Relatórios",
    description: "Análises e documentos",
    path: "/relatorios",
    icon: "📄",
  },
  {
    key: "base",
    label: "Base Técnica",
    shortLabel: "Base",
    description: "Fontes confiáveis",
    path: "/base-tecnica",
    icon: "📚",
  },
  {
    key: "sobre",
    label: "Sobre",
    shortLabel: "Sobre",
    description: "Informações do app",
    path: "/sobre",
    icon: "ℹ️",
  },
];

export const pageSupportContent: Record<AppNavKey, PageSupportContent> = {
  dashboard: {
    title: "Painel",
    helper:
      "Veja a situação geral da lavoura, clima, alertas, últimas coletas e ações importantes.",
    image: "/images/headers/desktop/dashboard-desktop.jpeg",
    mobileImage: "/images/headers/mobile/dashboard-mobile.png",
  },
  mapa: {
    title: "Mapa da lavoura",
    helper:
      "Visualize propriedades, talhões e coletas de campo em uma visão clara no mapa.",
    image: "/images/headers/desktop/mapa-desktop.jpeg",
    mobileImage: "/images/headers/mobile/mapa-mobile.jpeg",
  },
  propriedades: {
    title: "Propriedades",
    helper:
      "Cadastre e organize as propriedades rurais acompanhadas pela plataforma.",
    image: "/images/headers/desktop/propriedades-desktop.jpeg",
    mobileImage: "/images/headers/mobile/propriedades-mobile.jpeg",
  },
  talhoes: {
    title: "Talhões",
    helper:
      "Gerencie as áreas de cultivo vinculadas às propriedades e acompanhe cada talhão com clareza.",
    image: "/images/headers/desktop/talhoes-desktop.jpeg",
    mobileImage: "/images/headers/mobile/talhoes-mobile.jpeg",
  },
  monitoramentos: {
    title: "Coletas de campo",
    helper:
      "Registre observações, fase da cultura, imagens, localização e situação da lavoura.",
    image: "/images/headers/desktop/monitoramento.jpeg",
    mobileImage: "/images/headers/mobile/monitoramentos-mobile.png",
  },
  alertas: {
    title: "Alertas",
    helper:
      "Acompanhe situações que exigem atenção e priorize ações no campo com mais segurança.",
    image: "/images/headers/desktop/alertas-desktop.jpeg",
    mobileImage: "/images/headers/mobile/alertas-mobile.jpeg",
  },
  relatorios: {
    title: "Relatórios",
    helper:
      "Consulte análises organizadas, diagnósticos, PDFs e informações importantes da lavoura.",
    image: "/images/headers/desktop/relatorios-desktop.jpeg",
    mobileImage: "/images/headers/mobile/relatorios-mobile.png",
  },
  base: {
    title: "Base Técnica",
    helper:
      "Organize fontes confiáveis que apoiam diagnósticos, relatórios e análises da lavoura.",
    image: "/images/headers/desktop/base-tecnica-desktop.jpeg",
    mobileImage: "/images/headers/mobile/base-tecnica-mobile.png",
  },
  sobre: {
    title: "",
    helper: "",
    image: "/images/headers/desktop/sobre-desktop.jpeg",
    mobileImage: "/images/headers/mobile/sobre-mobile.png",
  },
};

export function findCurrentNavItem(pathname: string): AppNavItem {
  if (pathname === "/") {
    return appNavItems[0];
  }

  const found = appNavItems.find((item) =>
    item.path === "/" ? pathname === "/" : pathname.startsWith(item.path),
  );

  return found ?? appNavItems[0];
}