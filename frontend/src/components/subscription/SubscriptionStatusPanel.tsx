import type { SubscriptionInfo } from "@/lib/api";

function formatMoney(value?: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value || 0);
}

function formatDatePtBr(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

export function subscriptionStatusMessage(status: SubscriptionInfo["status"]) {
  const map: Record<SubscriptionInfo["status"], string> = {
    authorized: "Assinatura autorizada e ativa.",
    pending: "Assinatura pendente de confirmacao do provedor.",
    paused: "Assinatura pausada. Verifique os dados de cobranca.",
    canceled: "Assinatura cancelada.",
    unknown: "Status desconhecido no momento.",
  };

  return map[status] || map.unknown;
}

function formatStatusLabel(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  const map: Record<string, string> = {
    approved: "aprovado",
    aproved: "aprovado",
    authorized: "autorizado",
    canceled: "cancelado",
    cancelled: "cancelado",
    pending: "pendente",
    paused: "pausado",
    rejected: "rejeitado",
    unknown: "desconhecido",
  };

  return map[normalized] || value || "-";
}

type SubscriptionStatusPanelProps = {
  subscription: SubscriptionInfo;
  planName?: string;
};

export default function SubscriptionStatusPanel({ subscription, planName }: SubscriptionStatusPanelProps) {
  const badgeClass =
    subscription.status === "authorized"
      ? "bg-green-500/20 text-green-500"
      : subscription.status === "pending"
        ? "bg-amber-500/20 text-amber-500"
        : subscription.status === "paused"
          ? "bg-orange-500/20 text-orange-500"
          : subscription.status === "canceled"
            ? "bg-destructive/20 text-destructive"
            : "bg-muted text-muted-foreground";

  return (
    <div className="glass rounded-lg p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-heading text-lg font-semibold">Minha assinatura</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{formatStatusLabel(subscription.status)}</span>
      </div>

      <p className="text-sm text-muted-foreground">{subscriptionStatusMessage(subscription.status)}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <p>
          <span className="text-muted-foreground">proximo pagamento:</span> {formatDatePtBr(subscription.nextPaymentDate)}
        </p>
        <p>
          <span className="text-muted-foreground">plano:</span> {planName || "Plano nao identificado"}
        </p>
        <p>
          <span className="text-muted-foreground">valor:</span> {formatMoney(subscription.transactionAmount, subscription.currencyId || "BRL")}
        </p>
        <p>
          <span className="text-muted-foreground">recorrencia:</span> {subscription.frequency || "-"} {subscription.frequencyType || "-"}
        </p>
        <p>
          <span className="text-muted-foreground">email:</span> {subscription.email || "-"}
        </p>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>subscription.id: {subscription.id || "-"}</p>
        <p>subscription.mp_preapproval_id: {subscription.mpPreapprovalId || "-"}</p>
      </div>
    </div>
  );
}
