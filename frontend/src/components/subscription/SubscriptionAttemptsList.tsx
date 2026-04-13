import type { SubscriptionAttempt, SubscriptionInfo } from "@/lib/api";

function formatCurrency(value: number, currency = "BRL") {
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

function getAttemptBadge(status?: string, providerStatus?: string) {
  const merged = `${String(status || "")} ${String(providerStatus || "")}`.toLowerCase();
  if (merged.includes("approved") || merged.includes("authorized") || merged.includes("paid")) {
    return { label: "aprovado", className: "bg-green-500/20 text-green-500" };
  }
  if (merged.includes("rejected") || merged.includes("refused") || merged.includes("denied") || merged.includes("cancel")) {
    return { label: "recusado", className: "bg-destructive/20 text-destructive" };
  }
  return { label: "pendente", className: "bg-amber-500/20 text-amber-500" };
}

function formatDatePtBr(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

type SubscriptionAttemptsListProps = {
  attempts: SubscriptionAttempt[];
  subscription: Pick<SubscriptionInfo, "currencyId">;
};

export default function SubscriptionAttemptsList({ attempts, subscription }: SubscriptionAttemptsListProps) {
  if (!attempts.length) {
    return (
      <div className="glass rounded-lg p-5 text-muted-foreground">
        Ainda nao houve cobrancas autorizadas para esta assinatura.
      </div>
    );
  }

  const sortedAttempts = [...attempts].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.paymentDate || 0).getTime();
    const dateB = new Date(b.createdAt || b.paymentDate || 0).getTime();
    return dateB - dateA;
  });

  return (
    <div className="glass rounded-lg p-5 space-y-3">
      <p className="font-heading text-lg font-semibold">Historico de cobrancas autorizadas</p>
      <div className="space-y-2">
        {sortedAttempts.map((attempt, index) => (
          <div key={`${attempt.id || "attempt"}-${index}`} className="rounded-md border border-border/70 p-3 text-sm space-y-1">
            {(() => {
              const badge = getAttemptBadge(attempt.status, attempt.providerStatus);
              return <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>;
            })()}
            <p>
              <span className="text-muted-foreground">status:</span> {translateStatus(attempt.status)}
            </p>
            <p>
              <span className="text-muted-foreground">provider_status:</span> {translateStatus(attempt.providerStatus)}
            </p>
            <p>
              <span className="text-muted-foreground">valor:</span> {formatCurrency(Number(attempt.amount || 0), subscription.currencyId || attempt.currencyId || "BRL")}
            </p>
            {attempt.message ? (
              <p>
                <span className="text-muted-foreground">mensagem:</span> {attempt.message}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">data:</span> {formatDatePtBr(attempt.createdAt || attempt.paymentDate)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
