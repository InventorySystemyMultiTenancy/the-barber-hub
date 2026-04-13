import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SubscriptionCheckoutForm from "@/components/subscription/SubscriptionCheckoutForm";
import SubscriptionPlansList from "@/components/subscription/SubscriptionPlansList";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateSubscription } from "@/hooks/useCreateSubscription";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { toast } from "@/hooks/use-toast";
import { createSubscriptionPlan, getFriendlyErrorMessage, type SubscriptionPlan } from "@/lib/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubscriptionCheckout() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { plans, loading: plansLoading, error: plansError, reload } = useSubscriptionPlans();
  const { mutate: createSubscription, loading: createLoading } = useCreateSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [email, setEmail] = useState(user?.email || "");
  const [cardToken, setCardToken] = useState("");
  const [planCreating, setPlanCreating] = useState(false);
  const [planAmount, setPlanAmount] = useState("79.9");
  const [planReason, setPlanReason] = useState("Plano mensal personalizado");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setEmail((current) => current || user?.email || "");
  }, [user?.email]);

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

  const handleTokenReceived = (token: string, tokenEmail: string) => {
    setCardToken(token);
    if (!email && tokenEmail) {
      setEmail(tokenEmail);
    }

    toast({
      title: "Token gerado",
      description: "Token do cartao recebido com sucesso. Agora finalize a assinatura.",
    });
  };

  const handleCreateSubscription = async (event: FormEvent) => {
    event.preventDefault();

    const safeEmail = String(email || "").trim();
    const safePlanId = String(selectedPlan?.preapprovalPlanId || selectedPlan?.id || "").trim();
    const safeToken = String(cardToken || "").trim();

    if (!EMAIL_REGEX.test(safeEmail)) {
      toast({
        title: "Email invalido",
        description: "Informe um email valido para criar a assinatura.",
        variant: "destructive",
      });
      return;
    }

    if (!safePlanId) {
      toast({
        title: "Plano obrigatorio",
        description: "Selecione um plano ativo antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!safeToken) {
      toast({
        title: "Token obrigatorio",
        description: "Gere o token do cartao antes de assinar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const subscription = await createSubscription({
        preapproval_plan_id: safePlanId,
        token: safeToken,
        email: safeEmail,
      });

      toast({
        title: "Assinatura criada",
        description: `Status inicial: ${subscription.status}`,
      });

      navigate("/minha-assinatura?poll=1");
    } catch (error) {
      toast({
        title: "Erro ao criar assinatura",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleCreatePlan = async () => {
    const amount = Number(planAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Valor invalido",
        description: "Informe um valor maior que zero para criar o plano.",
        variant: "destructive",
      });
      return;
    }

    setPlanCreating(true);
    try {
      const plan = await createSubscriptionPlan({
        transaction_amount: amount,
        reason: planReason.trim() || undefined,
        frequency: 1,
        frequency_type: "months",
        currency_id: "BRL",
      });

      await reload();

      toast({
        title: "Plano criado",
        description: `Novo plano criado: ${plan.id}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao criar plano",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setPlanCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16 space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Assinatura mensal</h1>
          <p className="text-muted-foreground mt-1">
            Escolha um plano ativo do backend e conclua a assinatura com token do Mercado Pago.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold">1. Escolha de plano</h2>
          <SubscriptionPlansList
            plans={plans}
            loading={plansLoading}
            error={plansError ? getFriendlyErrorMessage(plansError) : null}
            selectedPlanId={selectedPlanId}
            onSelect={setSelectedPlan}
            onRetry={() => {
              void reload();
            }}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold">2. Pagamento e criacao</h2>
          <SubscriptionCheckoutForm
            selectedPlan={selectedPlan}
            email={email}
            loading={createLoading}
            token={cardToken}
            onEmailChange={setEmail}
            onTokenReceived={handleTokenReceived}
            onCardFormError={(message) =>
              toast({
                title: "Mercado Pago",
                description: message,
                variant: "destructive",
              })
            }
            onSubmit={handleCreateSubscription}
          />
        </section>

        {isAdmin ? (
          <section className="glass rounded-lg p-4 md:p-5 space-y-3">
            <h2 className="font-heading text-xl font-semibold">Admin: criar plano no backend</h2>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={planAmount}
              onChange={(event) => setPlanAmount(event.target.value)}
              placeholder="transaction_amount"
            />
            <Input
              value={planReason}
              onChange={(event) => setPlanReason(event.target.value)}
              placeholder="reason opcional"
            />
            <Button type="button" onClick={handleCreatePlan} disabled={planCreating}>
              {planCreating ? "Criando plano..." : "Criar plano mensal"}
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
