import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import "./DashboardPage.css";

import CriticalAlertsPanel from "@/components/dashboard/CriticalAlertsPanel";
import DashboardHeroPanel from "@/components/dashboard/DashboardHeroPanel";
import DashboardInsightCards from "@/components/dashboard/DashboardInsightCards";
import DashboardGuideCard from "@/components/dashboard/DashboardGuideCard";
import DashboardMapPanel, {
  type MapaResponse,
} from "@/components/dashboard/DashboardMapPanel";
import DashboardWeatherCard from "@/components/dashboard/DashboardWeatherCard";
import PermissionStatusCard, {
  countHealthyPermissions,
  defaultPermissionState,
  mapNotificationPermission,
  type PermissionStateMap,
} from "@/components/dashboard/PermissionStatusCard";
import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";
import RecentMonitoringsPanel from "@/components/dashboard/RecentMonitoringsPanel";
import http from "@/services/http";

type Tone = "green" | "amber" | "red" | "blue";

type SummaryCard = {
  title: string;
  value: string;
  hint: string;
  tone: Tone;
};

type DashboardResumo = {
  total_propriedades: number;
  total_talhoes: number;
  total_monitoramentos: number;
  total_relatorios: number;
  total_alertas_criticos: number;
};

type DistribuicaoNivelAtencao = {
  baixo: number;
  medio: number;
  alto: number;
  critico: number;
};

type DistribuicaoRisco = {
  baixo: number;
  moderado: number;
  alto: number;
  critico: number;
};

type FilaImagemIA = {
  nao_enviada: number;
  pendente: number;
  processando: number;
  concluida: number;
  erro: number;
};

type MonitoramentoRecente = {
  id: number;
  talhao_nome: string;
  data_observacao: string;
  estadio_fenologico_display: string;
  nivel_atencao_display: string;
  faixa_risco_display: string;
  prioridade_operacional_display: string;
  resumo_diagnostico: string;
};

type AlertaCritico = {
  id: number;
  talhao_nome: string | null;
  data_observacao: string;
  nivel_atencao_display: string;
  faixa_risco_display: string;
  prioridade_operacional_display: string;
  resumo_diagnostico: string;
  justificativa_risco: string;
};

type DashboardResponse = {
  escopo_agronomico: string;
  resumo: DashboardResumo;
  distribuicao_nivel_atencao: DistribuicaoNivelAtencao;
  distribuicao_risco: DistribuicaoRisco;
  fila_imagem_ia: FilaImagemIA;
  monitoramentos_recentes: MonitoramentoRecente[];
  relatorios_recentes: unknown[];
  alertas_criticos: AlertaCritico[];
  gerado_em: string;
};

type TourTheme =
  | "emerald"
  | "teal"
  | "slate"
  | "blue"
  | "orange"
  | "red"
  | "violet";

type TourStep = {
  id: string;
  stepLabel: string;
  title: string;
  subtitle: string;
  description: string;
  hint: string;
  theme: TourTheme;
  badges: string[];
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
};

type ClimaDados = {
  temperatura?: number;
  sensacao_termica?: number;
  temperatura_min?: number;
  temperatura_max?: number;
  umidade?: number;
  pressao?: number;
  descricao?: string;
  icone?: string;
  vento_velocidade?: number;
  chuva_mm?: number;
  cidade?: string;
  pais?: string;
  timestamp?: string;
};

type ClimaResponse = {
  monitoramento_id: number;
  escopo_agronomico: string;
  talhao: string;
  clima: ClimaDados | null;
  clima_status: boolean;
  clima_erro: string | null;
};

