import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SubscriptionPlan } from "@/lib/api";
import MercadoPagoCardForm from "@/components/subscription/MercadoPagoCardForm";

type SubscriptionCheckoutFormProps = {
  selectedPlan: SubscriptionPlan | null;
  email: string;
  loading: boolean;
  token: string;
  onEmailChange: (value: string) => void;
  onTokenReceived: (token: string, tokenEmail: string) => void;
  onCardFormError: (message: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export default function SubscriptionCheckoutForm({
  selectedPlan,
  email,
  loading,
  token,
  onEmailChange,
  onTokenReceived,
  onCardFormError,
  onSubmit,
}: SubscriptionCheckoutFormProps) {
  if (!selectedPlan) {
    return (
      <div className="glass rounded-lg p-6 text-muted-foreground">
        Selecione um plano ativo para continuar com o pagamento.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-lg p-4 md:p-5 space-y-3">
        <h2 className="font-heading text-xl font-semibold">Pagamento da assinatura</h2>
        <Input
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="Email do assinante"
          required
        />

        <div className="rounded-md border border-border/70 p-3">
          <p className="text-xs text-muted-foreground">Token gerado</p>
          <p className="text-sm break-all">{token || "Token ainda nao gerado"}</p>
        </div>
      </div>

      <MercadoPagoCardForm
        amount={selectedPlan.transactionAmount || 1}
        initialEmail={email}
        onTokenReceived={onTokenReceived}
        onError={onCardFormError}
      />

      <form onSubmit={onSubmit} className="glass rounded-lg p-4 md:p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          O frontend envia apenas token, email e preapproval_plan_id para o backend.
        </p>

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Criando assinatura..." : "Assinar plano selecionado"}
        </Button>
      </form>
    </div>
  );
}
