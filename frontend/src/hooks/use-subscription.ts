import { useMemo, useState } from "react";
import {
  cancelSubscription,
  createSubscription,
  getSubscription,
  type CreateSubscriptionPayload,
  type SubscriptionInfo,
} from "@/lib/api";

const STORAGE_KEY = "chincoa_subscription_reference";

export type StoredSubscriptionReference = {
  id?: string;
  mpPreapprovalId?: string;
  preapprovalPlanId?: string;
  reason?: string;
  transactionAmount?: number;
};

function readStoredReference(): StoredSubscriptionReference | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredSubscriptionReference;
  } catch {
    return null;
  }
}

function writeStoredReference(value: StoredSubscriptionReference) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function toStoredReference(info: SubscriptionInfo): StoredSubscriptionReference {
  return {
    id: info.id || undefined,
    mpPreapprovalId: info.mpPreapprovalId || undefined,
    preapprovalPlanId: info.preapprovalPlanId || undefined,
    reason: info.reason || undefined,
    transactionAmount: info.transactionAmount,
  };
}

function getBestReference(stored: StoredSubscriptionReference | null) {
  if (!stored) return "";
  return String(stored.mpPreapprovalId || stored.id || "").trim();
}

export function subscriptionStatusMessage(status: SubscriptionInfo["status"]) {
  const map: Record<SubscriptionInfo["status"], string> = {
    authorized: "Assinatura autorizada e ativa.",
    pending: "Assinatura pendente de confirmacao do provedor.",
    paused: "Assinatura pausada. Verifique os dados de cobranca.",
    canceled: "Assinatura cancelada.",
    unknown: "Status desconhecido no momento.",
  };

  return map[status] || map.unknown;
}

export function useSubscription() {
  const [createLoading, setCreateLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionInfo | null>(null);

  const storedReference = useMemo(() => readStoredReference(), [currentSubscription]);

  const persistReferenceFromSubscription = (subscription: SubscriptionInfo) => {
    writeStoredReference(toStoredReference(subscription));
  };

  const createNewSubscription = async (payload: CreateSubscriptionPayload) => {
    setCreateLoading(true);
    try {
      const subscription = await createSubscription(payload);
      setCurrentSubscription(subscription);
      persistReferenceFromSubscription(subscription);
      return subscription;
    } finally {
      setCreateLoading(false);
    }
  };

  const fetchCurrentSubscription = async (reference?: string) => {
    const resolvedReference = String(reference || getBestReference(readStoredReference()) || "").trim();
    if (!resolvedReference) return null;

    setFetchLoading(true);
    try {
      const subscription = await getSubscription(resolvedReference);
      setCurrentSubscription(subscription);
      persistReferenceFromSubscription(subscription);
      return subscription;
    } finally {
      setFetchLoading(false);
    }
  };

  const cancelCurrentSubscription = async (reference?: string) => {
    const resolvedReference = String(reference || getBestReference(readStoredReference()) || "").trim();
    if (!resolvedReference) return null;

    setCancelLoading(true);
    try {
      const subscription = await cancelSubscription(resolvedReference);
      setCurrentSubscription(subscription);
      persistReferenceFromSubscription(subscription);
      return subscription;
    } finally {
      setCancelLoading(false);
    }
  };

  return {
    createLoading,
    fetchLoading,
    cancelLoading,
    currentSubscription,
    storedReference,
    createNewSubscription,
    fetchCurrentSubscription,
    cancelCurrentSubscription,
    persistReferenceFromSubscription,
  };
}
