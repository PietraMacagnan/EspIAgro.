import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import AppShell from "@/layouts/AppShell";
import AlertasPage from "@/pages/AlertasPage";
import BaseTecnicaPage from "@/pages/BaseTecnicaPage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import MapaPage from "@/pages/MapaPage";
import MonitoramentosPage from "@/pages/MonitoramentosPage";
import NotFoundPage from "@/pages/NotFoundPage";
import RelatoriosPage from "@/pages/RelatoriosPage";
import SobrePage from "@/pages/SobrePage";
import PropriedadesPage from "@/pages/PropriedadesPage";
import TalhoesPage from "@/pages/TalhoesPage";
import { isAuthenticated } from "@/services/auth";

function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="mapa" element={<MapaPage />} />
          <Route path="monitoramentos" element={<MonitoramentosPage />} />
          <Route path="propriedades" element={<PropriedadesPage />} />
          <Route path="talhoes" element={<TalhoesPage />} />
          <Route path="alertas" element={<AlertasPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="base-tecnica" element={<BaseTecnicaPage />} />
          <Route path="sobre" element={<SobrePage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}