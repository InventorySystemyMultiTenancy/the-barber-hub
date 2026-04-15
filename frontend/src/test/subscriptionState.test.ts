import { describe, expect, it } from "vitest";
import { getSubscriptionState } from "@/lib/subscriptionState";

describe("getSubscriptionState", () => {
  it("prioriza flags novas da API", () => {
    const state = getSubscriptionState({
      status: "authorized",
      is_active: false,
      is_canceled: true,
      subscription_state: "cancelada",
    });

    expect(state.isActive).toBe(false);
    expect(state.isCanceled).toBe(true);
    expect(state.label).toBe("Cancelada");
    expect(state.color).toBe("danger");
  });

  it("faz fallback defensivo por status quando flags nao existem", () => {
    const active = getSubscriptionState({ status: "pending" });
    const canceled = getSubscriptionState({ status: "canceled" });
    const unknown = getSubscriptionState({ status: "unknown" });

    expect(active.isActive).toBe(true);
    expect(active.label).toBe("Ativa");

    expect(canceled.isCanceled).toBe(true);
    expect(canceled.label).toBe("Cancelada");

    expect(unknown.isActive).toBe(false);
    expect(unknown.isCanceled).toBe(false);
    expect(unknown.label).toBe("Desconhecida");
  });

  it("nao quebra com subscription null", () => {
    const state = getSubscriptionState(null);

    expect(state.isActive).toBe(false);
    expect(state.isCanceled).toBe(false);
    expect(state.label).toBe("Desconhecida");
  });
});
