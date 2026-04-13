import type { SubscriptionAttempt, SubscriptionInfo } from "@/lib/api";

function formatCurrency(value: number | null, currency = "BRL") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function translateStatus(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "-";

  const map: Record<string, string> = {
    approved: "aprovado",
    aproved: "aprovado",
    authorized: "autorizado",
    canceled: "cancelado",
    cancelled: "cancelado",
    pending: "pendente",
    paused: "pausado",
    rejected: "rejeitado",
  };

  return map[normalized] || value || "-";
}

function getAttemptDisplayAmount(
  attempt: SubscriptionAttempt,
  subscription: Pick<SubscriptionInfo, "transactionAmount" | "currencyId">,
) {
  const attemptAmount =
    attempt.amount !== null && attempt.amount !== undefined && Number.isFinite(Number(attempt.amount))
      ? Number(attempt.amount)
      : null;

  if (attemptAmount !== null) {
    return { value: attemptAmount, isFallback: false };
  }

  const subscriptionAmount =
    subscription.transactionAmount !== null &&
    subscription.transactionAmount !== undefined &&
    Number.isFinite(Number(subscription.transactionAmount))
      ? Number(subscription.transactionAmount)
      : null;

  if (subscriptionAmount !== null) {
    return { value: subscriptionAmount, isFallback: true };
  }

  return { value: null, isFallback: false };
}

function formatDatePtBr(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

type SubscriptionAttemptsListProps = {
  attempts: SubscriptionAttempt[];
  subscription: Pick<SubscriptionInfo, "transactionAmount" | "currencyId">;
};

export default function SubscriptionAttemptsList({ attempts, subscription }: SubscriptionAttemptsListProps) {
  if (!attempts.length) {
    return (
      <div className="glass rounded-lg p-5 text-muted-foreground">
        Nenhuma tentativa de cobranca registrada.
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-5 space-y-3">
      <p className="font-heading text-lg font-semibold">Tentativas de cobranca</p>
      <div className="space-y-2">
        {attempts.map((attempt, index) => (
          <div key={`${attempt.id || "attempt"}-${index}`} className="rounded-md border border-border/70 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">status:</span> {translateStatus(attempt.status)}
            </p>
            <p>
              <span className="text-muted-foreground">provider_status:</span> {translateStatus(attempt.providerStatus)}
            </p>
            {(() => {
              const amount = getAttemptDisplayAmount(attempt, subscription);
              const currency = subscription.currencyId || attempt.currencyId || "BRL";

              return (
                <p>
                  <span className="text-muted-foreground">valor:</span> {formatCurrency(amount.value, currency)}
                  {amount.isFallback ? <span className="ml-2 text-xs text-muted-foreground">valor do plano</span> : null}
                </p>
              );
            })()}
            <p>
              <span className="text-muted-foreground">data:</span> {formatDatePtBr(attempt.paymentDate)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
