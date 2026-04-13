import { useCallback, useEffect, useState } from "react";
import { getPublicSubscriptionPlans, type SubscriptionPlan } from "@/lib/api";

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicSubscriptionPlans();
      setPlans(data);
      return data;
    } catch (err) {
      setError(err);
      setPlans([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload().catch(() => {
      // Error state is already handled inside reload.
    });
  }, [reload]);

  return {
    plans,
    loading,
    error,
    reload,
  };
}
