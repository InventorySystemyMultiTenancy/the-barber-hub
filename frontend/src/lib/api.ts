const rawApiBaseUrl =
  import.meta.env.VITE_FRONTEND_API_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "https://chincoa-backend.onrender.com");

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");
export const hasApiBaseUrl = API_BASE_URL.length > 0;
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const ENABLE_API_DEBUG = import.meta.env.DEV || import.meta.env.VITE_API_DEBUG === "true";

export const SESSION_TOKEN_KEY = "session_token";
export const SESSION_USER_KEY = "session_user";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function logApiDebug(message: string, context?: Record<string, unknown>) {
  if (!ENABLE_API_DEBUG) return;
  console.error(`[API DEBUG] ${message}`, context || {});
}

export interface SessionUser {
  id: string;
  email?: string;
  fullName?: string;
  phone?: string;
  birthDate?: string;
  role?: "admin" | "client" | string;
}

export interface BirthdayDiscount {
  active: boolean;
  serviceType?: string;
  discountPercent?: number;
  message?: string | null;
}

export interface SessionInfo {
  user: SessionUser;
  birthdayDiscount: BirthdayDiscount;
}

export interface BackendHealth {
  status: string;
  service: string;
  timestamp: string;
}

export type AppointmentStatus = "agendado" | "pago" | "disponivel" | "desabilitado";

export interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  price: number;
  serviceType?: string;
  serviceLabel?: string;
  userId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  paymentMethod?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionIsActive?: boolean;
  subscriptionIsCanceled?: boolean;
  subscriptionState?: "ativa" | "cancelada" | "desconhecida" | string;
  subscriptionPlanName?: string;
  subscriptionPlanId?: string;
  isPremiumSubscriber?: boolean;
  discount?: {
    applied: boolean;
    type?: string;
    discountPercent?: number;
    basePrice?: number;
    finalPrice?: number;
    message?: string;
  };
}

export interface AppointmentService {
  key: string;
  label: string;
  price: number;
}

export interface Barber {
  id: string;
  fullName: string;
  imageUrl?: string | null;
  isActive: boolean;
}

export interface CreateBarberPayload {
  full_name: string;
  image_url?: string | null;
  is_active?: boolean;
}

export interface UpdateBarberPayload {
  full_name?: string;
  image_url?: string | null;
  is_active?: boolean;
}

export interface FinancialReportPeriod {
  startDate: string;
  endDate: string;
}

export interface FinancialReport {
  period: FinancialReportPeriod;
  paidAppointmentsCount: number;
  paidAppointmentsRevenue: number;
  fixedExpensesTotal: number;
  variableExpensesTotal: number;
  totalExpenses: number;
  netProfit: number;
}

export interface FixedExpense {
  id: string;
  title: string;
  amount: number;
  startsOn: string;
  endsOn?: string;
  isActive: boolean;
  notes?: string;
}

