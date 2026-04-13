import type { SubscriptionAttempt, SubscriptionProviderEvent } from "@/lib/api";

type StatusHistoryItem = {
  id: string;
  source: "attempt" | "provider_event";
  type?: string;
  status?: string;
  providerStatus?: string;
  message?: string;
  createdAt?: string;
};

function formatDatePtBr(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
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

type SubscriptionStatusHistoryListProps = {
  items: StatusHistoryItem[];
};

export function mapAttemptToStatusHistoryItem(attempt: SubscriptionAttempt, index: number): StatusHistoryItem {
  return {
    id: String(attempt.id || `attempt-${index}`),
    source: "attempt",
    type: "attempt_status",
    status: attempt.status,
    providerStatus: attempt.providerStatus,
    message: attempt.message,
    createdAt: attempt.createdAt || attempt.paymentDate,
  };
}

export function mapProviderEventToStatusHistoryItem(event: SubscriptionProviderEvent, index: number): StatusHistoryItem {
  return {
    id: String(event.id || `provider-event-${index}`),
    source: "provider_event",
    type: event.type,
    status: event.status,
    message: event.message,
    createdAt: event.createdAt || event.date,
  };
}

export default function SubscriptionStatusHistoryList({ items }: SubscriptionStatusHistoryListProps) {
  if (!items.length) {
    return (
      <div className="glass rounded-lg p-5 text-muted-foreground">
        Nenhuma mudanca de status registrada ate o momento.
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return (
    <div className="glass rounded-lg p-5 space-y-3">
      <p className="font-heading text-lg font-semibold">Historico de status</p>
      <div className="space-y-2">
        {sortedItems.map((item, index) => (
          <div key={`${item.id}-${index}`} className="rounded-md border border-border/70 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">tipo:</span> {item.type || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">status:</span> {translateStatus(item.status)}
            </p>
            {item.providerStatus ? (
              <p>
                <span className="text-muted-foreground">provider_status:</span> {translateStatus(item.providerStatus)}
              </p>
            ) : null}
            {item.message ? (
              <p>
                <span className="text-muted-foreground">mensagem:</span> {item.message}
              </p>
            ) : null}
            <p>
              <span className="text-muted-foreground">data:</span> {formatDatePtBr(item.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
