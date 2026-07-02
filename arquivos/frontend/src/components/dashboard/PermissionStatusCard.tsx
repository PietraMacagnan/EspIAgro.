/* eslint-disable react-refresh/only-export-components */

export type PermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "available"
  | "unsupported";

export type PermissionStateMap = {
  geolocation: PermissionStatus;
  notifications: PermissionStatus;
  camera: PermissionStatus;
};

type PermissionKey = keyof PermissionStateMap;

type PermissionStatusCardProps = {
  permissions: PermissionStateMap;
  healthyPermissions: number;
  isRequesting: boolean;
  onRequestPermissions: () => void;
};

export const defaultPermissionState: PermissionStateMap = {
  geolocation: "unsupported",
  notifications: "unsupported",
  camera: "unsupported",
};

export function mapNotificationPermission(
  permission: NotificationPermission,
): PermissionStatus {
  if (permission === "granted") {
    return "granted";
  }

  if (permission === "denied") {
    return "denied";
  }

  return "prompt";
}

export function countHealthyPermissions(permissions: PermissionStateMap): number {
  return Object.values(permissions).filter(
    (status) => status === "granted" || status === "available",
  ).length;
}

function getPermissionLabel(status: PermissionStatus): string {
  switch (status) {
    case "granted":
      return "Ativo";
    case "denied":
      return "Bloqueado";
    case "prompt":
      return "Aguardando autorização";
    case "available":
      return "Disponível";
    case "unsupported":
      return "Não compatível";
    default:
      return "Não identificado";
  }
}

function getPermissionToneClass(status: PermissionStatus): string {
  switch (status) {
    case "granted":
      return "success";
    case "denied":
      return "danger";
    case "prompt":
      return "warning";
    case "available":
      return "info";
    case "unsupported":
      return "neutral";
    default:
      return "neutral";
  }
}

function getPermissionDescription(
  kind: PermissionKey,
  status: PermissionStatus,
): string {
  if (kind === "geolocation") {
    switch (status) {
      case "granted":
        return "A localização está ativa para registrar pontos de campo e melhorar a visualização no mapa.";
      case "denied":
        return "A localização está bloqueada. Isso pode limitar registros com ponto no mapa.";
      case "prompt":
        return "A localização ainda precisa ser autorizada no primeiro uso.";
      case "available":
        return "O celular permite usar localização quando uma coleta de campo precisar desse recurso.";
      case "unsupported":
        return "Este aparelho não informou suporte confiável para localização.";
      default:
        return "Não foi possível identificar o estado da localização.";
    }
  }

  if (kind === "notifications") {
    switch (status) {
      case "granted":
        return "As notificações estão ativas para receber avisos importantes da lavoura.";
      case "denied":
        return "As notificações estão bloqueadas nas configurações do aparelho ou do app.";
      case "prompt":
        return "As notificações ainda precisam ser autorizadas para envio de avisos.";
      case "available":
        return "O aparelho permite notificações quando esse recurso for ativado.";
      case "unsupported":
        return "Este ambiente não permite receber notificações do app.";
      default:
        return "Não foi possível identificar o estado das notificações.";
    }
  }

  switch (status) {
    case "granted":
      return "A câmera está ativa para registrar imagens e evidências da lavoura.";
    case "denied":
      return "A câmera está bloqueada. Isso pode impedir o envio de imagens de campo.";
    case "prompt":
      return "A câmera ainda precisa ser autorizada ao anexar uma imagem.";
    case "available":
      return "A câmera está disponível para uso quando uma coleta exigir imagem.";
    case "unsupported":
      return "Este aparelho não informou suporte adequado para câmera.";
    default:
      return "Não foi possível identificar o estado da câmera.";
  }
}

const permissionCards: Array<{
  key: PermissionKey;
  kicker: string;
  title: string;
}> = [
  {
    key: "geolocation",
    kicker: "Localização",
    title: "Pontos no mapa",
  },
  {
    key: "notifications",
    kicker: "Avisos",
    title: "Notificações da lavoura",
  },
  {
    key: "camera",
    kicker: "Imagem",
    title: "Fotos de campo",
  },
];

export default function PermissionStatusCard({
  permissions,
  healthyPermissions,
  isRequesting,
  onRequestPermissions,
}: PermissionStatusCardProps) {
  return (
    <section className="espiagro-section-card">
      <div className="espiagro-section-header">
        <div>
          <span className="espiagro-panel-kicker">Recursos do celular</span>

          <h3>Localização, avisos e câmera</h3>

          <p>
            Ative os recursos do aparelho para registrar coletas com mais
            precisão, anexar imagens da lavoura e receber avisos importantes.
          </p>
        </div>

        <div className="espiagro-chip-row">
          <span className="espiagro-chip espiagro-chip-soft">
            Recursos disponíveis: {healthyPermissions}/3
          </span>

          <button
            type="button"
            className="espiagro-btn espiagro-btn-ghost"
            disabled={isRequesting}
            onClick={onRequestPermissions}
          >
            {isRequesting ? "Ativando..." : "Ativar recursos"}
          </button>
        </div>
      </div>

      <div className="espiagro-permission-grid">
        {permissionCards.map((item) => {
          const status = permissions[item.key];

          return (
            <article key={item.key} className="espiagro-permission-card">
              <span className="espiagro-panel-kicker">{item.kicker}</span>

              <h3>{item.title}</h3>

              <p>{getPermissionDescription(item.key, status)}</p>

              <div
                className={`espiagro-permission-status ${getPermissionToneClass(
                  status,
                )}`}
              >
                {getPermissionLabel(status)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}