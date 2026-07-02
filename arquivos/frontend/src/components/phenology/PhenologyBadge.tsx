import "./PhenologyBadge.css";

type PhenologyBadgeVariant = "card" | "compact" | "inline";

type PhenologyBadgeProps = {
  code?: string | null;
  label?: string | null;
  variant?: PhenologyBadgeVariant;
  showSupportText?: boolean;
  className?: string;
};

function normalizePhenologyCode(code?: string | null): string {
  return code?.trim().toUpperCase() ?? "";
}

function getPhenologyClearName(code?: string | null, label?: string | null): string {
  const normalizedCode = normalizePhenologyCode(code);

  if (!normalizedCode) {
    return "Fase não registrada";
  }

  if (normalizedCode === "VE") {
    return "Emergência";
  }

  if (["V1", "V2", "V3"].includes(normalizedCode)) {
    return "Início do crescimento vegetativo";
  }

  if (["V4", "V5", "V6", "V7", "V8"].includes(normalizedCode)) {
    return "Crescimento vegetativo";
  }

  if (normalizedCode === "VT") {
    return "Pendoamento";
  }

  if (normalizedCode.startsWith("V")) {
    return "Crescimento avançado";
  }

  if (normalizedCode === "R1") {
    return "Florescimento";
  }

  if (["R2", "R3", "R4", "R5", "R6"].includes(normalizedCode)) {
    return "Formação e enchimento de grãos";
  }

  return label?.trim() || normalizedCode;
}

function getPhenologySupportText(code?: string | null): string {
  const normalizedCode = normalizePhenologyCode(code);

  if (!normalizedCode) {
    return "Complete a fase da cultura para melhorar o acompanhamento do talhão.";
  }

  if (normalizedCode === "VE") {
    return "Acompanhe a emergência e a uniformidade inicial das plantas.";
  }

  if (["V1", "V2", "V3"].includes(normalizedCode)) {
    return "Observe o estabelecimento inicial e possíveis falhas no estande.";
  }

  if (normalizedCode.startsWith("V")) {
    return "Acompanhe o desenvolvimento vegetativo e as condições do talhão.";
  }

  if (normalizedCode === "R1") {
    return "Fase sensível. Acompanhe com atenção as condições do talhão.";
  }

  if (normalizedCode.startsWith("R")) {
    return "Acompanhe a formação dos grãos e possíveis pontos de atenção.";
  }

  return "Acompanhe a fase informada junto com os demais dados da coleta.";
}

function getPhenologyTone(code?: string | null): string {
  const normalizedCode = normalizePhenologyCode(code);

  if (!normalizedCode) {
    return "neutral";
  }

  if (normalizedCode === "VE") {
    return "early";
  }

  if (normalizedCode.startsWith("V")) {
    return "vegetative";
  }

  if (normalizedCode === "R1") {
    return "flowering";
  }

  if (normalizedCode.startsWith("R")) {
    return "reproductive";
  }

  return "neutral";
}

export default function PhenologyBadge({
  code,
  label,
  variant = "card",
  showSupportText = false,
  className = "",
}: PhenologyBadgeProps) {
  const normalizedCode = normalizePhenologyCode(code);
  const displayLabel = label?.trim() || normalizedCode || "Não informado";
  const clearName = getPhenologyClearName(normalizedCode, label);
  const supportText = getPhenologySupportText(normalizedCode);
  const tone = getPhenologyTone(normalizedCode);

  return (
    <div
      className={`espiagro-phenology-badge espiagro-phenology-badge-${variant} espiagro-phenology-tone-${tone} ${className}`.trim()}
    >
      <div className="espiagro-phenology-badge-topline">
        <span className="espiagro-phenology-badge-label">Fase da cultura</span>

        <span className="espiagro-phenology-badge-code">
          {normalizedCode || "--"}
        </span>
      </div>

      <strong className="espiagro-phenology-badge-title">{clearName}</strong>

      {showSupportText ? (
        <small className="espiagro-phenology-badge-description">
          {normalizedCode ? `${displayLabel} • ${supportText}` : supportText}
        </small>
      ) : null}
    </div>
  );
}
