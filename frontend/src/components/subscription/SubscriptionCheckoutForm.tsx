import { Input } from "@/components/ui/input";
import type { SubscriptionPlan } from "@/lib/api";
import MercadoPagoCardForm from "@/components/subscription/MercadoPagoCardForm";

type SubscriptionCheckoutFormProps = {
  selectedPlan: SubscriptionPlan | null;
  email: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onTokenReceived: (token: string, tokenEmail: string) => void | Promise<void>;
  onCardFormError: (message: string) => void;
};

export default function SubscriptionCheckoutForm({
  selectedPlan,
  email,
  loading,
  onEmailChange,
  onTokenReceived,
  onCardFormError,
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
      </div>

      <MercadoPagoCardForm
        amount={selectedPlan.transactionAmount || 1}
        initialEmail={email}
        onTokenReceived={onTokenReceived}
        onError={onCardFormError}
        submitLabel="Assinar plano selecionado"
        submitting={loading}
      />
    </div>
  );
}
