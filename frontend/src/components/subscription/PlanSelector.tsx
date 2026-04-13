import { Button } from "@/components/ui/button";

export type PlanOption = {
  key: string;
  title: string;
  description: string;
  preapprovalPlanId?: string;
  amount: number;
  reason?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

interface PlanSelectorProps {
  plans: PlanOption[];
  selectedPlanKey: string;
  onSelect: (key: string) => void;
}

export default function PlanSelector({ plans, selectedPlanKey, onSelect }: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {plans.map((plan) => {
        const isSelected = selectedPlanKey === plan.key;
        return (
          <div
            key={plan.key}
            className={`rounded-lg border p-4 transition-all ${
              isSelected ? "border-primary bg-primary/10" : "border-border/70 bg-card"
            }`}
          >
            <p className="font-heading text-lg font-semibold">{plan.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            <p className="text-xl font-bold mt-3">{formatMoney(plan.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {plan.preapprovalPlanId ? "Plano configurado" : "Informe o preapproval_plan_id"}
            </p>
            <Button
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="mt-3 w-full"
              onClick={() => onSelect(plan.key)}
            >
              {isSelected ? "Selecionado" : "Escolher"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
