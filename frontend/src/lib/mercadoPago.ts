const MERCADO_PAGO_SDK_URL = "https://sdk.mercadopago.com/js/v2";
const MERCADO_PAGO_SCRIPT_ID = "mercado-pago-sdk-v2";
const MP_IDB_DUPLICATE_STORE_ERROR =
  "Failed to execute 'createObjectStore' on 'IDBDatabase': An object store with the specified name already exists.";

let sdkLoadPromise: Promise<void> | null = null;
const mpClientByPublicKey = new Map<string, MpClient>();
let sdkErrorHandlerInstalled = false;

export type MpCardFormInstance = {
  unmount?: () => void;
  getCardFormData: () => {
    token?: string;
    paymentMethodId?: string;
    issuerId?: string;
    installments?: string;
    identificationType?: string;
    identificationNumber?: string;
    cardholderEmail?: string;
  };
};

type MpCardFormConfig = {
  amount: string;
  form: {
    id: string;
    cardholderName: { id: string };
    cardholderEmail: { id: string };
    cardNumber: { id: string };
    expirationDate: { id: string };
    securityCode: { id: string };
    installments: { id: string };
    identificationType: { id: string };
    identificationNumber: { id: string };
    issuer: { id: string };
  };
  callbacks?: {
    onFormMounted?: (error?: unknown) => void;
    onSubmit?: (event: Event) => void | Promise<void>;
    onFetching?: (resource: string) => void;
    onError?: (error: unknown) => void;
  };
};

type MpClient = {
  cardForm: (config: MpCardFormConfig) => MpCardFormInstance;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MpClient;
  }
}

function ensureSdkScript(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(MERCADO_PAGO_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.MercadoPago) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Falha ao carregar SDK Mercado Pago.")), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = MERCADO_PAGO_SCRIPT_ID;
    script.src = MERCADO_PAGO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar SDK Mercado Pago."));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

function installMercadoPagoNoiseGuard() {
  if (sdkErrorHandlerInstalled) return;
  sdkErrorHandlerInstalled = true;

  window.addEventListener("error", (event) => {
    const message = String(event.message || "");
    const source = String(event.filename || "");

    const isKnownMercadoPagoIndexedDbNoise =
      message.includes(MP_IDB_DUPLICATE_STORE_ERROR) && (source.includes("iframe") || source.includes("mercadopago"));

    if (isKnownMercadoPagoIndexedDbNoise) {
      event.preventDefault();
      console.warn("[MercadoPago] IndexedDB warning ignored (known SDK iframe noise).");
    }
  });
}

export async function getMercadoPagoClient(publicKey: string): Promise<MpClient> {
  const safePublicKey = String(publicKey || "").trim();
  if (!safePublicKey) {
    throw new Error("Chave publica do Mercado Pago nao configurada.");
  }

  await ensureSdkScript();
  installMercadoPagoNoiseGuard();

  if (!window.MercadoPago) {
    throw new Error("SDK Mercado Pago indisponivel.");
  }

  const cachedClient = mpClientByPublicKey.get(safePublicKey);
  if (cachedClient) {
    return cachedClient;
  }

  const client = new window.MercadoPago(safePublicKey, { locale: "pt-BR" });
  mpClientByPublicKey.set(safePublicKey, client);
  return client;
}
