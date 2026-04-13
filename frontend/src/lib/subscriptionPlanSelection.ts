import type { SubscriptionPlan } from "@/lib/api";

const STORAGE_KEY = "chincoa_selected_subscription_plan";

export function saveSelectedSubscriptionPlan(plan: SubscriptionPlan) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function readSelectedSubscriptionPlan(): SubscriptionPlan | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SubscriptionPlan;
  } catch {
    return null;
  }
}

export function clearSelectedSubscriptionPlan() {
  sessionStorage.removeItem(STORAGE_KEY);
}
