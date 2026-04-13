import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMercadoPagoClient, type MpCardFormInstance } from "@/lib/mercadoPago";

interface MercadoPagoCardFormProps {
  amount: number;
  initialEmail: string;
  onTokenReceived: (token: string, emailFromForm: string) => void;
  onError: (message: string) => void;
}

const PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.VITE_MP_PUBLIC_KEY || "";

export default function MercadoPagoCardForm({ amount, initialEmail, onTokenReceived, onError }: MercadoPagoCardFormProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const cardFormRef = useRef<MpCardFormInstance | null>(null);
  const onErrorRef = useRef(onError);
  const onTokenReceivedRef = useRef(onTokenReceived);
  const formIdRef = useRef(`mp-card-form-${Math.random().toString(36).slice(2)}`);

  const idsRef = useRef({
    cardNumber: `cardNumber-${Math.random().toString(36).slice(2)}`,
    expirationDate: `expirationDate-${Math.random().toString(36).slice(2)}`,
    securityCode: `securityCode-${Math.random().toString(36).slice(2)}`,
    cardholderName: `cardholderName-${Math.random().toString(36).slice(2)}`,
    cardholderEmail: `cardholderEmail-${Math.random().toString(36).slice(2)}`,
    issuer: `issuer-${Math.random().toString(36).slice(2)}`,
    installments: `installments-${Math.random().toString(36).slice(2)}`,
    identificationType: `identificationType-${Math.random().toString(36).slice(2)}`,
    identificationNumber: `identificationNumber-${Math.random().toString(36).slice(2)}`,
  });

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onTokenReceivedRef.current = onTokenReceived;
  }, [onTokenReceived]);

  useEffect(() => {
    let mounted = true;
    setSdkReady(false);

    const hasMountedSecureFields = () => {
      const cardNumberContainer = document.getElementById(idsRef.current.cardNumber);
      const expirationContainer = document.getElementById(idsRef.current.expirationDate);
      const securityContainer = document.getElementById(idsRef.current.securityCode);

      return Boolean(
        cardNumberContainer?.querySelector("iframe") &&
          expirationContainer?.querySelector("iframe") &&
          securityContainer?.querySelector("iframe"),
      );
    };

    const init = async () => {
      if (!PUBLIC_KEY) {
        onErrorRef.current("Configure VITE_MERCADO_PAGO_PUBLIC_KEY para tokenizar cartao.");
        return;
      }

      try {
        // Wait one frame so all target containers are present in the DOM.
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

        const previousForm = cardFormRef.current;
        if (previousForm?.unmount) {
          try {
            previousForm.unmount();
          } catch {
            // Ignore teardown races from SDK internals.
          }
        }

        const client = await getMercadoPagoClient(PUBLIC_KEY);
        if (!mounted) return;

        cardFormRef.current = client.cardForm({
          amount: String(amount || 1),
          iframe: true,
          form: {
            id: formIdRef.current,
            cardholderName: { id: idsRef.current.cardholderName },
            cardholderEmail: { id: idsRef.current.cardholderEmail },
            cardNumber: { id: idsRef.current.cardNumber },
            expirationDate: { id: idsRef.current.expirationDate },
            securityCode: { id: idsRef.current.securityCode },
            installments: { id: idsRef.current.installments },
            identificationType: { id: idsRef.current.identificationType },
            identificationNumber: { id: idsRef.current.identificationNumber },
            issuer: { id: idsRef.current.issuer },
          },
          callbacks: {
            onFormMounted: (error) => {
              if (error) {
                onErrorRef.current("Nao foi possivel inicializar o formulario de cartao.");
                return;
              }

              if (!hasMountedSecureFields()) {
                onErrorRef.current("Nao foi possivel montar os campos de cartao. Recarregue a pagina e tente novamente.");
                setSdkReady(false);
                return;
              }

              setSdkReady(true);
            },
            onSubmit: (event) => {
              event.preventDefault();
              setLoadingToken(true);

              try {
                const formData = cardFormRef.current?.getCardFormData();
                const token = String(formData?.token || "").trim();
                const email = String(formData?.cardholderEmail || "").trim();

                if (!token) {
                  onErrorRef.current("Token do cartao nao foi gerado. Revise os dados e tente novamente.");
                  return;
                }

                if (!email) {
                  onErrorRef.current("Email do titular e obrigatorio para assinatura.");
                  return;
                }

                onTokenReceivedRef.current(token, email);
              } finally {
                setLoadingToken(false);
              }
            },
            onFetching: () => {},
            onError: (error) => {
              const message = error instanceof Error ? error.message : String(error || "");
              onErrorRef.current(
                message
                  ? `Falha ao gerar token do cartao: ${message}`
                  : "Falha ao gerar token do cartao. Revise os dados e tente novamente.",
              );
            },
          },
        });
      } catch (error) {
        onErrorRef.current(error instanceof Error ? error.message : "Falha ao carregar Mercado Pago.");
      }
    };

    void init();

    return () => {
      mounted = false;
      const currentForm = cardFormRef.current;
      cardFormRef.current = null;

      if (currentForm?.unmount) {
        try {
          currentForm.unmount();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.includes("CardForm is not mounted")) {
            throw error;
          }
        }
      }
    };
  }, [amount]);

  useEffect(() => {
    const emailInput = document.getElementById(idsRef.current.cardholderEmail) as HTMLInputElement | null;
    if (emailInput && initialEmail) {
      emailInput.value = initialEmail;
    }
  }, [initialEmail]);

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
      <p className="font-heading font-semibold">Dados do cartao (Mercado Pago)</p>

      <form id={formIdRef.current} className="space-y-2">
        <div id={idsRef.current.cardNumber} className="h-10 rounded-md border border-input bg-background px-3 py-2" />
        <div className="grid grid-cols-2 gap-2">
          <div id={idsRef.current.expirationDate} className="h-10 rounded-md border border-input bg-background px-3 py-2" />
          <div id={idsRef.current.securityCode} className="h-10 rounded-md border border-input bg-background px-3 py-2" />
        </div>
        <input
          id={idsRef.current.cardholderName}
          name="cardholderName"
          placeholder="Nome no cartao"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          autoComplete="cc-name"
        />
        <input
          id={idsRef.current.cardholderEmail}
          name="cardholderEmail"
          placeholder="Email do titular"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          autoComplete="email"
          defaultValue={initialEmail}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            id={idsRef.current.identificationType}
            name="identificationType"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            id={idsRef.current.identificationNumber}
            name="identificationNumber"
            placeholder="Documento"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            id={idsRef.current.issuer}
            name="issuer"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            id={idsRef.current.installments}
            name="installments"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <Button type="submit" disabled={!sdkReady || loadingToken} className="w-full">
          {loadingToken ? "Gerando token..." : "Gerar token do cartao"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Os dados sensiveis do cartao sao tokenizados pelo SDK e nao sao armazenados pela aplicacao.
      </p>
    </div>
  );
}
