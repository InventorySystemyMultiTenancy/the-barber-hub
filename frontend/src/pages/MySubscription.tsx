import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SubscriptionAttemptsList from "@/components/subscription/SubscriptionAttemptsList";
import SubscriptionStatusPanel from "@/components/subscription/SubscriptionStatusPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionPolling } from "@/hooks/useSubscriptionPolling";
import { toast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage, type SubscriptionInfo } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";

export default function MySubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldStartPollingFromRedirect = searchParams.get("poll") === "1";

  const { user, loading: authLoading } = useAuth();
  const {
    currentSubscription,
    storedReference,
    fetchLoading,
    cancelLoading,
    fetchCurrentSubscription,
    cancelCurrentSubscription,
    persistReferenceFromSubscription,
    setCurrentSubscriptionValue,
  } = useSubscription();

  const [manualReference, setManualReference] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);

  const activeReference = useMemo(
    () =>
      String(
        manualReference ||
          currentSubscription?.mpPreapprovalId ||
          currentSubscription?.id ||
          storedReference?.mpPreapprovalId ||
          storedReference?.id ||
          "",
      ).trim(),
    [manualReference, currentSubscription?.mpPreapprovalId, currentSubscription?.id, storedReference?.mpPreapprovalId, storedReference?.id],
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }

    if (user) {
      void fetchCurrentSubscription().catch((error) => {
        setLastError(getFriendlyErrorMessage(error));
      });
    }
  }, [authLoading, user, navigate, fetchCurrentSubscription]);

  const handleFetch = async (event?: FormEvent) => {
    event?.preventDefault();
    setLastError(null);

    try {
      const subscription = await fetchCurrentSubscription(manualReference);
      if (!subscription) {
        setLastError("Informe uma referencia ou crie uma assinatura primeiro.");
        return;
      }

      toast({
        title: "Assinatura carregada",
        description: `Status atual: ${subscription.status}`,
      });
    } catch (error) {
      const message = getFriendlyErrorMessage(error);
      setLastError(message);
      toast({
        title: "Erro ao consultar assinatura",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    const confirmed = window.confirm("Deseja cancelar sua assinatura?");
    if (!confirmed) return;

    setLastError(null);

    try {
      const canceled = await cancelCurrentSubscription(manualReference);
      if (!canceled) {
        setLastError("Nao foi possivel encontrar referencia para cancelamento.");
        return;
      }

      toast({
        title: "Assinatura cancelada",
        description: `Status atual: ${canceled.status}`,
      });
    } catch (error) {
      const message = getFriendlyErrorMessage(error);
      setLastError(message);
      toast({
        title: "Erro ao cancelar assinatura",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handlePollingTick = useCallback(
    (subscription: SubscriptionInfo) => {
      setCurrentSubscriptionValue(subscription);
      persistReferenceFromSubscription(subscription);
      setLastError(null);
    },
    [persistReferenceFromSubscription, setCurrentSubscriptionValue],
  );

  useSubscriptionPolling({
    reference: activeReference,
    enabled: Boolean(activeReference) && (shouldStartPollingFromRedirect || currentSubscription?.status === "pending"),
    initialStatus: currentSubscription?.status,
    onTick: handlePollingTick,
    onError: (error) => {
      setLastError(getFriendlyErrorMessage(error));
    },
  });

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
      <div className="container mx-auto max-w-4xl px-4 pt-24 pb-16 space-y-5">
        <div>
          <h1 className="font-heading text-3xl font-bold">Minha assinatura</h1>
          <p className="text-muted-foreground mt-1">
            Consulte status, proximo pagamento e tentativas de cobranca.
          </p>
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

          {lastError ? <p className="text-sm text-destructive">{lastError}</p> : null}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" disabled={fetchLoading}>
              {fetchLoading ? "Consultando..." : "Consultar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/assinatura")}>
              Nova assinatura
            </Button>
          </div>
        </form>

        {currentSubscription ? (
          <>
            <SubscriptionStatusPanel subscription={currentSubscription} />
            <SubscriptionAttemptsList attempts={currentSubscription.attempts || []} subscription={currentSubscription} />

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
