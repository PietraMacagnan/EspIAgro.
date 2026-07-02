import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import DeleteAccountModal from "@/components/account/DeleteAccountModal";
import AppFooter from "@/components/layout/AppFooter";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import MobileBottomNavigation from "@/components/layout/MobileBottomNavigation";
import TopHeader from "@/components/layout/TopHeader";
import {
  findCurrentNavItem,
  pageSupportContent,
} from "@/config/appNavigation";
import { deleteAccount, logout } from "@/services/auth";
import http from "@/services/http";

import "@/styles/app-ui.css";
import "./AppShell.css";

type DashboardMonitoramentoRecente = {
  id: number;
};

type DashboardHeaderResponse = {
  monitoramentos_recentes?: DashboardMonitoramentoRecente[];
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

function formatTemperature(value?: number): string {
  if (typeof value !== "number") {
    return "--°C";
  }

  return `${Math.round(value)}°C`;
}

function formatHumidity(value?: number): string {
  if (typeof value !== "number") {
    return "--%";
  }

  return `${Math.round(value)}%`;
}

function formatWind(value?: number): string {
  if (typeof value !== "number") {
    return "-- m/s";
  }

  return `${value.toFixed(1)} m/s`;
}

function formatRain(value?: number): string | undefined {
  if (typeof value !== "number") {
    return undefined;
  }

  return `${value.toFixed(1)} mm`;
}

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Não foi possível concluir a solicitação. Tente novamente.";
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

  if (error.response?.status === 400) {
    return "Verifique as informações preenchidas e tente novamente.";
  }

  if (error.response?.status === 401 || error.response?.status === 403) {
    return "Senha inválida ou sessão expirada. Entre novamente e tente outra vez.";
  }

  if (error.response?.status === 404) {
    return "A exclusão de conta ainda não está disponível no servidor.";
  }

  return "Não foi possível concluir a solicitação. Tente novamente.";
}

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeItem = findCurrentNavItem(location.pathname);
  const activeSupport =
    pageSupportContent[activeItem.key] ?? pageSupportContent.dashboard;

  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const { data: dashboardHeaderData } = useQuery<DashboardHeaderResponse>({
    queryKey: ["appshell-dashboard-header"],
    queryFn: async () => {
      const response = await http.get<DashboardHeaderResponse>(
        "/monitoramentos/dashboard/",
      );

      return response.data;
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const latestMonitoringId =
    dashboardHeaderData?.monitoramentos_recentes?.[0]?.id;

  const { data: climaData, isFetching: isFetchingClima } =
    useQuery<ClimaResponse>({
      queryKey: ["appshell-clima", latestMonitoringId],
      enabled: Boolean(latestMonitoringId),
      queryFn: async () => {
        const response = await http.get<ClimaResponse>(
          `/monitoramentos/${latestMonitoringId}/clima/`,
        );

        return response.data;
      },
      staleTime: 1000 * 60 * 5,
      retry: 1,
    });

  const weather = useMemo(() => {
    if (isFetchingClima) {
      return {
        city: "Atualizando",
        temperature: "--°C",
        condition: "Buscando clima da última coleta...",
        humidity: "--%",
        wind: "-- m/s",
      };
    }

    if (climaData?.clima_status && climaData.clima) {
      return {
        city: climaData.clima.cidade || "Clima atual",
        temperature: formatTemperature(climaData.clima.temperatura),
        condition: climaData.clima.descricao || "Condição atualizada",
        humidity: formatHumidity(climaData.clima.umidade),
        wind: formatWind(climaData.clima.vento_velocidade),
        rain: formatRain(climaData.clima.chuva_mm),
      };
    }

    return {
      city: "Clima indisponível",
      temperature: "--°C",
      condition:
        climaData?.clima_erro ||
        "Clima será exibido quando houver coleta com localização.",
      humidity: "--%",
      wind: "-- m/s",
    };
  }, [climaData, isFetchingClima]);

  function handleLogout(): void {
    logout();
    void navigate("/login", { replace: true });
  }

  function openDeleteAccountModal(): void {
    setDeleteAccountError("");
    setIsDeleteAccountModalOpen(true);
  }

  function closeDeleteAccountModal(): void {
    if (isDeletingAccount) {
      return;
    }

    setIsDeleteAccountModalOpen(false);
    setDeleteAccountError("");
  }

  async function handleConfirmDeleteAccount(payload: {
    password: string;
    confirmationText: string;
  }): Promise<void> {
    try {
      setIsDeletingAccount(true);
      setDeleteAccountError("");

      await deleteAccount({
        password: payload.password,
        confirmation_text: payload.confirmationText,
      });

      setIsDeleteAccountModalOpen(false);
      void navigate("/login", { replace: true });
    } catch (error) {
      setDeleteAccountError(getErrorMessage(error));
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <>
      <div className="espiagro-shell">
        <DesktopSidebar
          onLogout={handleLogout}
          onDeleteAccount={openDeleteAccountModal}
        />

        <main
          className="espiagro-shell-main"
          aria-label="Conteúdo principal do EspIAgro"
        >
          <div className="espiagro-shell-container">
            <TopHeader
              title={activeSupport.title}
              helper={activeSupport.helper}
              image={activeSupport.image}
              mobileImage={activeSupport.mobileImage}
              weather={weather}
            />

            <div className="espiagro-shell-content">
              <Outlet />
            </div>

            <AppFooter />

            <div
              className="espiagro-shell-mobile-safe-area"
              aria-hidden="true"
            />
          </div>
        </main>

        <MobileBottomNavigation
          onLogout={handleLogout}
          onDeleteAccount={openDeleteAccountModal}
        />
      </div>

      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        isSubmitting={isDeletingAccount}
        errorMessage={deleteAccountError}
        onClose={closeDeleteAccountModal}
        onConfirm={handleConfirmDeleteAccount}
      />
    </>
  );
}