export interface VariableExpense {
  id: string;
  title: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

export interface CreateFixedExpensePayload {
  title: string;
  amount: number;
  starts_on: string;
  ends_on?: string;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateFixedExpensePayload {
  title?: string;
  amount?: number;
  starts_on?: string;
  ends_on?: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface CreateVariableExpensePayload {
  title: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

export interface UpdateVariableExpensePayload {
  title?: string;
  amount?: number;
  expense_date?: string;
  notes?: string | null;
}

export interface AppointmentSlot {
  time: string;
  status: AppointmentStatus;
  appointmentId?: string;
  reason?: string;
  dayHourOverrideId?: string;
  barberId?: string;
  barberName?: string;
}

export interface DayHour {
  id: string;
  date: string;
  slotTime: string;
  time: string;
  isEnabled: boolean;
  reason?: string;
  barberId?: string;
  barberName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDayHourPayload {
  date: string;
  time: string;
  isEnabled?: boolean;
  reason?: string;
}

export interface UpdateDayHourPayload {
  date?: string;
  time?: string;
  isEnabled?: boolean;
  reason?: string;
}

export interface SlotsMeta {
  timezone?: string;
  serverNowDate?: string;
  serverNow?: string;
  weekStart?: string;
  weekEnd?: string;
  bookingWindowStart?: string;
  bookingWindowEnd?: string;
  retentionStart?: string;
}

export interface SlotsByDateResponse {
  slots: AppointmentSlot[];
  meta: SlotsMeta;
}

export interface RegisterPayload {
  fullName: string;
  email?: string;
  phone: string;
  birthDate: string;
  password: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
}

export type PaymentStatus = "approved" | "pending" | "rejected" | "canceled";

export interface PixPaymentResponse {
  appointmentId: string;
  paymentId?: string;
  paymentIntentId?: string | null;
  paymentStatus?: PaymentStatus;
  providerStatus?: string;
  paymentMethod?: string;
  qrCodeBase64?: string;
  qrCodeCopyPaste?: string;
}

export interface PointPaymentResponse {
  appointmentId: string;
  paymentIntentId?: string;
  paymentId?: string;
  paymentStatus?: PaymentStatus;
  providerStatus?: string;
  paymentMethod?: string;
}

export interface PaymentStatusResponse {
  status: PaymentStatus;
  providerStatus?: string;
  paymentMethod?: string;
  appointmentId?: string;
  paymentId?: string;
  paymentIntentId?: string;
}

export type SubscriptionStatus = "authorized" | "pending" | "paused" | "canceled" | "unknown";

export interface SubscriptionPlanPayload {
  name: string;
  description?: string;
  transaction_amount: number;
  frequency?: number;
  frequency_type?: "days" | "months";
  currency_id?: string;
  back_url?: string;
}

export interface SubscriptionPlan {
  id: string;
  name?: string;
  description?: string;
  preapprovalPlanId?: string;
  transactionAmount: number;
  frequency?: number;
  frequencyType?: "days" | "months";
  currencyId?: string;
  backUrl?: string;
  isActive?: boolean;
}

export interface CreateSubscriptionPayload {
  preapproval_plan_id: string;
  token: string;
  email: string;
}

export interface SubscriptionAttempt {
  id?: string;
  status?: string;
  amount?: number;
  currencyId?: string;
  paymentDate?: string;
  createdAt?: string;
  providerStatus?: string;
  message?: string;
  details?: unknown;
}

export interface SubscriptionProviderEvent {
  id?: string;
  type?: string;
  status?: string;
  date?: string;
  createdAt?: string;
  message?: string;
  data?: unknown;
}

export interface SubscriptionInfo {
  id: string;
  mpPreapprovalId?: string;
  preapprovalPlanId?: string;
  status: SubscriptionStatus;
  providerStatus?: string;
  nextPaymentDate?: string;
  reason?: string;
  transactionAmount?: number;
  currencyId?: string;
  frequency?: number;
  frequencyType?: "days" | "months";
  email?: string;
  isActive?: boolean;
  isCanceled?: boolean;
  subscriptionState?: "ativa" | "cancelada" | "desconhecida" | string;
  attempts: SubscriptionAttempt[];
  providerEvents: SubscriptionProviderEvent[];
}

export interface AdminSubscriber {
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  planName?: string;
  preapprovalPlanId?: string;
  subscriptionId?: string;
  status: SubscriptionStatus;
  isActive?: boolean;
  isCanceled?: boolean;
  subscriptionState?: "ativa" | "cancelada" | "desconhecida" | string;
  transactionAmount?: number;
  currencyId?: string;
}

function getStoredToken() {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setStoredSession(session: AuthResponse) {
  localStorage.setItem(SESSION_TOKEN_KEY, session.token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(session.user));
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}

export function getStoredSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getFriendlyErrorMessage(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return "Nao foi possivel concluir a operacao. Tente novamente.";
  }

  if (error.status === 0) return "Backend indisponivel no momento.";
  if (error.code === "REQUEST_TIMEOUT") return "A requisicao demorou demais. Tente novamente.";
  if (error.status === 401 || error.code === "AUTH_TOKEN_EXPIRED") return "Sessao expirada, faca login novamente.";
  if (error.status === 403 || error.code === "FORBIDDEN_ADMIN_ONLY") return "Acesso restrito.";
  if (error.status === 404) return "Recurso nao encontrado.";
  if (error.code === "42P10") return "Erro interno ao salvar assinatura. O backend precisa ajustar uma constraint no banco.";
  if (error.code === "SLOT_ALREADY_BOOKED") return "Horario ja reservado. Escolha outro.";
  if (error.code === "SLOT_DISABLED") return "Esse horario esta desabilitado.";
  if (error.code === "DAY_DISABLED") return "Esse dia esta indisponivel para atendimento.";
  if (error.code === "PAST_APPOINTMENT") return "Nao e permitido agendar horario passado no dia atual.";
  if (error.code === "PAID_APPOINTMENT_CANNOT_CANCEL") return "Nao e permitido cancelar um agendamento pago.";
  if (error.code === "VALIDATION_ERROR") return "Revise os dados e tente novamente.";
  if (error.code === "SUBSCRIPTION_NOT_FOUND") return "Assinatura nao encontrada.";
  if (error.code === "SUBSCRIPTION_ALREADY_CANCELED") return "Essa assinatura ja foi cancelada.";
  if (error.code === "PROVIDER_UNAVAILABLE") return "Provedor indisponivel, tente em instantes.";
  if (error.code === "INVALID_SERVICE_TYPE") return "Servico invalido. Recarregue e selecione novamente.";

  return error.message || "Erro inesperado ao comunicar com o backend.";
}

function normalizeUser(raw: any): SessionUser {
  return {
    id: String(raw.id ?? raw.user_id ?? raw.userId ?? ""),
    email: raw.email ? String(raw.email) : undefined,
    fullName: raw.full_name ?? raw.fullName ?? undefined,
    phone: raw.phone ?? undefined,
    birthDate: normalizeDateOnly(raw.birth_date ?? raw.birthDate ?? "") || undefined,
    role: raw.role ?? "client",
  };
}

function normalizeBirthdayDiscount(raw: any): BirthdayDiscount {
  const discountPercentRaw =
    raw?.discount_percent ?? raw?.discountPercent ?? raw?.discount_percentage ?? raw?.discountPercentage ?? 0;
  const discountPercent = Number(discountPercentRaw || 0);
  const activeFlag = raw?.active ?? raw?.is_active ?? raw?.applied ?? raw?.enabled;

  return {
    active: Boolean(activeFlag ?? discountPercent > 0),
    serviceType: raw?.service_type ?? raw?.serviceType ?? raw?.service ?? undefined,
    discountPercent: Number.isFinite(discountPercent) ? discountPercent : undefined,
    message: raw?.message ?? raw?.congratulation_message ?? raw?.congratulations_message ?? null,
  };
}

function normalizeTime(rawTime: string) {
  if (!rawTime) return "";

  const trimmed = rawTime.trim();
  if (trimmed.length >= 5) return trimmed.slice(0, 5);
  return trimmed;
}

function normalizeDateOnly(rawDate: unknown) {
  if (rawDate === null || rawDate === undefined) return "";

  const text = String(rawDate).trim();
  if (!text) return "";

  const yyyyMmDd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yyyyMmDd) {
    return `${yyyyMmDd[1]}-${yyyyMmDd[2]}-${yyyyMmDd[3]}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeAppointment(raw: any): Appointment {
  const discountRaw =
    raw.discount ??
    raw.appointment_discount ??
    raw.appointmentDiscount ??
    raw.birthday_discount ??
    raw.birthdayDiscount ??
    null;

  const discountAppliedByFlags = Boolean(
    raw.discount_applied ??
      raw.discountApplied ??
      raw.has_discount ??
      raw.hasDiscount ??
      raw.is_birthday_discount ??
      raw.isBirthdayDiscount,
  );

  const discountType =
    raw.discount_type ??
    raw.discountType ??
    raw.promo_type ??
    raw.promoType ??
    discountRaw?.type ??
    undefined;

  const discountPercentFromRaw =
    discountRaw?.discount_percent ??
    discountRaw?.discountPercent ??
    raw.discount_percent ??
    raw.discountPercent ??
    raw.discount_percentage ??
    raw.discountPercentage;

  const basePriceFromRaw =
    discountRaw?.base_price ??
    discountRaw?.basePrice ??
    raw.base_price ??
    raw.basePrice ??
    raw.original_price ??
    raw.originalPrice;

  const finalPriceFromRaw =
    discountRaw?.final_price ??
    discountRaw?.finalPrice ??
    raw.final_price ??
    raw.finalPrice ??
    raw.price;

  const normalizedDiscountPercent =
    discountPercentFromRaw !== undefined && discountPercentFromRaw !== null
      ? Number(discountPercentFromRaw)
      : undefined;

  const normalizedBasePrice =
    basePriceFromRaw !== undefined && basePriceFromRaw !== null ? Number(basePriceFromRaw) : undefined;

  const normalizedFinalPrice =
    finalPriceFromRaw !== undefined && finalPriceFromRaw !== null ? Number(finalPriceFromRaw) : undefined;

  const isBirthdayType = String(discountType || "").toLowerCase().includes("birthday") || Boolean(raw.is_birthday_discount ?? raw.isBirthdayDiscount);

  const hasAnyDiscountSignal =
    Boolean(discountRaw) ||
    discountAppliedByFlags ||
    isBirthdayType ||
    (normalizedDiscountPercent !== undefined && normalizedDiscountPercent > 0);

  const paymentMethod =
    raw.payment_method ?? raw.paymentMethod ?? raw.payment?.method ?? raw.paymentMethodChoice ?? undefined;

  const subscriptionSource =
    raw.subscription ??
    raw.user_subscription ??
    raw.userSubscription ??
    raw.current_subscription ??
    raw.currentSubscription ??
    raw.user?.subscription ??
    raw.user?.current_subscription ??
    raw.user?.currentSubscription ??
    null;

  const subscriptionStatusRaw =
    raw.subscription_status ??
    raw.subscriptionStatus ??
    subscriptionSource?.status ??
    subscriptionSource?.subscription_status ??
    subscriptionSource?.subscriptionStatus ??
    undefined;

  const normalizedSubscriptionStatus =
    subscriptionStatusRaw !== undefined && subscriptionStatusRaw !== null
      ? normalizeSubscriptionStatus(subscriptionStatusRaw)
      : undefined;

  const subscriptionPlanName =
    raw.subscription_plan_name ??
    raw.subscriptionPlanName ??
    subscriptionSource?.plan_name ??
    subscriptionSource?.planName ??
    subscriptionSource?.name ??
    undefined;

  const subscriptionPlanId =
    raw.subscription_plan_id ??
    raw.subscriptionPlanId ??
    raw.preapproval_plan_id ??
    raw.preapprovalPlanId ??
    subscriptionSource?.preapproval_plan_id ??
    subscriptionSource?.preapprovalPlanId ??
    subscriptionSource?.plan_id ??
    subscriptionSource?.planId ??
    undefined;

  const premiumFlagRaw =
    raw.is_premium_subscriber ??
    raw.isPremiumSubscriber ??
    raw.is_subscriber ??
    raw.isSubscriber ??
    raw.has_active_subscription ??
    raw.hasActiveSubscription ??
    subscriptionSource?.is_premium_subscriber ??
    subscriptionSource?.isPremiumSubscriber ??
    subscriptionSource?.is_active ??
    subscriptionSource?.isActive ??
    undefined;

  const isPremiumSubscriber =
    Boolean(premiumFlagRaw) ||
    (normalizedSubscriptionStatus ? isPremiumSubscriptionStatus(normalizedSubscriptionStatus) : false);

  const subscriptionIsActiveRaw =
    raw.subscription_is_active ??
    raw.subscriptionIsActive ??
    raw.is_active ??
    raw.isActive ??
    subscriptionSource?.is_active ??
    subscriptionSource?.isActive ??
    undefined;

  const subscriptionIsCanceledRaw =
    raw.subscription_is_canceled ??
    raw.subscriptionIsCanceled ??
    raw.is_canceled ??
    raw.isCanceled ??
    subscriptionSource?.is_canceled ??
    subscriptionSource?.isCanceled ??
    undefined;

  const subscriptionStateRaw =
    raw.subscription_state ??
    raw.subscriptionState ??
    subscriptionSource?.subscription_state ??
    subscriptionSource?.subscriptionState ??
    undefined;

  return {
    id: String(raw.id),
    appointmentDate: normalizeDateOnly(raw.appointment_date ?? raw.appointmentDate ?? ""),
    appointmentTime: normalizeTime(String(raw.appointment_time ?? raw.appointmentTime ?? "")),
    status: (raw.status ?? "disponivel") as AppointmentStatus,
    price: Number(raw.price ?? 45),
    serviceType: raw.service_type ?? raw.serviceType ?? undefined,
    serviceLabel: raw.service_label ?? raw.serviceLabel ?? undefined,
    userId: raw.user_id ?? raw.userId ?? undefined,
    fullName: raw.full_name ?? raw.fullName ?? raw.user?.full_name ?? raw.user?.fullName ?? undefined,
    email: raw.email ?? raw.user?.email ?? undefined,
    phone: raw.phone ?? raw.user?.phone ?? undefined,
    birthDate: normalizeDateOnly(raw.birth_date ?? raw.birthDate ?? raw.user?.birth_date ?? raw.user?.birthDate ?? "") || undefined,
    paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
    subscriptionStatus: normalizedSubscriptionStatus,
    subscriptionIsActive:
      subscriptionIsActiveRaw !== undefined && subscriptionIsActiveRaw !== null
        ? Boolean(subscriptionIsActiveRaw)
        : undefined,
    subscriptionIsCanceled:
      subscriptionIsCanceledRaw !== undefined && subscriptionIsCanceledRaw !== null
        ? Boolean(subscriptionIsCanceledRaw)
        : undefined,
    subscriptionState: subscriptionStateRaw ? String(subscriptionStateRaw) : undefined,
    subscriptionPlanName: subscriptionPlanName ? String(subscriptionPlanName) : undefined,
    subscriptionPlanId: subscriptionPlanId ? String(subscriptionPlanId) : undefined,
    isPremiumSubscriber,
    discount: hasAnyDiscountSignal
      ? {
          applied: Boolean(discountRaw?.applied ?? discountAppliedByFlags ?? isBirthdayType ?? false),
          type: discountType,
          discountPercent: normalizedDiscountPercent,
          basePrice: normalizedBasePrice,
          finalPrice: normalizedFinalPrice,
          message:
            discountRaw?.message ??
            raw.discount_message ??
            raw.discountMessage ??
            raw.promo_message ??
            raw.promoMessage ??
            undefined,
        }
      : undefined,
  };
}

function normalizeBarber(raw: any): Barber {
  return {
    id: String(raw?.id ?? raw?.barber_id ?? raw?.barberId ?? ""),
    fullName: String(raw?.full_name ?? raw?.fullName ?? raw?.name ?? ""),
    imageUrl: raw?.image_url ?? raw?.imageUrl ?? raw?.avatar_url ?? raw?.avatarUrl ?? null,
    isActive: Boolean(raw?.is_active ?? raw?.isActive ?? true),
  };
}

function normalizePaymentStatus(statusRaw: unknown): PaymentStatus {
  const normalized = String(statusRaw || "pending").toLowerCase();

  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "pending";
}

function normalizeSubscriptionStatus(statusRaw: unknown): SubscriptionStatus {
  const normalized = String(statusRaw || "").toLowerCase();
  if (normalized === "authorized" || normalized === "active") return "authorized";
  if (normalized === "pending") return "pending";
  if (normalized === "paused") return "paused";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "unknown";
}

function isPremiumSubscriptionStatus(statusRaw: unknown) {
  const normalized = normalizeSubscriptionStatus(statusRaw);
  return normalized === "authorized" || normalized === "pending";
}

function normalizeSubscriptionPlan(raw: any): SubscriptionPlan {
  const transactionAmount = Number(raw?.transaction_amount ?? raw?.transactionAmount ?? 0);

  return {
    id: String(raw?.id ?? raw?.preapproval_plan_id ?? raw?.preapprovalPlanId ?? ""),
    name: raw?.name ?? undefined,
    description: raw?.description ?? undefined,
    preapprovalPlanId: raw?.preapproval_plan_id ?? raw?.preapprovalPlanId ?? raw?.id ?? undefined,
    transactionAmount,
    frequency: Number(raw?.frequency ?? 0) || undefined,
    frequencyType: raw?.frequency_type ?? raw?.frequencyType ?? undefined,
    currencyId: raw?.currency_id ?? raw?.currencyId ?? undefined,
    backUrl: raw?.back_url ?? raw?.backUrl ?? undefined,
    isActive: Boolean(raw?.is_active ?? raw?.isActive ?? raw?.active ?? true),
  };
}

function normalizeSubscriptionAttempt(raw: any): SubscriptionAttempt {
  const createdAt = raw?.created_at ?? raw?.createdAt ?? raw?.payment_date ?? raw?.paymentDate ?? undefined;
  return {
    id: raw?.id ? String(raw.id) : undefined,
    status: raw?.status ?? raw?.attempt_status ?? undefined,
    amount: Number(raw?.amount ?? raw?.transaction_amount ?? 0) || undefined,
    currencyId: raw?.currency_id ?? raw?.currencyId ?? undefined,
    paymentDate: raw?.payment_date ?? raw?.paymentDate ?? createdAt,
    createdAt,
    providerStatus: raw?.provider_status ?? raw?.providerStatus ?? undefined,
    message: raw?.message ?? raw?.description ?? raw?.reason ?? undefined,
    details: raw?.details ?? raw?.payload ?? undefined,
  };
}

function normalizeSubscriptionProviderEvent(raw: any): SubscriptionProviderEvent {
  const createdAt = raw?.created_at ?? raw?.createdAt ?? raw?.date ?? raw?.event_date ?? raw?.eventDate ?? undefined;
  return {
    id: raw?.id ? String(raw.id) : undefined,
    type: raw?.type ?? raw?.event_type ?? raw?.eventType ?? undefined,
    status: raw?.status ?? undefined,
    date: raw?.date ?? raw?.event_date ?? raw?.eventDate ?? createdAt,
    createdAt,
    message: raw?.message ?? raw?.description ?? raw?.reason ?? undefined,
    data: raw?.data ?? raw?.payload ?? raw?.details ?? undefined,
  };
}

function normalizeSubscriptionInfo(raw: any): SubscriptionInfo {
  const source = raw?.subscription ?? raw?.preapproval ?? raw;

  const id = String(source?.id ?? source?.subscription_id ?? source?.subscriptionId ?? source?.preapproval_id ?? source?.preapprovalId ?? "");
  const mpPreapprovalId =
    source?.mp_preapproval_id ??
    source?.mpPreapprovalId ??
    source?.preapproval_id ??
    source?.preapprovalId ??
    source?.provider_reference ??
    source?.providerReference ??
    undefined;

  const nextPaymentDateRaw =
    source?.next_payment_date ??
    source?.nextPaymentDate ??
    source?.next_payment_at ??
    source?.nextPaymentAt ??
    undefined;

  const attempts = extractCollection(source, ["attempts", "payment_attempts", "paymentAttempts"]).map(
    normalizeSubscriptionAttempt,
  );
  const providerEvents = extractCollection(source, ["provider_events", "providerEvents", "events"]).map(
    normalizeSubscriptionProviderEvent,
  );

  return {
    id,
    mpPreapprovalId: mpPreapprovalId ? String(mpPreapprovalId) : undefined,
    preapprovalPlanId: source?.preapproval_plan_id ?? source?.preapprovalPlanId ?? undefined,
    status: normalizeSubscriptionStatus(source?.status),
    providerStatus: source?.provider_status ?? source?.providerStatus ?? undefined,
    nextPaymentDate: nextPaymentDateRaw ? String(nextPaymentDateRaw) : undefined,
    reason: source?.reason ?? source?.description ?? undefined,
    transactionAmount: Number(source?.transaction_amount ?? source?.transactionAmount ?? 0) || undefined,
    currencyId: source?.currency_id ?? source?.currencyId ?? undefined,
    frequency: Number(source?.frequency ?? 0) || undefined,
    frequencyType: source?.frequency_type ?? source?.frequencyType ?? undefined,
    email: source?.email ?? source?.payer_email ?? source?.payerEmail ?? undefined,
    isActive:
      source?.is_active !== undefined && source?.is_active !== null
        ? Boolean(source?.is_active)
        : source?.isActive !== undefined && source?.isActive !== null
          ? Boolean(source?.isActive)
          : undefined,
    isCanceled:
      source?.is_canceled !== undefined && source?.is_canceled !== null
        ? Boolean(source?.is_canceled)
        : source?.isCanceled !== undefined && source?.isCanceled !== null
          ? Boolean(source?.isCanceled)
          : undefined,
    subscriptionState: source?.subscription_state ?? source?.subscriptionState ?? undefined,
    attempts,
    providerEvents,
  };
}

function normalizeAdminSubscriber(raw: any): AdminSubscriber {
  const statusRaw =
    raw.status ??
    raw.subscription_status ??
    raw.subscriptionStatus ??
    raw.subscription?.status ??
    raw.current_subscription?.status ??
    raw.currentSubscription?.status ??
    undefined;

  const status = normalizeSubscriptionStatus(statusRaw);

  const userIdRaw =
    raw.user_id ??
    raw.userId ??
    raw.user?.id ??
    raw.client_id ??
    raw.clientId ??
    raw.customer_id ??
    raw.customerId ??
    raw.id ??
    "";

  const fullName =
    raw.full_name ??
    raw.fullName ??
    raw.user?.full_name ??
    raw.user?.fullName ??
    raw.name ??
    undefined;

  const planName =
    raw.plan_name ??
    raw.planName ??
    raw.subscription_plan_name ??
    raw.subscriptionPlanName ??
    raw.subscription?.plan_name ??
    raw.subscription?.planName ??
    raw.subscription?.name ??
    undefined;

  const preapprovalPlanId =
    raw.preapproval_plan_id ??
    raw.preapprovalPlanId ??
    raw.plan_id ??
    raw.planId ??
    raw.subscription?.preapproval_plan_id ??
    raw.subscription?.preapprovalPlanId ??
    undefined;

  const subscriptionId =
    raw.subscription_id ??
    raw.subscriptionId ??
    raw.id ??
    raw.subscription?.id ??
    undefined;

  const amountRaw =
    raw.transaction_amount ??
    raw.transactionAmount ??
    raw.amount ??
    raw.subscription?.transaction_amount ??
    raw.subscription?.transactionAmount ??
    undefined;

  const transactionAmount =
    amountRaw !== undefined && amountRaw !== null && Number.isFinite(Number(amountRaw))
      ? Number(amountRaw)
      : undefined;

  return {
    userId: String(userIdRaw || ""),
    fullName: fullName ? String(fullName) : undefined,
    email: raw.email ?? raw.user?.email ?? undefined,
    phone: raw.phone ?? raw.user?.phone ?? undefined,
    planName: planName ? String(planName) : undefined,
    preapprovalPlanId: preapprovalPlanId ? String(preapprovalPlanId) : undefined,
    subscriptionId: subscriptionId ? String(subscriptionId) : undefined,
    status,
    isActive:
      raw.is_active !== undefined && raw.is_active !== null
        ? Boolean(raw.is_active)
        : raw.isActive !== undefined && raw.isActive !== null
          ? Boolean(raw.isActive)
          : undefined,
    isCanceled:
      raw.is_canceled !== undefined && raw.is_canceled !== null
        ? Boolean(raw.is_canceled)
        : raw.isCanceled !== undefined && raw.isCanceled !== null
          ? Boolean(raw.isCanceled)
          : undefined,
    subscriptionState:
      raw.subscription_state ??
      raw.subscriptionState ??
      raw.subscription?.subscription_state ??
      raw.subscription?.subscriptionState ??
      undefined,
    transactionAmount,
    currencyId:
      raw.currency_id ??
      raw.currencyId ??
      raw.subscription?.currency_id ??
      raw.subscription?.currencyId ??
      undefined,
  };
}

function normalizePixPaymentResponse(raw: any): PixPaymentResponse {
  return {
    appointmentId: String(raw?.appointmentId ?? raw?.appointment_id ?? ""),
    paymentId: raw?.paymentId ?? raw?.payment_id ?? undefined,
    paymentIntentId: raw?.paymentIntentId ?? raw?.payment_intent_id ?? null,
    paymentStatus: raw?.paymentStatus || raw?.payment_status ? normalizePaymentStatus(raw?.paymentStatus ?? raw?.payment_status) : undefined,
    providerStatus: raw?.providerStatus ?? raw?.provider_status ?? undefined,
    paymentMethod: raw?.paymentMethod ?? raw?.payment_method ?? undefined,
    qrCodeBase64: raw?.qrCodeBase64 ?? raw?.qr_code_base64 ?? undefined,
    qrCodeCopyPaste: raw?.qrCodeCopyPaste ?? raw?.qr_code_copy_paste ?? raw?.qrCode ?? raw?.qr_code ?? undefined,
  };
}

function normalizePointPaymentResponse(raw: any): PointPaymentResponse {
  return {
    appointmentId: String(raw?.appointmentId ?? raw?.appointment_id ?? ""),
    paymentIntentId: raw?.paymentIntentId ?? raw?.payment_intent_id ?? undefined,
    paymentId: raw?.paymentId ?? raw?.payment_id ?? undefined,
    paymentStatus: raw?.paymentStatus || raw?.payment_status ? normalizePaymentStatus(raw?.paymentStatus ?? raw?.payment_status) : undefined,
    providerStatus: raw?.providerStatus ?? raw?.provider_status ?? undefined,
    paymentMethod: raw?.paymentMethod ?? raw?.payment_method ?? undefined,
  };
}

function normalizePaymentStatusResponse(raw: any): PaymentStatusResponse {
  return {
    status: normalizePaymentStatus(raw?.status ?? raw?.paymentStatus ?? raw?.payment_status),
    providerStatus: raw?.providerStatus ?? raw?.provider_status ?? undefined,
    paymentMethod: raw?.paymentMethod ?? raw?.payment_method ?? undefined,
    appointmentId: raw?.appointmentId ?? raw?.appointment_id ?? undefined,
    paymentId: raw?.paymentId ?? raw?.payment_id ?? undefined,
    paymentIntentId: raw?.paymentIntentId ?? raw?.payment_intent_id ?? undefined,
  };
}

function normalizeAppointmentService(raw: any): AppointmentService {
  return {
    key: String(raw.key ?? raw.service_type ?? raw.serviceType ?? ""),
    label: String(raw.label ?? raw.service_label ?? raw.serviceLabel ?? "Servico"),
    price: Number(raw.price ?? 0),
  };
}

function pickFirstDefined(raw: any, paths: string[]) {
  if (!raw || typeof raw !== "object") return undefined;

  for (const path of paths) {
    const segments = path.split(".");
    let current: any = raw;

    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = current[segment];
    }

    if (current !== undefined && current !== null) {
      return current;
    }
  }

  return undefined;
}

function normalizeFinancialReport(raw: any): FinancialReport {
  const source = (pickFirstDefined(raw, ["summary", "financial", "report"]) as any) ?? raw;

  const paidAppointmentsCount = Number(
    pickFirstDefined(source, [
      "revenue.paid_appointments_count",
      "revenue.paidAppointmentsCount",
      "paid_appointments_count",
      "paidAppointmentsCount",
      "paid_count",
      "paidCount",
      "appointments_paid_count",
      "total_paid_appointments",
      "totalPaidAppointments",
      "payments_count",
      "paymentsCount",
    ]) ?? 0,
  );

  const paidAppointmentsRevenue = Number(
    pickFirstDefined(source, [
      "revenue.paid_total",
      "revenue.paidTotal",
      "revenue.gross_revenue",
      "revenue.grossRevenue",
      "paid_appointments_revenue",
      "paidAppointmentsRevenue",
      "gross_revenue",
      "grossRevenue",
      "revenue",
      "total_revenue",
      "totalRevenue",
      "paid_total",
      "paidTotal",
    ]) ?? 0,
  );

  const fixedExpensesTotal = Number(
    pickFirstDefined(source, [
      "expenses.fixed_total",
      "expenses.fixedTotal",
      "fixed_expenses_total",
      "fixedExpensesTotal",
      "fixed_expenses",
      "fixedExpenses",
      "fixed_total",
      "fixedTotal",
    ]) ?? 0,
  );

  const variableExpensesTotal = Number(
    pickFirstDefined(source, [
      "expenses.variable_total",
      "expenses.variableTotal",
      "variable_expenses_total",
      "variableExpensesTotal",
      "variable_expenses",
      "variableExpenses",
      "variable_total",
      "variableTotal",
    ]) ?? 0,
  );

  const totalExpenses = Number(
    pickFirstDefined(source, [
      "expenses.total",
      "expenses.total_expenses",
      "expenses.totalExpenses",
      "total_expenses",
      "totalExpenses",
      "expenses_total",
      "expensesTotal",
      "costs_total",
      "costsTotal",
    ]) ?? 0,
  );

  const netProfit = Number(
    pickFirstDefined(source, ["net_profit", "netProfit", "lucro_liquido", "lucroLiquido", "net"]) ?? 0,
  );

  return {
    period: {
      startDate: normalizeDateOnly(
        pickFirstDefined(source, [
          "period.start_date",
          "period.startDate",
          "start_date",
          "startDate",
          "range.start",
        ]) ?? "",
      ),
      endDate: normalizeDateOnly(
        pickFirstDefined(source, ["period.end_date", "period.endDate", "end_date", "endDate", "range.end"]) ?? "",
      ),
    },
    paidAppointmentsCount,
    paidAppointmentsRevenue,
    fixedExpensesTotal,
    variableExpensesTotal,
    totalExpenses,
    netProfit,
  };
}

function normalizeFixedExpense(raw: any): FixedExpense {
  const title = String(raw.title ?? raw.name ?? raw.description ?? "");
  const amount = Number(raw.amount ?? raw.value ?? 0);
  const startsOn = normalizeDateOnly(raw.starts_on ?? raw.startsOn ?? raw.start_date ?? raw.startDate ?? "");
  const endsOn = normalizeDateOnly(raw.ends_on ?? raw.endsOn ?? raw.end_date ?? raw.endDate ?? "") || undefined;
  const fallbackId = `${title || "expense"}-${startsOn || "no-date"}-${amount}`;

  return {
    id: String(raw.id ?? raw.expense_id ?? raw.expenseId ?? raw.fixed_expense_id ?? raw.fixedExpenseId ?? fallbackId),
    title,
    amount,
    startsOn,
    endsOn,
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
    notes: raw.notes ? String(raw.notes) : undefined,
  };
}

function normalizeVariableExpense(raw: any): VariableExpense {
  const title = String(raw.title ?? raw.name ?? raw.description ?? "");
  const amount = Number(raw.amount ?? raw.value ?? 0);
  const expenseDate = normalizeDateOnly(raw.expense_date ?? raw.expenseDate ?? raw.date ?? "");
  const fallbackId = `${title || "expense"}-${expenseDate || "no-date"}-${amount}`;

  return {
    id: String(raw.id ?? raw.expense_id ?? raw.expenseId ?? raw.variable_expense_id ?? raw.variableExpenseId ?? fallbackId),
    title,
    amount,
    expenseDate,
    notes: raw.notes ? String(raw.notes) : undefined,
  };
}

function normalizeSlot(raw: any): AppointmentSlot {
  const overrideIdRaw =
    raw.day_hour_override_id ?? raw.dayHourOverrideId ?? raw.day_hour_id ?? raw.dayHourId ?? raw.override_id ?? raw.overrideId;

  const barberIdRaw = raw.barber_id ?? raw.barberId ?? raw.barber?.id;
  const barberNameRaw = raw.barber_name ?? raw.barberName ?? raw.barber?.full_name ?? raw.barber?.fullName;

  return {
    time: normalizeTime(String(raw.time ?? raw.appointment_time ?? raw.appointmentTime ?? "")),
    status: (raw.status ?? "disponivel") as AppointmentStatus,
    appointmentId: raw.appointment_id ?? raw.appointmentId ?? undefined,
    reason: raw.reason ?? undefined,
    dayHourOverrideId: overrideIdRaw ? String(overrideIdRaw) : undefined,
    barberId: barberIdRaw ? String(barberIdRaw) : undefined,
    barberName: barberNameRaw ? String(barberNameRaw) : undefined,
  };
}

function normalizeDayHour(raw: any): DayHour {
  const time = normalizeTime(String(raw.time ?? raw.slot_time ?? raw.slotTime ?? ""));
  const date = normalizeDateOnly(raw.date ?? raw.day ?? raw.appointment_date ?? raw.appointmentDate ?? "");

  const barberIdRaw = raw.barber_id ?? raw.barberId ?? raw.barber?.id;
  const barberNameRaw = raw.barber_name ?? raw.barberName ?? raw.barber?.full_name ?? raw.barber?.fullName;

  const fallbackId = `${date || "no-date"}-${time || "no-time"}-${String(barberIdRaw || "global")}`;
  const id = String(raw.id ?? raw.day_hour_id ?? raw.dayHourId ?? raw.override_id ?? raw.overrideId ?? fallbackId);

  return {
    id,
    date,
    slotTime: time,
    time,
    isEnabled: Boolean(raw.is_enabled ?? raw.isEnabled ?? true),
    reason: raw.reason ? String(raw.reason) : undefined,
    barberId: barberIdRaw ? String(barberIdRaw) : undefined,
    barberName: barberNameRaw ? String(barberNameRaw) : undefined,
    createdAt: raw.created_at ?? raw.createdAt ?? undefined,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? undefined,
  };
}

function normalizeSlotsMeta(raw: any): SlotsMeta {
  return {
    timezone: raw?.timezone ?? undefined,
    serverNowDate: raw?.server_now_date ?? raw?.serverNowDate ?? undefined,
    serverNow: raw?.server_now ?? raw?.serverNow ?? undefined,
    weekStart: raw?.week_start ?? raw?.weekStart ?? undefined,
    weekEnd: raw?.week_end ?? raw?.weekEnd ?? undefined,
    bookingWindowStart: normalizeDateOnly(raw?.booking_window_start ?? raw?.bookingWindowStart ?? raw?.window_start ?? raw?.windowStart ?? "") || undefined,
    bookingWindowEnd: normalizeDateOnly(raw?.booking_window_end ?? raw?.bookingWindowEnd ?? raw?.window_end ?? raw?.windowEnd ?? "") || undefined,
    retentionStart: normalizeDateOnly(raw?.retention_start ?? raw?.retentionStart ?? "") || undefined,
  };
}

function extractCollection<T = any>(raw: any, keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (!raw || typeof raw !== "object") return [];

  for (const key of keys) {
    const value = (raw as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }

  return [];
}

async function parseResponse<T>(response: Response): Promise<T> {
  const hasBody = response.status !== 204;
  const raw = hasBody ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    logApiDebug("HTTP error response", {
      url: response.url,
      status: response.status,
      body: raw,
    });

    const apiError = (raw as ApiFailure | null)?.error;
    throw new ApiClientError(
      apiError?.message || `Request failed with status ${response.status}`,
      response.status,
      apiError?.code,
      apiError?.details,
    );
  }

  if (raw && typeof raw === "object" && "success" in raw) {
    const envelope = raw as ApiSuccess<T> | ApiFailure;
    if (envelope.success === false) {
      throw new ApiClientError(
        envelope.error?.message || "Backend retornou erro.",
        response.status,
        envelope.error?.code,
        envelope.error?.details,
      );
    }

    return (envelope as ApiSuccess<T>).data;
  }

  return raw as T;
}

async function apiRequest<T>(path: string, init?: RequestInit, requiresAuth = true): Promise<T> {
  if (!hasApiBaseUrl) {
    throw new ApiClientError("VITE_FRONTEND_API_URL nao configurada.", 0, "API_URL_MISSING");
  }

  const headers = new Headers(init?.headers || {});
  headers.set("Content-Type", "application/json");

  if (requiresAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const method = (init?.method || "GET").toUpperCase();
    if (method === "GET") {
      headers.set("Cache-Control", "no-cache, no-store, max-age=0");
      headers.set("Pragma", "no-cache");
    }

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
      cache: method === "GET" ? "no-store" : init?.cache,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiClientError("Tempo limite excedido na requisicao.", 0, "REQUEST_TIMEOUT");
    }

    logApiDebug("Network error", {
      path,
      method: init?.method || "GET",
      error: error instanceof Error ? error.message : String(error),
    });
    throw new ApiClientError("Falha de conexao com backend.", 0, "BACKEND_UNAVAILABLE", error);
  } finally {
    window.clearTimeout(timeoutId);
  }

  return parseResponse<T>(response);
}

export function getBackendHealth() {
  return apiRequest<BackendHealth>("/api/health", { method: "GET" }, false);
}

export async function register(payload: RegisterPayload) {
  await apiRequest<unknown>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        full_name: payload.fullName,
        email: payload.email || undefined,
        phone: payload.phone,
        birth_date: payload.birthDate,
        password: payload.password,
      }),
    },
    false,
  );
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const data = await apiRequest<any>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        phone: payload.phone,
        password: payload.password,
      }),
    },
    false,
  );

  return {
    token: data.token ?? data.access_token,
    user: normalizeUser(data.user ?? data.profile ?? data),
  };
}

export async function me(): Promise<SessionInfo> {
  const data = await apiRequest<any>("/api/auth/me", { method: "GET" }, true);

  const source = data?.user ? data : { user: data, birthday_discount: null };
  return {
    user: normalizeUser(source.user ?? source),
    birthdayDiscount: normalizeBirthdayDiscount(source.birthday_discount ?? source.birthdayDiscount ?? null),
  };
}

export async function getSlotsByDate(date: string, barberId: string): Promise<SlotsByDateResponse> {
  const safeDate = String(date || "").trim();
  const safeBarberId = String(barberId || "").trim();
  if (!safeDate || !safeBarberId) {
    throw new ApiClientError("Data e barbeiro sao obrigatorios para consultar horarios.", 400, "VALIDATION_ERROR");
  }

  const query = new URLSearchParams({ date: safeDate, _t: String(Date.now()) });
  query.set("barber_id", safeBarberId);

  const data = await apiRequest<any>(`/api/appointments/slots?${query.toString()}`, { method: "GET" }, true);
  const slots = extractCollection(data, ["slots", "appointmentSlots", "items"]);
  const meta = normalizeSlotsMeta(data?.meta ?? data);

  return {
    slots: slots.map(normalizeSlot).filter((slot) => slot.time.length > 0),
    meta,
  };
}

export async function getAppointmentServices(): Promise<AppointmentService[]> {
  const data = await apiRequest<any>(`/api/appointments/services?_t=${Date.now()}`, { method: "GET" }, true);
  const services = extractCollection(data, ["services", "items"]);

  return services
    .map(normalizeAppointmentService)
    .filter((service) => service.key.length > 0 && service.label.length > 0);
}

export async function getBarbers(activeOnly = false): Promise<Barber[]> {
  const endpoint = activeOnly ? "/api/barbers/active" : "/api/barbers";

  try {
    const data = await apiRequest<any>(`${endpoint}?_t=${Date.now()}`, { method: "GET" }, true);
    const barbers = extractCollection(data, ["barbers", "items"]);
    return barbers.map(normalizeBarber).filter((barber) => barber.id.length > 0 && barber.fullName.length > 0);
  } catch (error) {
    if (activeOnly && error instanceof ApiClientError && error.status === 404) {
      const fallback = await apiRequest<any>(`/api/barbers?_t=${Date.now()}`, { method: "GET" }, true);
      const barbers = extractCollection(fallback, ["barbers", "items"]);
      return barbers
        .map(normalizeBarber)
        .filter((barber) => barber.id.length > 0 && barber.fullName.length > 0 && barber.isActive);
    }

    throw error;
  }
}

export async function getMyAppointments(): Promise<Appointment[]> {
  const data = await apiRequest<any>("/api/appointments/me", { method: "GET" }, true);
  const appointments = extractCollection(data, ["appointments", "items"]);
  return appointments.map(normalizeAppointment);
}

export async function createAppointment(input: {
  date: string;
  time: string;
  serviceType: string;
  barberId: string;
  paymentMethod?: string;
}): Promise<Appointment> {
  const date = String(input.date || "").trim();
  const time = normalizeTime(input.time);
  const serviceType = String(input.serviceType || "").trim();
  const barberId = String(input.barberId || "").trim();
  if (!date || !time || !serviceType || !barberId) {
    throw new ApiClientError("Servico, barbeiro, data e horario sao obrigatorios.", 400, "VALIDATION_ERROR");
  }

  const payload: Record<string, unknown> = {
    appointment_date: date,
    appointment_time: time,
    service_type: serviceType,
    barber_id: barberId,
  };
  if (input.paymentMethod) {
    payload.payment_method = input.paymentMethod;
  }

  const data = await apiRequest<any>(
    "/api/appointments",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true,
  );

  return normalizeAppointment(data?.appointment ?? data);
}

export async function cancelMyAppointment(id: string) {
  await apiRequest<unknown>(`/api/appointments/${id}`, { method: "DELETE" }, true);
}

export async function getAdminAppointmentsByDate(date: string): Promise<Appointment[]> {
  const data = await apiRequest<any>(`/api/admin/appointments?date=${encodeURIComponent(date)}`, { method: "GET" }, true);
  const appointments = extractCollection(data, ["appointments", "items"]);
  return appointments.map(normalizeAppointment);
}

export async function getAdminDayHoursByDate(date: string): Promise<DayHour[]> {
  const safeDate = normalizeDateOnly(date);
  if (!safeDate) {
    throw new ApiClientError("Data invalida para consultar grade diaria.", 400, "VALIDATION_ERROR");
  }

  const query = new URLSearchParams({ date: safeDate, _t: String(Date.now()) }).toString();
  const data = await apiRequest<any>(`/api/admin/schedule/day-hours?${query}`, { method: "GET" }, true);
  const rows = extractCollection(data, ["day_hours", "dayHours", "overrides", "items", "rows"]);
  return rows.map(normalizeDayHour).filter((item) => item.time.length > 0);
}

export async function getAdminDayHoursByRange(from: string, to: string): Promise<DayHour[]> {
  const safeFrom = normalizeDateOnly(from);
  const safeTo = normalizeDateOnly(to);
  if (!safeFrom || !safeTo) {
    throw new ApiClientError("Periodo invalido para consultar grade diaria.", 400, "VALIDATION_ERROR");
  }

  const query = new URLSearchParams({ from: safeFrom, to: safeTo, _t: String(Date.now()) }).toString();
  const data = await apiRequest<any>(`/api/admin/schedule/day-hours?${query}`, { method: "GET" }, true);
  const rows = extractCollection(data, ["day_hours", "dayHours", "overrides", "items", "rows"]);
  return rows.map(normalizeDayHour).filter((item) => item.time.length > 0);
}

export async function createAdminDayHour(payload: CreateDayHourPayload): Promise<DayHour> {
  const safeDate = normalizeDateOnly(payload.date);
  const safeTime = normalizeTime(payload.time);

  if (!safeDate || !safeTime) {
    throw new ApiClientError("Data e horario sao obrigatorios.", 400, "VALIDATION_ERROR");
  }

  const data = await apiRequest<any>(
    "/api/admin/schedule/day-hours",
    {
      method: "POST",
      body: JSON.stringify({
        date: safeDate,
        time: safeTime,
        isEnabled: payload.isEnabled,
        reason: payload.reason || undefined,
      }),
    },
    true,
  );

  return normalizeDayHour(data?.day_hour ?? data?.dayHour ?? data?.override ?? data);
}

export async function updateAdminDayHour(id: string, payload: UpdateDayHourPayload): Promise<DayHour> {
  const safeId = String(id || "").trim();
  if (!safeId) {
    throw new ApiClientError("ID do horario e obrigatorio.", 400, "VALIDATION_ERROR");
  }

  const body: Record<string, unknown> = {};
  if (payload.date !== undefined) body.date = normalizeDateOnly(payload.date);
  if (payload.time !== undefined) body.time = normalizeTime(payload.time);
  if (payload.isEnabled !== undefined) body.isEnabled = payload.isEnabled;
  if (payload.reason !== undefined) body.reason = payload.reason || undefined;

  const data = await apiRequest<any>(
    `/api/admin/schedule/day-hours/${encodeURIComponent(safeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
    true,
  );

  return normalizeDayHour(data?.day_hour ?? data?.dayHour ?? data?.override ?? data);
}

export async function deleteAdminDayHour(id: string): Promise<void> {
  const safeId = String(id || "").trim();
  if (!safeId) {
    throw new ApiClientError("ID do horario e obrigatorio.", 400, "VALIDATION_ERROR");
  }

  await apiRequest<unknown>(`/api/admin/schedule/day-hours/${encodeURIComponent(safeId)}`, { method: "DELETE" }, true);
}

export async function getAdminBarbers(): Promise<Barber[]> {
  const data = await apiRequest<any>("/api/admin/barbers", { method: "GET" }, true);
  const barbers = extractCollection(data, ["barbers", "items"]);
  return barbers.map(normalizeBarber).filter((barber) => barber.id.length > 0 && barber.fullName.length > 0);
}

export async function createAdminBarber(payload: CreateBarberPayload): Promise<Barber> {
  const data = await apiRequest<any>(
    "/api/admin/barbers",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true,
  );

  return normalizeBarber(data?.barber ?? data);
}

export async function updateAdminBarber(id: string, payload: UpdateBarberPayload): Promise<Barber> {
  const data = await apiRequest<any>(
    `/api/admin/barbers/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    true,
  );

  return normalizeBarber(data?.barber ?? data);
}

export async function deactivateAdminBarber(id: string): Promise<void> {
  try {
    await apiRequest<unknown>(`/api/admin/barbers/${id}`, { method: "DELETE" }, true);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      await apiRequest<unknown>(
        `/api/admin/barbers/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        },
        true,
      );
      return;
    }

    throw error;
  }
}

export async function updateAdminAppointmentStatus(id: string, status: AppointmentStatus) {
  await apiRequest<unknown>(
    `/api/admin/appointments/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    true,
  );
}

export async function deleteAdminAppointment(id: string) {
  await apiRequest<unknown>(`/api/admin/appointments/${id}`, { method: "DELETE" }, true);
}

export async function getAdminFinancialReport(startDate: string, endDate: string): Promise<FinancialReport> {
  const query = new URLSearchParams({ startDate, endDate }).toString();
  const data = await apiRequest<any>(`/api/admin/reports/financial?${query}`, { method: "GET" }, true);
  return normalizeFinancialReport(data?.report ?? data?.summary ?? data?.financial ?? data);
}

export async function getAdminFixedExpenses(): Promise<FixedExpense[]> {
  const data = await apiRequest<any>("/api/admin/expenses/fixed", { method: "GET" }, true);
  const expenses = extractCollection(data, ["fixedExpenses", "fixed_expenses", "expenses", "items", "rows"]);
  return expenses.map(normalizeFixedExpense).filter((expense) => expense.title.length > 0 || expense.amount > 0);
}

export async function createAdminFixedExpense(payload: CreateFixedExpensePayload): Promise<FixedExpense> {
  const data = await apiRequest<any>(
    "/api/admin/expenses/fixed",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true,
  );

  return normalizeFixedExpense(data?.fixed_expense ?? data?.expense ?? data);
}

export async function updateAdminFixedExpense(id: string, payload: UpdateFixedExpensePayload): Promise<FixedExpense> {
  const safeId = String(id || "").trim();
  if (!safeId) {
    throw new ApiClientError("ID do gasto fixo e obrigatorio.", 400, "VALIDATION_ERROR");
  }

  if (Object.keys(payload || {}).length === 0) {
    throw new ApiClientError("Nenhum campo alterado para atualizar.", 400, "VALIDATION_ERROR");
  }

  const data = await apiRequest<any>(
    `/api/admin/expenses/fixed/${encodeURIComponent(safeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    true,
  );

  return normalizeFixedExpense(data?.fixed_expense ?? data?.expense ?? data);
}

export async function getAdminVariableExpenses(startDate: string, endDate: string): Promise<VariableExpense[]> {
  const query = new URLSearchParams({ startDate, endDate }).toString();
  const data = await apiRequest<any>(`/api/admin/expenses/variable?${query}`, { method: "GET" }, true);
  const expenses = extractCollection(data, ["variableExpenses", "variable_expenses", "expenses", "items", "rows"]);
  return expenses.map(normalizeVariableExpense).filter((expense) => expense.title.length > 0 || expense.amount > 0);
}

export async function createAdminVariableExpense(payload: CreateVariableExpensePayload): Promise<VariableExpense> {
  const data = await apiRequest<any>(
    "/api/admin/expenses/variable",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    true,
  );

  return normalizeVariableExpense(data?.variable_expense ?? data?.expense ?? data);
}

export async function updateAdminVariableExpense(id: string, payload: UpdateVariableExpensePayload): Promise<VariableExpense> {
  const safeId = String(id || "").trim();
  if (!safeId) {
    throw new ApiClientError("ID do gasto variavel e obrigatorio.", 400, "VALIDATION_ERROR");
  }

  if (Object.keys(payload || {}).length === 0) {
    throw new ApiClientError("Nenhum campo alterado para atualizar.", 400, "VALIDATION_ERROR");
  }

  const data = await apiRequest<any>(
    `/api/admin/expenses/variable/${encodeURIComponent(safeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    true,
  );

  return normalizeVariableExpense(data?.variable_expense ?? data?.expense ?? data);
}

export async function createPixPayment(input: {
  appointmentId: string;
  description?: string;
  payerEmail?: string;
  payerName?: string;
  idempotencyKey?: string;
}): Promise<PixPaymentResponse> {
  const headers: Record<string, string> = {};
  if (input.idempotencyKey) {
    headers["X-Idempotency-Key"] = input.idempotencyKey;
  }

  const data = await apiRequest<any>(
    "/api/payments/create-pix",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        appointment_id: input.appointmentId,
        description: input.description,
        payer_email: input.payerEmail,
        payer_name: input.payerName,
      }),
    },
    true,
  );

  return normalizePixPaymentResponse(data);
}

export async function createPointPayment(input: {
  appointmentId: string;
  description?: string;
  idempotencyKey?: string;
}): Promise<PointPaymentResponse> {
  const headers: Record<string, string> = {};
  if (input.idempotencyKey) {
    headers["X-Idempotency-Key"] = input.idempotencyKey;
  }

  const data = await apiRequest<any>(
    "/api/payments/create-point",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        appointment_id: input.appointmentId,
        description: input.description,
      }),
    },
    true,
  );

  return normalizePointPaymentResponse(data);
}

export async function getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
  const data = await apiRequest<any>(`/api/payments/status/${encodeURIComponent(reference)}`, { method: "GET" }, true);
  return normalizePaymentStatusResponse(data);
}

export async function cancelPayment(reference: string): Promise<PaymentStatusResponse> {
  try {
    const data = await apiRequest<any>(`/api/payments/cancel/${encodeURIComponent(reference)}`, { method: "POST" }, true);
    return normalizePaymentStatusResponse(data);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      const data = await apiRequest<any>(`/api/payments/cancel/${encodeURIComponent(reference)}`, { method: "DELETE" }, true);
      return normalizePaymentStatusResponse(data);
    }

    throw error;
  }
}

export async function createSubscriptionPlan(payload: SubscriptionPlanPayload): Promise<SubscriptionPlan> {
  const safeName = String(payload.name || "").trim();
  const safeAmount = Number(payload.transaction_amount || 0);
  if (!safeName || !Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new ApiClientError("Nome e valor do plano sao obrigatorios.", 400, "VALIDATION_ERROR");
  }

  const modernBody = {
    name: safeName,
    description: payload.description || undefined,
    transaction_amount: safeAmount,
    frequency: payload.frequency ?? 1,
    frequency_type: payload.frequency_type ?? "months",
    currency_id: payload.currency_id ?? "BRL",
    back_url: payload.back_url || undefined,
  };

  logApiDebug("Creating subscription plan (modern payload)", {
    endpoint: "/api/payments/subscriptions/plans",
    payload: modernBody,
  });

  try {
    const data = await apiRequest<any>(
      "/api/payments/subscriptions/plans",
      {
        method: "POST",
        body: JSON.stringify(modernBody),
      },
      true,
    );

    return normalizeSubscriptionPlan(data?.plan ?? data?.subscription_plan ?? data);
  } catch (error) {
    logApiDebug("Create plan failed (modern payload)", {
      status: error instanceof ApiClientError ? error.status : undefined,
      code: error instanceof ApiClientError ? error.code : undefined,
      message: error instanceof Error ? error.message : String(error),
      details: error instanceof ApiClientError ? error.details : undefined,
    });
    throw error;
  }
}

export async function getAdminSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  logApiDebug("Fetching admin subscription plans", {
    endpoint: "/api/payments/subscriptions/plans",
  });

  const data = await apiRequest<any>(
    `/api/payments/subscriptions/plans?_t=${Date.now()}`,
    { method: "GET" },
    true,
  );

  const plans = extractCollection(data, ["plans", "items"]);
  return plans.map(normalizeSubscriptionPlan);
}

export async function getAdminSubscribers(): Promise<AdminSubscriber[]> {
  const candidateEndpoints = [
    "/api/admin/subscribers",
    "/api/admin/subscriptions/subscribers",
    "/api/payments/subscriptions/admin/subscribers",
    "/api/payments/subscriptions/subscribers",
    "/api/admin/subscriptions",
  ];

  let lastError: unknown = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const data = await apiRequest<any>(`${endpoint}?_t=${Date.now()}`, { method: "GET" }, true);
      const rows = extractCollection(data, ["subscribers", "subscriptions", "items", "rows"]);
      return rows
        .map(normalizeAdminSubscriber)
        .filter((item) => item.userId.length > 0);
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

export async function toggleSubscriptionPlan(reference: string, isActive: boolean): Promise<SubscriptionPlan> {
  const safeReference = String(reference || "").trim();
  if (!safeReference) {
    throw new ApiClientError("Referencia do plano e obrigatoria.", 400, "VALIDATION_ERROR");
  }

  logApiDebug("Toggling subscription plan", {
    endpoint: `/api/payments/subscriptions/plans/${safeReference}`,
    is_active: isActive,
  });

  const data = await apiRequest<any>(
    `/api/payments/subscriptions/plans/${encodeURIComponent(safeReference)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_active: isActive }),
    },
    true,
  );

  return normalizeSubscriptionPlan(data?.plan ?? data?.subscription_plan ?? data);
}

export async function createSubscription(payload: CreateSubscriptionPayload): Promise<SubscriptionInfo> {
  const safePlanId = String(payload.preapproval_plan_id || "").trim();
  const safeToken = String(payload.token || "").trim();
  const safeEmail = String(payload.email || "").trim();

  if (!safePlanId || !safeToken || !safeEmail) {
    throw new ApiClientError("Plano, token e email sao obrigatorios.", 400, "VALIDATION_ERROR");
  }

  const data = await apiRequest<any>(
    "/api/payments/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        preapproval_plan_id: safePlanId,
        token: safeToken,
        email: safeEmail,
      }),
    },
    true,
  );

