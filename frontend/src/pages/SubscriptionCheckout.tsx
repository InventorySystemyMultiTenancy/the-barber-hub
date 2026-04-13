import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PlanSelector, { type PlanOption } from "@/components/subscription/PlanSelector";
import MercadoPagoCardForm from "@/components/subscription/MercadoPagoCardForm";
import { useAuth } from "@/contexts/AuthContext";
import { createSubscriptionPlan, getFriendlyErrorMessage } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "@/hooks/use-toast";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getDefaultPlans(): PlanOption[] {
  return [
    {
      key: "mensal-basic",
      title: "Plano Mensal Basic",
      description: "1 corte por semana com horario prioritario.",
      preapprovalPlanId: import.meta.env.VITE_MP_PLAN_BASIC_ID || "",
      amount: Number(import.meta.env.VITE_MP_PLAN_BASIC_AMOUNT || 79.9),
      reason: "Plano mensal basic",
    },
    {
      key: "mensal-plus",
      title: "Plano Mensal Plus",
      description: "2 servicos por semana e atendimento estendido.",
      preapprovalPlanId: import.meta.env.VITE_MP_PLAN_PLUS_ID || "",
      amount: Number(import.meta.env.VITE_MP_PLAN_PLUS_AMOUNT || 129.9),
      reason: "Plano mensal plus",
    },
    {
      key: "mensal-pro",
      title: "Plano Mensal Pro",
      description: "Atendimento premium com prioridade maxima.",
      preapprovalPlanId: import.meta.env.VITE_MP_PLAN_PRO_ID || "",
      amount: Number(import.meta.env.VITE_MP_PLAN_PRO_AMOUNT || 179.9),
      reason: "Plano mensal pro",
    },
  ];
}

export default function SubscriptionCheckout() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { createLoading, createNewSubscription } = useSubscription();

  const plans = useMemo(() => getDefaultPlans(), []);
  const [selectedPlanKey, setSelectedPlanKey] = useState(plans[0]?.key || "");

  const [preapprovalPlanId, setPreapprovalPlanId] = useState(plans[0]?.preapprovalPlanId || "");
  const [email, setEmail] = useState(user?.email || "");
  const [reason, setReason] = useState(plans[0]?.reason || "");
  const [backUrl, setBackUrl] = useState("");
  const [cardToken, setCardToken] = useState("");

  const [planCreating, setPlanCreating] = useState(false);
  const [planAmount, setPlanAmount] = useState("79.9");
  const [planReason, setPlanReason] = useState("Plano mensal personalizado");

  const selectedPlan = plans.find((plan) => plan.key === selectedPlanKey) || plans[0];

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
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

  const handleSelectPlan = (key: string) => {
    setSelectedPlanKey(key);
    const plan = plans.find((item) => item.key === key);
    if (!plan) return;

    setPreapprovalPlanId(plan.preapprovalPlanId || "");
    setReason(plan.reason || "");
  };

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
    const safePlanId = String(preapprovalPlanId || "").trim();
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
        description: "Selecione um plano valido ou informe o preapproval_plan_id.",
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
      const subscription = await createNewSubscription({
        preapproval_plan_id: safePlanId,
        token: safeToken,
        email: safeEmail,
        reason: reason.trim() || undefined,
        back_url: backUrl.trim() || undefined,
        status: "authorized",
      });

      toast({
        title: "Assinatura criada",
        description: `Status: ${subscription.status}.` ,
      });

      navigate("/minha-assinatura");
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

      setPreapprovalPlanId(plan.id);
      if (plan.reason) {
        setReason(plan.reason);
      }

      toast({
        title: "Plano criado",
        description: `preapproval_plan_id: ${plan.id}`,
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
          <p className="text-muted-foreground mt-1">Escolha seu plano, tokeniza o cartao com Mercado Pago e conclua a assinatura.</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-heading text-xl font-semibold">1. Escolha de plano</h2>
          <PlanSelector plans={plans} selectedPlanKey={selectedPlanKey} onSelect={handleSelectPlan} />
        </section>

        <section className="glass rounded-lg p-4 md:p-5 space-y-3">
          <h2 className="font-heading text-xl font-semibold">2. Dados da assinatura</h2>

          <Input
            value={preapprovalPlanId}
            onChange={(event) => setPreapprovalPlanId(event.target.value)}
            placeholder="preapproval_plan_id"
          />

          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email do assinante"
            required
          />

          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Descricao da assinatura (opcional)"
            rows={2}
          />

          <Input
            value={backUrl}
            onChange={(event) => setBackUrl(event.target.value)}
            placeholder="back_url opcional"
          />

          <div className="rounded-md border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">token</p>
            <p className="text-sm break-all">{cardToken || "Token ainda nao gerado"}</p>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold mb-3">3. Tokenizar cartao</h2>
          <MercadoPagoCardForm
            amount={selectedPlan?.amount || 1}
            initialEmail={email}
            onTokenReceived={handleTokenReceived}
            onError={(message) =>
              toast({
                title: "Mercado Pago",
                description: message,
                variant: "destructive",
              })
            }
          />
        </section>

        <form onSubmit={handleCreateSubscription} className="glass rounded-lg p-4 md:p-5 space-y-3">
          <h2 className="font-heading text-xl font-semibold">4. Confirmar assinatura</h2>
          <p className="text-sm text-muted-foreground">
            O frontend envia apenas token + email + preapproval_plan_id para o backend. Nenhum numero de cartao, CVV ou validade e armazenado.
          </p>

          <Button type="submit" disabled={createLoading} className="w-full sm:w-auto">
            {createLoading ? "Criando assinatura..." : "Criar assinatura"}
          </Button>

          <Button type="button" variant="outline" onClick={() => navigate("/minha-assinatura")}>
            Ir para Minha assinatura
          </Button>
        </form>

        {isAdmin && (
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
        )}
      </div>
    </div>
  );
}
