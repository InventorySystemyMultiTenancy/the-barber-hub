const rawApiBaseUrl =
  import.meta.env.VITE_FRONTEND_API_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3001" : "https://chincoa-backend.onrender.com");

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");
export const hasApiBaseUrl = API_BASE_URL.length > 0;

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
  email: string;
  fullName?: string;
  phone?: string;
  role?: "admin" | "client" | string;
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
  userId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
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
}

export interface SlotsByDateResponse {
  slots: AppointmentSlot[];
  meta: SlotsMeta;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: SessionUser;
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
  if (error.status === 401 || error.code === "AUTH_TOKEN_EXPIRED") return "Sessao expirada. Faça login novamente.";
  if (error.status === 403 || error.code === "FORBIDDEN_ADMIN_ONLY") return "Voce nao tem permissao para esta acao.";
  if (error.status === 404) return "Recurso nao encontrado.";
  if (error.code === "SLOT_ALREADY_BOOKED") return "Horario ja reservado. Escolha outro.";
  if (error.code === "SLOT_DISABLED") return "Esse horario esta desabilitado.";
  if (error.code === "DAY_DISABLED") return "Esse dia esta indisponivel para atendimento.";
  if (error.code === "PAST_APPOINTMENT") return "Nao e permitido agendar horario passado no dia atual.";
  if (error.code === "VALIDATION_ERROR") return "Dados invalidos para esta operacao.";

  return error.message || "Erro inesperado ao comunicar com o backend.";
}

function normalizeUser(raw: any): SessionUser {
  return {
    id: String(raw.id ?? raw.user_id ?? raw.userId ?? ""),
    email: String(raw.email ?? ""),
    fullName: raw.full_name ?? raw.fullName ?? undefined,
    phone: raw.phone ?? undefined,
    role: raw.role ?? "client",
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
  return {
    id: String(raw.id),
    appointmentDate: normalizeDateOnly(raw.appointment_date ?? raw.appointmentDate ?? ""),
    appointmentTime: normalizeTime(String(raw.appointment_time ?? raw.appointmentTime ?? "")),
    status: (raw.status ?? "disponivel") as AppointmentStatus,
    price: Number(raw.price ?? 45),
    userId: raw.user_id ?? raw.userId ?? undefined,
    fullName: raw.full_name ?? raw.fullName ?? raw.user?.full_name ?? raw.user?.fullName ?? undefined,
    email: raw.email ?? raw.user?.email ?? undefined,
    phone: raw.phone ?? raw.user?.phone ?? undefined,
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
  try {
    const method = (init?.method || "GET").toUpperCase();
    if (method === "GET") {
      headers.set("Cache-Control", "no-cache, no-store, max-age=0");
      headers.set("Pragma", "no-cache");
    }

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: method === "GET" ? "no-store" : init?.cache,
    });
  } catch (error) {
    throw new ApiClientError("Falha de conexao com backend.", 0, "BACKEND_UNAVAILABLE", error);
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
        fullName: payload.fullName,
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone,
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
      body: JSON.stringify(payload),
    },
    false,
  );

  return {
    token: data.token ?? data.access_token,
    user: normalizeUser(data.user ?? data.profile ?? data),
  };
}

export async function me(): Promise<SessionUser> {
  const data = await apiRequest<any>("/api/auth/me", { method: "GET" }, true);
  return normalizeUser(data.user ?? data);
}

export async function getSlotsByDate(date: string): Promise<SlotsByDateResponse> {
  const data = await apiRequest<any>(`/api/appointments/slots?date=${encodeURIComponent(date)}&_t=${Date.now()}`, { method: "GET" }, true);
  const slots = extractCollection(data, ["slots", "appointmentSlots", "items"]);
  const meta = normalizeSlotsMeta(data?.meta ?? data);

  return {
    slots: slots.map(normalizeSlot).filter((slot) => slot.time.length > 0),
    meta,
  };
}

export async function getMyAppointments(): Promise<Appointment[]> {
  const data = await apiRequest<any>("/api/appointments/me", { method: "GET" }, true);
  const appointments = extractCollection(data, ["appointments", "items"]);
  return appointments.map(normalizeAppointment);
}

export async function createAppointment(input: { date: string; time: string }) {
  const time = normalizeTime(input.time);

  await apiRequest<unknown>(
    "/api/appointments",
    {
      method: "POST",
      body: JSON.stringify({
        appointment_date: input.date,
        appointment_time: time,
        appointmentDate: input.date,
        appointmentTime: time,
      }),
    },
    true,
  );
}

export async function cancelMyAppointment(id: string) {
  await apiRequest<unknown>(`/api/appointments/${id}`, { method: "DELETE" }, true);
}

export async function getAdminAppointmentsByDate(date: string): Promise<Appointment[]> {
  const data = await apiRequest<any>(`/api/admin/appointments?date=${encodeURIComponent(date)}`, { method: "GET" }, true);
  const appointments = extractCollection(data, ["appointments", "items"]);
  return appointments.map(normalizeAppointment);
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
