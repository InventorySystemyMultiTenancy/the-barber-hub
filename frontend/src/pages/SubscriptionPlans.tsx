import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SubscriptionPlansList from "@/components/subscription/SubscriptionPlansList";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { getFriendlyErrorMessage, type SubscriptionPlan } from "@/lib/api";
import { saveSelectedSubscriptionPlan } from "@/lib/subscriptionPlanSelection";

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { plans, loading: plansLoading, error: plansError, reload } = useSubscriptionPlans();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (selectedPlan) return;
    if (!plans.length) return;
    setSelectedPlan(plans[0]);
  }, [plans, selectedPlan]);

  const selectedPlanId = useMemo(
    () => String(selectedPlan?.preapprovalPlanId || selectedPlan?.id || ""),
    [selectedPlan],
  );

  if (!user && authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando autenticacao...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16 space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Escolha seu plano</h1>
          <p className="text-muted-foreground mt-1">Selecione um plano ativo do catalogo para seguir ao checkout.</p>
        </div>

        <SubscriptionPlansList
          plans={plans}
          loading={plansLoading}
          error={plansError ? getFriendlyErrorMessage(plansError) : null}
          selectedPlanId={selectedPlanId}
          onSelect={(plan) => {
            setSelectedPlan(plan);
            saveSelectedSubscriptionPlan(plan);
            navigate("/assinatura/checkout");
          }}
          onRetry={() => {
            void reload();
          }}
        />
      </div>
    </div>
  );
}