const GUIDE_COMPLETED_KEY = "espiagro.dashboard.guide.completed";
const GUIDE_DISMISSED_KEY = "espiagro.dashboard.guide.dismissed";

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    stepLabel: "1 de 7",
    title: "Bem-vindo ao EspIAgro",
    subtitle: "Seu painel de acompanhamento da lavoura",
    description:
      "Aqui você acompanha propriedades, talhões, coletas de campo, alertas, clima, mapa e relatórios em um só lugar.",
    hint: "Este guia apresenta o caminho recomendado para começar a usar o app com segurança e organização.",
    theme: "emerald",
    badges: ["Visão geral", "Campo organizado", "Decisão com clareza"],
  },
  {
    id: "setup",
    stepLabel: "2 de 7",
    title: "Comece pela propriedade e pelos talhões",
    subtitle: "Organize a base da sua lavoura",
    description:
      "Cadastre a propriedade e depois divida a área em talhões. Essa estrutura ajuda o app a mostrar informações mais claras sobre cada parte da lavoura.",
    hint: "Com a base bem organizada, as coletas e os relatórios ficam mais úteis para o manejo.",
    theme: "teal",
    badges: ["Propriedade", "Talhões", "Área acompanhada"],
    primaryLabel: "Cadastrar propriedade",
    primaryTo: "/propriedades",
    secondaryLabel: "Cadastrar talhão",
    secondaryTo: "/talhoes",
  },
  {
    id: "permissions",
    stepLabel: "3 de 7",
    title: "Ative os recursos do celular",
    subtitle: "Localização, câmera e notificações",
    description:
      "Permita o uso da localização para registrar pontos no campo, da câmera para imagens da lavoura e das notificações para receber avisos importantes.",
    hint: "Esses recursos melhoram a precisão dos registros e tornam o uso no campo mais completo.",
    theme: "blue",
    badges: ["Localização", "Câmera", "Avisos"],
    primaryLabel: "Ver alertas",
    primaryTo: "/alertas",
    secondaryLabel: "Abrir base técnica",
    secondaryTo: "/base-tecnica",
  },
  {
    id: "field",
    stepLabel: "4 de 7",
    title: "Registre coletas de campo",
    subtitle: "Acompanhe a lavoura durante o ciclo",
    description:
      "Em cada coleta, registre o talhão, a data, o estádio fenológico, as condições observadas, possíveis anomalias, imagens e observações relevantes.",
    hint: "Coletas frequentes ajudam a entender melhor a evolução da lavoura e identificar pontos de atenção mais cedo.",
    theme: "slate",
    badges: ["Estádio fenológico", "Observações", "Imagens"],
    primaryLabel: "Abrir monitoramento",
    primaryTo: "/monitoramentos",
  },
  {
    id: "offline",
    stepLabel: "5 de 7",
    title: "Use o app também no campo",
    subtitle: "Pensado para a realidade rural",
    description:
      "O EspIAgro foi pensado para apoiar o trabalho em áreas rurais, inclusive em situações de conexão limitada. Quando houver sincronização disponível, os dados poderão ser atualizados.",
    hint: "Antes de sair para o campo, mantenha o app aberto e confira se a área de trabalho está organizada.",
    theme: "violet",
    badges: ["Uso no campo", "Rotina rural", "Continuidade"],
  },
  {
    id: "analysis",
    stepLabel: "6 de 7",
    title: "Acompanhe alertas e relatórios",
    subtitle: "Transforme registros em informação útil",
    description:
      "Com as coletas registradas, o app ajuda a destacar pontos de atenção, organizar os dados e gerar relatórios para apoiar a tomada de decisão.",
    hint: "Quanto melhores forem os registros de campo, mais úteis serão os alertas e relatórios.",
    theme: "red",
    badges: ["Alertas", "Relatórios", "Apoio à decisão"],
    primaryLabel: "Abrir relatórios",
    primaryTo: "/relatorios",
    secondaryLabel: "Abrir alertas",
    secondaryTo: "/alertas",
  },
  {
    id: "finish",
    stepLabel: "7 de 7",
    title: "Pronto para começar",
    subtitle: "Siga o fluxo recomendado",
    description:
      "Agora você já conhece o caminho principal: cadastre a propriedade, organize os talhões, registre coletas, acompanhe alertas e consulte os relatórios.",
    hint: "Depois de concluir este guia, ele não abrirá automaticamente, mas você poderá acessá-lo novamente pelo painel.",
    theme: "orange",
    badges: ["Primeiros passos", "Rotina de uso", "Guia concluído"],
    primaryLabel: "Começar monitoramento",
    primaryTo: "/monitoramentos",
    secondaryLabel: "Voltar ao painel",
    secondaryTo: "/",
  },
];

