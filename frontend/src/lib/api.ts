const rawApiBaseUrl =
  import.meta.env.VITE_FRONTEND_API_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "https://chincoa-backend.onrender.com");

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");
export const hasApiBaseUrl = API_BASE_URL.length > 0;
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

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

export interface CreateVariableExpensePayload {
  title: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

export interface AppointmentSlot {
  time: string;
  status: AppointmentStatus;
  appointmentId?: string;
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
  if (error.status === 401 || error.code === "AUTH_TOKEN_EXPIRED") return "Sessao expirada. Faça login novamente.";
  if (error.status === 403 || error.code === "FORBIDDEN_ADMIN_ONLY") return "Voce nao tem permissao para esta acao.";
  if (error.status === 404) return "Recurso nao encontrado.";
  if (error.code === "SLOT_ALREADY_BOOKED") return "Horario ja reservado. Escolha outro.";
  if (error.code === "SLOT_DISABLED") return "Esse horario esta desabilitado.";
  if (error.code === "DAY_DISABLED") return "Esse dia esta indisponivel para atendimento.";
  if (error.code === "PAST_APPOINTMENT") return "Nao e permitido agendar horario passado no dia atual.";
  if (error.code === "VALIDATION_ERROR") return "Dados invalidos para esta operacao.";
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

function normalizePixPaymentResponse(raw: any): PixPaymentResponse {
  return {
    appointmentId: String(raw?.appointmentId ?? raw?.appointment_id ?? ""),
    paymentId: raw?.paymentId ?? raw?.payment_id ?? undefined,
    paymentIntentId: raw?.paymentIntentId ?? raw?.payment_intent_id ?? null,
    paymentStatus: raw?.paymentStatus || raw?.payment_status ? normalizePaymentStatus(raw?.paymentStatus ?? raw?.payment_status) : undefined,
    providerStatus: raw?.providerStatus ?? raw?.provider_status ?? undefined,
    paymentMethod: raw?.paymentMethod ?? raw?.payment_method ?? undefined,
    qrCodeBase64: raw?.qrCodeBase64 ?? raw?.qr_code_base64 ?? undefined,
    qrCodeCopyPaste: raw?.qrCodeCopyPaste ?? raw?.qr_code_copy_paste ?? undefined,
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
  return {
    time: normalizeTime(String(raw.time ?? raw.appointment_time ?? raw.appointmentTime ?? "")),
    status: (raw.status ?? "disponivel") as AppointmentStatus,
    appointmentId: raw.appointment_id ?? raw.appointmentId ?? undefined,
    reason: raw.reason ?? undefined,
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

export async function getSlotsByDate(date: string, barberId?: string): Promise<SlotsByDateResponse> {
  const query = new URLSearchParams({ date, _t: String(Date.now()) });
  if (barberId) {
    query.set("barber_id", barberId);
  }

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
  const time = normalizeTime(input.time);
  const serviceType = String(input.serviceType || "").trim();
  const barberId = String(input.barberId || "").trim();

  const data = await apiRequest<any>(
    "/api/appointments",
    {
      method: "POST",
      body: JSON.stringify({
        appointment_date: input.date,
        appointment_time: time,
        service_type: serviceType,
        barber_id: barberId,
        payment_method: input.paymentMethod || undefined,
        appointmentDate: input.date,
        appointmentTime: time,
        serviceType,
        barberId,
        paymentMethod: input.paymentMethod || undefined,
      }),
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
