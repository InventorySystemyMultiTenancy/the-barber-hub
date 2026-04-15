export type SubscriptionStateInput = {
  status?: string | null;
  is_active?: boolean | null;
  isActive?: boolean | null;
  is_canceled?: boolean | null;
  isCanceled?: boolean | null;
  subscription_state?: string | null;
  subscriptionState?: string | null;
};

export type SubscriptionBadgeColor = "success" | "danger" | "neutral";

export type SubscriptionStateResult = {
  isActive: boolean;
  isCanceled: boolean;
  label: "Ativa" | "Cancelada" | "Desconhecida";
  color: SubscriptionBadgeColor;
};

function normalizeStatus(status?: string | null) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "active") return "authorized";
  if (normalized === "cancelled") return "canceled";
  if (normalized === "authorized" || normalized === "pending" || normalized === "paused" || normalized === "canceled" || normalized === "unknown") {
    return normalized;
  }
  return "unknown";
}

function normalizeState(state?: string | null) {
  const normalized = String(state || "").trim().toLowerCase();
  if (normalized === "ativa" || normalized === "cancelada" || normalized === "desconhecida") {
    return normalized;
  }
  return "desconhecida";
}

export function getSubscriptionState(subscription?: SubscriptionStateInput | null): SubscriptionStateResult {
  const normalizedStatus = normalizeStatus(subscription?.status);
  const normalizedState = normalizeState(subscription?.subscription_state ?? subscription?.subscriptionState);

  const hasIsActive = subscription?.is_active !== undefined || subscription?.isActive !== undefined;
  const hasIsCanceled = subscription?.is_canceled !== undefined || subscription?.isCanceled !== undefined;

  const fallbackIsActive = normalizedStatus !== "canceled" && normalizedStatus !== "unknown";
  const fallbackIsCanceled = normalizedStatus === "canceled";

  const isCanceled = hasIsCanceled
    ? Boolean(subscription?.is_canceled ?? subscription?.isCanceled)
    : normalizedState === "cancelada"
      ? true
      : fallbackIsCanceled;

  const isActive = hasIsActive
    ? Boolean(subscription?.is_active ?? subscription?.isActive)
    : normalizedState === "ativa"
      ? true
      : fallbackIsActive;

  if (isCanceled) {
    return { isActive: false, isCanceled: true, label: "Cancelada", color: "danger" };
  }

  if (isActive) {
    return { isActive: true, isCanceled: false, label: "Ativa", color: "success" };
  }

  return { isActive: false, isCanceled: false, label: "Desconhecida", color: "neutral" };
}
