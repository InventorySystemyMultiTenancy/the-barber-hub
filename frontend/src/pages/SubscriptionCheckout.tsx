import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import SubscriptionCheckoutForm from "@/components/subscription/SubscriptionCheckoutForm";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateSubscription } from "@/hooks/useCreateSubscription";
import { toast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage, type SubscriptionPlan } from "@/lib/api";
import { readSelectedSubscriptionPlan } from "@/lib/subscriptionPlanSelection";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubscriptionCheckout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { mutate: createSubscription, loading: createLoading } = useCreateSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(readSelectedSubscriptionPlan());
  const [email, setEmail] = useState(user?.email || "");
  const [cardToken, setCardToken] = useState("");

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
      </div>
    </div>
  );
}
