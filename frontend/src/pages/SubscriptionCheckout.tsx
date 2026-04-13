import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SubscriptionCheckoutForm from "@/components/subscription/SubscriptionCheckoutForm";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateSubscription } from "@/hooks/useCreateSubscription";
import { toast } from "@/hooks/use-toast";
import { ApiClientError, getFriendlyErrorMessage, type SubscriptionPlan } from "@/lib/api";
import { readSelectedSubscriptionPlan } from "@/lib/subscriptionPlanSelection";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubscriptionCheckout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { mutate: createSubscription, loading: createLoading } = useCreateSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(readSelectedSubscriptionPlan());
  const [email, setEmail] = useState(user?.email || "");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setEmail((current) => current || user?.email || "");
  }, [user?.email]);

  useEffect(() => {
    const stored = readSelectedSubscriptionPlan();
    if (stored) {
      setSelectedPlan(stored);
      return;
    }

    if (!authLoading && user) {
      navigate("/assinatura");
    }
  }, [authLoading, user, navigate]);

  if (!user && authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando autenticacao...</p>
      </div>
    );
  }

  if (!user) return null;

  const handleCreateSubscriptionWithToken = async (token: string, tokenEmail: string) => {
    const safeEmail = String(email || tokenEmail || "").trim();
    const safePlanId = String(selectedPlan?.preapprovalPlanId || selectedPlan?.id || "").trim();
    const safeToken = String(token || "").trim();
    const submitAttemptId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
        description: "Nao foi possivel gerar o token do cartao. Revise os dados e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    console.info("[SubscriptionCheckout] submit attempt", {
      submitAttemptId,
      tokenLength: safeToken.length,
      preapproval_plan_id: safePlanId,
      email: safeEmail,
      timestamp: new Date().toISOString(),
    });

    try {
      const subscription = await createSubscription({
        preapproval_plan_id: safePlanId,
        token: safeToken,
        email: safeEmail,
      });

      console.info("[SubscriptionCheckout] submit success", {
        submitAttemptId,
        status: subscription.status,
      });

      toast({
        title: "Assinatura criada",
        description: `Status inicial: ${subscription.status}`,
      });

      navigate("/minha-assinatura?poll=1");
    } catch (error) {
      const providerWithoutCvv =
        error instanceof ApiClientError &&
        String(error.code || "").toUpperCase() === "PROVIDER_UNAVAILABLE" &&
        String(error.message || "").toLowerCase().includes("without cvv validation");

      console.error("[SubscriptionCheckout] submit failed", {
        submitAttemptId,
        status: (error as any)?.status,
        code: (error as any)?.code,
        message: (error as any)?.message,
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Erro ao criar assinatura",
        description: providerWithoutCvv
          ? "Nao foi possivel validar o CVV. Atualize a pagina e tente novamente."
          : getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16 space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold">Checkout da assinatura</h1>
          <p className="text-muted-foreground mt-1">
            Tokenize o cartao com Mercado Pago e conclua com o plano selecionado.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold">Pagamento e criacao</h2>
          <SubscriptionCheckoutForm
            selectedPlan={selectedPlan}
            email={email}
            loading={createLoading}
            onEmailChange={setEmail}
            onTokenReceived={handleCreateSubscriptionWithToken}
            onCardFormError={(message) =>
              toast({
                title: "Mercado Pago",
                description: message,
                variant: "destructive",
              })
            }
          />
        </section>
      </div>
    </div>
  );
}
