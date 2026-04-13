import { useEffect, useRef } from "react";
import { getSubscription, type SubscriptionInfo } from "@/lib/api";

const TERMINAL_STATUS: SubscriptionInfo["status"][] = ["authorized", "paused", "canceled"];

function isTerminalStatus(status: SubscriptionInfo["status"] | undefined) {
  return Boolean(status && TERMINAL_STATUS.includes(status));
}

type UseSubscriptionPollingParams = {
  reference: string;
  enabled: boolean;
  intervalMs?: number;
  initialStatus?: SubscriptionInfo["status"];
  onTick: (value: SubscriptionInfo) => void;
  onError?: (error: unknown) => void;
};

export function useSubscriptionPolling({
  reference,
  enabled,
  intervalMs = 5000,
  initialStatus,
  onTick,
  onError,
}: UseSubscriptionPollingParams) {
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const safeReference = String(reference || "").trim();
    if (!enabled || !safeReference) return;
    if (isTerminalStatus(initialStatus)) return;

    const run = async () => {
      if (stoppedRef.current) return;

      try {
        const current = await getSubscription(safeReference);
        onTick(current);

        if (isTerminalStatus(current.status)) {
          stoppedRef.current = true;
        }
      } catch (error) {
        onError?.(error);
      }
    };

    void run();
    const timer = window.setInterval(() => {
      void run();
    }, intervalMs);

    return () => {
      stoppedRef.current = true;
      window.clearInterval(timer);
    };
  }, [enabled, reference, intervalMs, initialStatus, onTick, onError]);
}

export function shouldPollSubscriptionStatus(status: SubscriptionInfo["status"] | undefined) {
  return !isTerminalStatus(status);
}
