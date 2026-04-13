import type { SubscriptionInfo } from "@/lib/api";
import { subscriptionStatusMessage } from "@/hooks/use-subscription";

function formatMoney(value?: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDatePtBr(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

interface SubscriptionStatusCardProps {
  subscription: SubscriptionInfo;
}

export default function SubscriptionStatusCard({ subscription }: SubscriptionStatusCardProps) {
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
        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{subscription.status}</span>
      </div>

      <p className="text-sm text-muted-foreground">{subscriptionStatusMessage(subscription.status)}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <p>
          <span className="text-muted-foreground">provider_status:</span> {subscription.providerStatus || "-"}
        </p>
        <p>
          <span className="text-muted-foreground">proximo pagamento:</span> {formatDatePtBr(subscription.nextPaymentDate)}
        </p>
        <p>
          <span className="text-muted-foreground">plano:</span> {subscription.preapprovalPlanId || "-"}
        </p>
        <p>
          <span className="text-muted-foreground">valor:</span> {formatMoney(subscription.transactionAmount)}
        </p>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>subscription.id: {subscription.id || "-"}</p>
        <p>subscription.mp_preapproval_id: {subscription.mpPreapprovalId || "-"}</p>
      </div>
    </div>
  );
}