  return normalizeSubscriptionInfo(data);
}

export async function getPublicSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const data = await apiRequest<any>(
    `/api/payments/subscriptions/plans/public?_t=${Date.now()}`,
    { method: "GET" },
    false,
  );

  const plans = extractCollection(data, ["plans", "items"]);
  return plans
    .map(normalizeSubscriptionPlan)
    .filter((plan) => Boolean(plan.preapprovalPlanId || plan.id));
}

export async function getSubscription(reference: string): Promise<SubscriptionInfo> {
  const safeReference = String(reference || "").trim();
  if (!safeReference) {
    throw new ApiClientError("Referencia da assinatura e obrigatoria.", 400, "VALIDATION_ERROR");
  }

  const data = await apiRequest<any>(
    `/api/payments/subscriptions/${encodeURIComponent(safeReference)}`,
    { method: "GET" },
    true,
  );

  return normalizeSubscriptionInfo(data);
}

export async function getMySubscription(): Promise<SubscriptionInfo | null> {
  const candidateEndpoints = [
    "/api/payments/subscriptions/me",
    "/api/payments/subscriptions/current",
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const data = await apiRequest<any>(`${endpoint}?_t=${Date.now()}`, { method: "GET" }, true);
      return normalizeSubscriptionInfo(data);
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 404 || error.status === 405)) {
        continue;
      }

      if (error instanceof ApiClientError && error.code === "SUBSCRIPTION_NOT_FOUND") {
        return null;
      }

      throw error;
    }
  }

  return null;
}

export async function cancelSubscription(reference: string): Promise<SubscriptionInfo> {
  const safeReference = String(reference || "").trim();
  if (!safeReference) {
    throw new ApiClientError("Referencia da assinatura e obrigatoria.", 400, "VALIDATION_ERROR");
  }

  const data = await apiRequest<any>(
    `/api/payments/subscriptions/${encodeURIComponent(safeReference)}/cancel`,
    { method: "POST" },
    true,
  );

  return normalizeSubscriptionInfo(data);
}
