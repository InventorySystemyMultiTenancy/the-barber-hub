import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SubscriptionStatusCard from "@/components/subscription/SubscriptionStatusCard";
import { useAuth } from "@/contexts/AuthContext";
import { getFriendlyErrorMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";

export default function MySubscription() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const {
    currentSubscription,
    storedReference,
    fetchLoading,
    cancelLoading,
    fetchCurrentSubscription,
    cancelCurrentSubscription,
  } = useSubscription();

  const [manualReference, setManualReference] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    if (user) {
      void fetchCurrentSubscription();
    }
  }, [authLoading, user, navigate]);

  const handleFetch = async (event?: FormEvent) => {
    event?.preventDefault();

    try {
      const subscription = await fetchCurrentSubscription(manualReference);
      if (!subscription) {
        toast({
          title: "Referencia obrigatoria",
          description: "Informe uma referencia ou crie uma assinatura primeiro.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Assinatura carregada",
        description: `Status atual: ${subscription.status}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao consultar assinatura",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    const confirmed = window.confirm("Deseja cancelar sua assinatura?");
    if (!confirmed) return;

    try {
      const canceled = await cancelCurrentSubscription(manualReference);
      if (!canceled) {
        toast({
          title: "Referencia obrigatoria",
          description: "Nao foi possivel encontrar referencia para cancelamento.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Assinatura cancelada",
        description: `Status atual: ${canceled.status}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao cancelar assinatura",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando autenticacao...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-3xl px-4 pt-24 pb-16 space-y-5">
        <div>
          <h1 className="font-heading text-3xl font-bold">Minha assinatura</h1>
          <p className="text-muted-foreground mt-1">Acompanhe status, proximo pagamento e cancele quando precisar.</p>
        </div>

        <form onSubmit={handleFetch} className="glass rounded-lg p-4 md:p-5 space-y-3">
          <p className="font-heading text-lg font-semibold">Consultar assinatura</p>
          <Input
            value={manualReference}
            onChange={(event) => setManualReference(event.target.value)}
            placeholder="Referencia (subscription.id ou mp_preapproval_id)"
          />
          <p className="text-xs text-muted-foreground break-all">
            Referencia salva: {storedReference?.mpPreapprovalId || storedReference?.id || "-"}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={fetchLoading}>
              {fetchLoading ? "Consultando..." : "Consultar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/assinatura")}>Nova assinatura</Button>
          </div>
        </form>

        {currentSubscription ? (
          <>
            <SubscriptionStatusCard subscription={currentSubscription} />

            <div className="glass rounded-lg p-4 md:p-5">
              <Button
                type="button"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleCancel}
                disabled={cancelLoading || currentSubscription.status === "canceled"}
              >
                {cancelLoading ? "Cancelando..." : "Cancelar assinatura"}
              </Button>
            </div>
          </>
        ) : (
          <div className="glass rounded-lg p-6 text-center text-muted-foreground">
            Nenhuma assinatura carregada no momento.
          </div>
        )}
      </div>
    </div>
  );
}
