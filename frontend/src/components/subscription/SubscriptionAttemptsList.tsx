import type { SubscriptionAttempt } from "@/lib/api";

function formatMoney(value?: number, currency = "BRL") {
  if (!value) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDatePtBr(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

type SubscriptionAttemptsListProps = {
  attempts: SubscriptionAttempt[];
};

export default function SubscriptionAttemptsList({ attempts }: SubscriptionAttemptsListProps) {
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
              <span className="text-muted-foreground">status:</span> {attempt.status || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">provider_status:</span> {attempt.providerStatus || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">valor:</span> {formatMoney(attempt.amount, attempt.currencyId || "BRL")}
            </p>
            <p>
              <span className="text-muted-foreground">data:</span> {formatDatePtBr(attempt.paymentDate)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
