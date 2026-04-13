import type { SubscriptionProviderEvent } from "@/lib/api";

function formatDatePtBr(value?: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

type SubscriptionProviderEventsListProps = {
  events: SubscriptionProviderEvent[];
};

export default function SubscriptionProviderEventsList({ events }: SubscriptionProviderEventsListProps) {
  if (!events.length) {
    return (
      <div className="glass rounded-lg p-5 text-muted-foreground">
        Nenhum evento do provedor encontrado para esta assinatura.
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-5 space-y-3">
      <p className="font-heading text-lg font-semibold">Eventos do provedor</p>
      <div className="space-y-2">
        {events.map((event, index) => (
          <div key={`${event.id || "event"}-${index}`} className="rounded-md border border-border/70 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">tipo:</span> {event.type || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">status:</span> {event.status || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">data:</span> {formatDatePtBr(event.date)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