function formatNumber(value: number | undefined): string {
  return String(value ?? 0).padStart(2, "0");
}

function getAlertTone(totalAlertasCriticos: number): Tone {
  if (totalAlertasCriticos > 0) {
    return "red";
  }

  return "green";
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<DashboardResponse>({
      queryKey: ["dashboard-monitoramentos"],
      queryFn: async () => {
        const response = await http.get<DashboardResponse>(
          "/monitoramentos/dashboard/",
        );

        return response.data;
      },
    });

  const {
    data: mapaData,
    isLoading: isLoadingMapa,
    isFetching: isFetchingMapa,
  } = useQuery<MapaResponse>({
    queryKey: ["dashboard-mapa"],
    queryFn: async () => {
      const response = await http.get<MapaResponse>("/propriedades/mapa/", {
        params: {
          ativa: true,
          somente_com_poligono: true,
          somente_com_ponto: true,
        },
      });

      return response.data;
    },
  });

  const latestMonitoringId = data?.monitoramentos_recentes?.[0]?.id;

  const { data: climaData, isFetching: isFetchingClima } =
    useQuery<ClimaResponse>({
      queryKey: ["dashboard-clima", latestMonitoringId],
      enabled: Boolean(latestMonitoringId),
      queryFn: async () => {
        const response = await http.get<ClimaResponse>(
          `/monitoramentos/${latestMonitoringId}/clima/`,
        );

        return response.data;
      },
    });

  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [permissionStates, setPermissionStates] =
    useState<PermissionStateMap>(defaultPermissionState);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  const [guideCompleted, setGuideCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(GUIDE_COMPLETED_KEY) === "1";
  });

  const [, setGuideDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(GUIDE_DISMISSED_KEY) === "1";
  });

  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const completed = window.localStorage.getItem(GUIDE_COMPLETED_KEY) === "1";
    const dismissed = window.localStorage.getItem(GUIDE_DISMISSED_KEY) === "1";

    return !completed && !dismissed;
  });

  const closeGuide = useCallback(
    (markAsDismissed: boolean): void => {
      setIsGuideOpen(false);

      if (typeof window === "undefined") {
        return;
      }

      if (markAsDismissed && !guideCompleted) {
        window.localStorage.setItem(GUIDE_DISMISSED_KEY, "1");
        setGuideDismissed(true);
      }
    },
    [guideCompleted],
  );

  const refreshPermissionStates = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const nextState: PermissionStateMap = {
      geolocation: "unsupported",
      notifications: "unsupported",
      camera: "unsupported",
    };

    if ("geolocation" in navigator) {
      nextState.geolocation = "available";
    }

    if ("Notification" in window) {
      nextState.notifications = mapNotificationPermission(
        window.Notification.permission,
      );
    }

    if (
      "mediaDevices" in navigator &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      nextState.camera = "available";
    }

    if ("permissions" in navigator) {
      try {
        const geolocationPermission = await navigator.permissions.query({
          name: "geolocation",
        });

        nextState.geolocation = geolocationPermission.state;
      } catch {
        // Mantém o estado identificado pelo navegador.
      }

      try {
        const notificationsPermission = await navigator.permissions.query({
          name: "notifications",
        });

        nextState.notifications = notificationsPermission.state;
      } catch {
        // Mantém o estado identificado pelo navegador.
      }
    }

    setPermissionStates(nextState);
  }, []);

  useEffect(() => {
    void refreshPermissionStates();
  }, [refreshPermissionStates]);

  useEffect(() => {
    if (!isGuideOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isGuideOpen]);

  useEffect(() => {
    if (!isGuideOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closeGuide(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGuideOpen, closeGuide]);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const resumo = data?.resumo;

    return [
      {
        title: "Propriedades acompanhadas",
        value: formatNumber(resumo?.total_propriedades),
        hint: "Unidades rurais cadastradas para acompanhamento.",
        tone: "green",
      },
      {
        title: "Talhões registrados",
        value: formatNumber(resumo?.total_talhoes),
        hint: "Áreas de manejo organizadas dentro das propriedades.",
        tone: "blue",
      },
      {
        title: "Coletas realizadas",
        value: formatNumber(resumo?.total_monitoramentos),
        hint: "Registros de campo disponíveis para análise.",
        tone: "amber",
      },
      {
        title: "Alertas ativos",
        value: formatNumber(resumo?.total_alertas_criticos),
        hint:
          (resumo?.total_alertas_criticos ?? 0) > 0
            ? "Existem situações que precisam de atenção no campo."
            : "Nenhum alerta importante registrado no momento.",
        tone: getAlertTone(resumo?.total_alertas_criticos ?? 0),
      },
    ];
  }, [data]);

  const healthyPermissions = useMemo(
    () => countHealthyPermissions(permissionStates),
    [permissionStates],
  );

  const recentAlerts = data?.alertas_criticos ?? [];
  const recentMonitorings = data?.monitoramentos_recentes ?? [];
  const currentTourStep = tourSteps[guideStepIndex];
  const isLastTourStep = guideStepIndex === tourSteps.length - 1;

  function openGuide(stepIndex = 0): void {
    setGuideStepIndex(stepIndex);
    setIsGuideOpen(true);
  }

  function goToNextStep(): void {
    setGuideStepIndex((current) => Math.min(current + 1, tourSteps.length - 1));
  }

  function goToPreviousStep(): void {
    setGuideStepIndex((current) => Math.max(current - 1, 0));
  }

  function finishGuide(): void {
    setGuideCompleted(true);
    setGuideDismissed(false);
    setIsGuideOpen(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUIDE_COMPLETED_KEY, "1");
      window.localStorage.removeItem(GUIDE_DISMISSED_KEY);
    }
  }

  async function requestPermissions(): Promise<void> {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    setIsRequestingPermissions(true);

    try {
      if ("geolocation" in navigator) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            },
          );
        });
      }

      if ("Notification" in window) {
        try {
          await window.Notification.requestPermission();
        } catch {
          // O status será atualizado após a tentativa.
        }
      }

      if (
        "mediaDevices" in navigator &&
        typeof navigator.mediaDevices.getUserMedia === "function"
      ) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });

          stream.getTracks().forEach((track) => {
            track.stop();
          });
        } catch {
          // O status será atualizado após a tentativa.
        }
      }
    } finally {
      await refreshPermissionStates();
      setIsRequestingPermissions(false);
    }
  }

  return (
    <>
      <div className="espiagro-dashboard-page">
        <DashboardHeroPanel
          isFetching={isFetching}
          totalMonitoramentos={data?.resumo?.total_monitoramentos}
          totalAlertasCriticos={data?.resumo?.total_alertas_criticos}
          escopoAgronomico={data?.escopo_agronomico}
          healthyPermissions={healthyPermissions}
          isFetchingMapa={isFetchingMapa}
          totalTalhoesComPoligono={mapaData?.resumo?.total_talhoes_com_poligono}
          onRefresh={() => {
            void refetch();
          }}
        />

        <DashboardInsightCards />

        <DashboardSummaryCards cards={summaryCards} />

        <DashboardGuideCard
          isCompleted={guideCompleted}
          onOpenGuide={() => openGuide(0)}
          onDismissGuide={() => closeGuide(true)}
        />

        <PermissionStatusCard
          permissions={permissionStates}
          healthyPermissions={healthyPermissions}
          isRequesting={isRequestingPermissions}
          onRequestPermissions={() => {
            void requestPermissions();
          }}
        />

        <DashboardWeatherCard
          clima={climaData?.clima}
          isFetching={isFetchingClima}
          errorMessage={climaData?.clima_erro}
        />

        <DashboardMapPanel
          mapaData={mapaData}
          isLoading={isLoadingMapa}
          isFetching={isFetchingMapa}
        />

        <section className="espiagro-dual-grid">
          <CriticalAlertsPanel alerts={recentAlerts} />
          <RecentMonitoringsPanel monitorings={recentMonitorings} />
        </section>

        {isLoading ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">Atualizando painel</span>
            <h2>Carregando informações da lavoura</h2>
            <p>
              Aguarde um momento enquanto buscamos os dados mais recentes para o
              acompanhamento.
            </p>
          </section>
        ) : null}

        {isError ? (
          <section className="espiagro-state-card">
            <span className="espiagro-panel-kicker">
              Não foi possível atualizar
            </span>
            <h2>O painel não carregou agora</h2>
            <p>
              Verifique sua conexão com a internet e tente novamente. Se o
              problema continuar, entre novamente no app.
            </p>

            <div className="espiagro-state-actions">
              <button
                type="button"
                className="espiagro-btn espiagro-btn-retry"
                onClick={() => {
                  void refetch();
                }}
              >
                Tentar novamente
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {isGuideOpen && currentTourStep ? (
        <div
          className="espiagro-tour-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="espiagro-tour-title"
        >
          <div className="espiagro-tour-card" data-theme={currentTourStep.theme}>
            <div className="espiagro-tour-topline">
              <span className="espiagro-tour-step">
                {currentTourStep.stepLabel}
              </span>

              <button
                type="button"
                className="espiagro-tour-close"
                onClick={() => closeGuide(true)}
              >
                Fechar
              </button>
            </div>

            <div className="espiagro-tour-header">
              <span className="espiagro-tour-subtitle">
                {currentTourStep.subtitle}
              </span>

              <h2 id="espiagro-tour-title">{currentTourStep.title}</h2>

              <p className="espiagro-tour-description">
                {currentTourStep.description}
              </p>
            </div>

            <div className="espiagro-tour-hint">{currentTourStep.hint}</div>

            <div className="espiagro-tour-badges">
              {currentTourStep.badges.map((badge) => (
                <span key={badge} className="espiagro-tour-badge">
                  {badge}
                </span>
              ))}
            </div>

            <div className="espiagro-tour-progress">
              <div className="espiagro-tour-progress-track">
                <div
                  className="espiagro-tour-progress-bar"
                  style={{
                    width: `${((guideStepIndex + 1) / tourSteps.length) * 100}%`,
                  }}
                />
              </div>

              <span className="espiagro-tour-progress-label">
                Etapa {guideStepIndex + 1} de {tourSteps.length}
              </span>
            </div>

            <div className="espiagro-tour-actions">
              <div className="espiagro-tour-actions-left">
                {guideStepIndex > 0 ? (
                  <button
                    type="button"
                    className="espiagro-tour-btn espiagro-tour-btn-ghost"
                    onClick={goToPreviousStep}
                  >
                    Voltar
                  </button>
                ) : null}

                {!guideCompleted ? (
                  <button
                    type="button"
                    className="espiagro-tour-btn espiagro-tour-btn-secondary"
                    onClick={() => closeGuide(true)}
                  >
                    Ver depois
                  </button>
                ) : null}
              </div>

              <div className="espiagro-tour-actions-right">
                {currentTourStep.secondaryLabel &&
                currentTourStep.secondaryTo ? (
                  <NavLink
                    to={currentTourStep.secondaryTo}
                    className="espiagro-tour-btn espiagro-tour-btn-secondary"
                    onClick={() => closeGuide(false)}
                  >
                    {currentTourStep.secondaryLabel}
                  </NavLink>
                ) : null}

                {currentTourStep.primaryLabel && currentTourStep.primaryTo ? (
                  <NavLink
                    to={currentTourStep.primaryTo}
                    className="espiagro-tour-btn espiagro-tour-btn-secondary"
                    onClick={() => closeGuide(false)}
                  >
                    {currentTourStep.primaryLabel}
                  </NavLink>
                ) : null}

                {isLastTourStep ? (
                  <button
                    type="button"
                    className="espiagro-tour-btn espiagro-tour-btn-primary"
                    onClick={finishGuide}
                  >
                    Concluir guia
                  </button>
                ) : (
                  <button
                    type="button"
                    className="espiagro-tour-btn espiagro-tour-btn-primary"
                    onClick={goToNextStep}
                  >
                    Próxima etapa
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}