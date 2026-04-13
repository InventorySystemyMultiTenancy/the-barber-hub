import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/lib/api";

function formatMoney(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value || 0);
}

function formatRecurrence(plan: SubscriptionPlan) {
  if (!plan.frequency || !plan.frequencyType) return "Recorrencia nao informada";
  const unit = plan.frequencyType === "months" ? (plan.frequency > 1 ? "meses" : "mes") : plan.frequency > 1 ? "dias" : "dia";
  return `A cada ${plan.frequency} ${unit}`;
}

type SubscriptionPlansListProps = {
  plans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
  selectedPlanId: string;
  onSelect: (plan: SubscriptionPlan) => void;
  onRetry?: () => void;
};

export default function SubscriptionPlansList({
  plans,
  loading,
  error,
  selectedPlanId,
  onSelect,
  onRetry,
}: SubscriptionPlansListProps) {
  if (loading) {
    return (
      <div className="glass rounded-lg p-6 text-muted-foreground">
        Carregando planos de assinatura...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-lg p-6 space-y-3">
        <p className="text-destructive">Nao foi possivel carregar os planos ativos.</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        ) : null}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="glass rounded-lg p-6 text-muted-foreground">
        Nenhum plano ativo encontrado no momento.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {plans.map((plan) => {
        const planId = String(plan.preapprovalPlanId || plan.id || "");
        const isSelected = selectedPlanId === planId;

        return (
          <div
            key={planId || plan.id}
            className={`rounded-lg border p-4 transition-all ${
              isSelected ? "border-primary bg-primary/10" : "border-border/70 bg-card"
            }`}
          >
            <p className="font-heading text-lg font-semibold">{plan.name || "Plano"}</p>
            <p className="text-sm text-muted-foreground mt-1">{plan.description || "Sem descricao"}</p>
            <p className="text-xl font-bold mt-3">{formatMoney(plan.transactionAmount, plan.currencyId || "BRL")}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatRecurrence(plan)}</p>

            <Button
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="mt-3 w-full"
              onClick={() => onSelect(plan)}
            >
              {isSelected ? "Selecionado" : "Escolher"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
