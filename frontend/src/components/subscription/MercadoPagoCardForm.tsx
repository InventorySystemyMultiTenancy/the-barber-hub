import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMercadoPagoClient, type MpCardFormInstance } from "@/lib/mercadoPago";

interface MercadoPagoCardFormProps {
  amount: number;
  initialEmail: string;
  onTokenReceived: (token: string, emailFromForm: string) => void | Promise<void>;
  onError: (message: string) => void;
  submitLabel?: string;
  submitting?: boolean;
}

const PUBLIC_KEY = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || import.meta.env.VITE_MP_PUBLIC_KEY || "";

export default function MercadoPagoCardForm({
  amount,
  initialEmail,
  onTokenReceived,
  onError,
  submitLabel = "Gerar token do cartao",
  submitting = false,
}: MercadoPagoCardFormProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [loadingToken, setLoadingToken] = useState(false);
  const initializedRef = useRef(false);
  const cardFormRef = useRef<MpCardFormInstance | null>(null);
  const lastSdkErrorsRef = useRef<Array<{ field?: string; message?: string }>>([]);
  const onErrorRef = useRef(onError);
  const onTokenReceivedRef = useRef(onTokenReceived);
  const formIdRef = useRef("mp-card-form");

  const idsRef = useRef({
    cardNumber: "cardNumber",
    expirationDate: "expirationDate",
    securityCode: "securityCode",
    cardholderName: "cardholderName",
    cardholderEmail: "email",
    issuer: "issuer",
    installments: "installments",
    identificationType: "identificationType",
    identificationNumber: "identificationNumber",
  });

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onTokenReceivedRef.current = onTokenReceived;
  }, [onTokenReceived]);

  useEffect(() => {
    let mounted = true;
    if (initializedRef.current) return;
    initializedRef.current = true;
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

    const normalizeSecureFieldIframes = () => {
      const containers = [
        idsRef.current.cardNumber,
        idsRef.current.expirationDate,
        idsRef.current.securityCode,
      ];

      containers.forEach((containerId) => {
        const container = document.getElementById(containerId);
        const iframe = container?.querySelector("iframe") as HTMLIFrameElement | null;
        if (!container || !iframe) return;

        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.display = "block";
        iframe.style.border = "0";
        iframe.style.pointerEvents = "auto";
      });
    };

    const hasBlockingSdkErrors = () => {
      return lastSdkErrorsRef.current.some((item) => {
        const field = String(item.field || "").toLowerCase();
        return ["cardnumber", "securitycode", "expirationdate", "expirationmonth", "expirationyear"].includes(field);
      });
    };

    const buildSdkErrorMessage = (error: unknown) => {
      if (Array.isArray(error)) {
        const normalized = error.map((item) => ({
          field: item?.field ? String(item.field) : undefined,
          message: item?.message ? String(item.message) : undefined,
        }));
        lastSdkErrorsRef.current = normalized;

        const securityIssue = normalized.find((item) => String(item.field || "").toLowerCase().includes("security"));
        if (securityIssue) {
          return "Nao foi possivel validar o CVV. Preencha o codigo de seguranca e tente novamente.";
        }

        const firstMessage = normalized.find((item) => item.message)?.message;
        return firstMessage || "Falha ao validar os dados do cartao.";
      }

      lastSdkErrorsRef.current = [];
      return error instanceof Error ? error.message : String(error || "");
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

              normalizeSecureFieldIframes();

              if (!hasMountedSecureFields()) {
                onErrorRef.current("Nao foi possivel montar os campos de cartao. Recarregue a pagina e tente novamente.");
                setSdkReady(false);
                return;
              }

              setSdkReady(true);
            },
            onSubmit: async (event) => {
              event.preventDefault();
              setLoadingToken(true);
              lastSdkErrorsRef.current = [];

              try {
                const formData = cardFormRef.current?.getCardFormData();
                const token = String(formData?.token || "").trim();
                const email = String(formData?.cardholderEmail || "").trim();

                if (hasBlockingSdkErrors()) {
                  onErrorRef.current("Dados do cartao invalidos. Revise numero, validade e CVV para gerar o token.");
                  return;
                }

                if (!token) {
                  onErrorRef.current("Token do cartao nao foi gerado. Revise os dados e tente novamente.");
                  return;
                }

                if (!email) {
                  onErrorRef.current("Email do titular e obrigatorio para assinatura.");
                  return;
                }

                await onTokenReceivedRef.current(token, email);
              } finally {
                setLoadingToken(false);
              }
            },
            onFetching: () => {},
            onError: (error) => {
              const message = buildSdkErrorMessage(error);
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
      initializedRef.current = false;
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
  }, []);

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
        <div
          id={idsRef.current.cardNumber}
          className="relative min-w-0 h-10 rounded-md border border-input bg-white px-2 py-1 overflow-hidden cursor-text"
        />
        <div className="grid grid-cols-2 gap-2">
          <div
            id={idsRef.current.expirationDate}
            className="relative min-w-0 h-10 rounded-md border border-input bg-white px-2 py-1 overflow-hidden cursor-text"
          />
          <div
            id={idsRef.current.securityCode}
            className="relative min-w-0 h-10 rounded-md border border-input bg-white px-2 py-1 overflow-hidden cursor-text"
            onClick={() => {
              const container = document.getElementById(idsRef.current.securityCode);
              const iframe = container?.querySelector("iframe") as HTMLIFrameElement | null;
              iframe?.focus();
            }}
          />
        </div>
        <input
          id={idsRef.current.cardholderName}
          name="cardholderName"
          placeholder="Nome no cartao"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          autoComplete="cc-name"
        />
        <input
          id={idsRef.current.cardholderEmail}
          name="email"
          placeholder="Email do titular"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          autoComplete="email"
          defaultValue={initialEmail}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            id={idsRef.current.identificationType}
            name="identificationType"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            id={idsRef.current.identificationNumber}
            name="identificationNumber"
            placeholder="Documento"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            id={idsRef.current.issuer}
            name="issuer"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
          <select
            id={idsRef.current.installments}
            name="installments"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        <Button type="submit" disabled={!sdkReady || loadingToken || submitting} className="w-full">
          {loadingToken || submitting ? "Processando..." : submitLabel}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Os dados sensiveis do cartao sao tokenizados pelo SDK e nao sao armazenados pela aplicacao.
      </p>
    </div>
  );
}
