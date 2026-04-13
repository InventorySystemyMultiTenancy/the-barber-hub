import { useState } from "react";
import {
  createSubscription,
  type CreateSubscriptionPayload,
  type SubscriptionInfo,
} from "@/lib/api";
import {
  persistSubscriptionReference,
  type StoredSubscriptionReference,
} from "@/hooks/use-subscription";

export function useCreateSubscription() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const mutate = async (payload: CreateSubscriptionPayload): Promise<SubscriptionInfo> => {
    setLoading(true);
    setError(null);
    try {
      const subscription = await createSubscription(payload);
      persistSubscriptionReference(subscription);
      return subscription;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error,
  };
}

export function getCreatedSubscriptionReference(value: SubscriptionInfo): StoredSubscriptionReference {
  return {
    id: value.id || undefined,
    mpPreapprovalId: value.mpPreapprovalId || undefined,
    preapprovalPlanId: value.preapprovalPlanId || undefined,
    reason: value.reason || undefined,
    transactionAmount: value.transactionAmount,
  };
}
