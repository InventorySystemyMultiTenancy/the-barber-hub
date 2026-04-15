import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  CheckCircle,
  DollarSign,
  Landmark,
  Plus,
  Pencil,
  RotateCcw,
  Shield,
  MessageCircle,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiClientError,
  type Barber,
  type SubscriptionPlan,
  createAdminDayHour,
  createAdminBarber,
  createSubscriptionPlan,
  deleteAdminDayHour,
  getAppointmentServices,
  getAdminBarbers,
  getAdminSubscriptionPlans,
  getAdminDayHoursByDate,
  createAdminFixedExpense,
  createAdminVariableExpense,
  deactivateAdminBarber,
  deleteAdminAppointment,
  getAdminSubscribers,
  getAdminFinancialReport,
  getAdminFixedExpenses,
  getAdminAppointmentsByDate,
  getAdminVariableExpenses,
  getFriendlyErrorMessage,
  getSlotsByDate,
  toggleSubscriptionPlan,
  updateAdminFixedExpense,
  updateAdminVariableExpense,
  updateAdminDayHour,
  updateAdminAppointmentStatus,
  updateAdminBarber,
  type Appointment,
  type AppointmentSlot,
  type AppointmentStatus,
  type AdminSubscriber,
  type DayHour,
  type FinancialReport,
  type FixedExpense,
  type VariableExpense,
} from "@/lib/api";
import { getSubscriptionState } from "@/lib/subscriptionState";
import { normalizeWhatsAppPhone, openWhatsAppMessage } from "@/lib/whatsapp";
import { toast } from "@/hooks/use-toast";
import { FixedExpenseEditModal } from "@/components/admin/FixedExpenseEditModal";
import { VariableExpenseEditModal } from "@/components/admin/VariableExpenseEditModal";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTimeFormat(value: string) {
  return HH_MM_REGEX.test(String(value || "").trim());
}

function getAgendaSlotVisualStatus(slot: AppointmentSlot): "disponivel" | "reservado" | "desabilitado" {
  if (slot.status === "desabilitado") return "desabilitado";
  if (slot.status === "agendado" || slot.status === "pago") return "reservado";
  return "disponivel";
}

function getAgendaSlotVisualLabel(slot: AppointmentSlot) {
  const visualStatus = getAgendaSlotVisualStatus(slot);
  if (visualStatus === "desabilitado") return "desabilitado";
  if (visualStatus === "reservado") return "reservado";
  return "disponivel";
}

function getDiscountPriceDetails(input: { base?: number; final?: number; percent?: number; fallback: number }) {
  const final = Number.isFinite(input.final as number) ? Number(input.final) : input.fallback;
  const baseFromRaw = Number.isFinite(input.base as number) ? Number(input.base) : undefined;
  const percent = Number.isFinite(input.percent as number) ? Number(input.percent) : undefined;

  if (baseFromRaw !== undefined) {
    return { base: baseFromRaw, final };
  }

  if (percent && percent > 0 && percent < 100) {
    const estimatedBase = final / (1 - percent / 100);
    return { base: estimatedBase, final };
  }

  return { base: final, final };
}

function normalizeServiceToken(value?: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function isBirthdayOnAppointmentDate(birthDate?: string, appointmentDate?: string) {
  if (!birthDate || !appointmentDate) return false;

  const birth = birthDate.slice(0, 10).split("-");
  const appt = appointmentDate.slice(0, 10).split("-");
  if (birth.length !== 3 || appt.length !== 3) return false;

  return birth[1] === appt[1] && birth[2] === appt[2];
}

function hasBirthdayDiscountInferred(appointment: Appointment) {
  const service = normalizeServiceToken(appointment.serviceType);
  return isBirthdayOnAppointmentDate(appointment.birthDate, appointment.appointmentDate) && service === "corte";
}

function findBaseServicePrice(serviceType: string | undefined, servicesPriceMap: Record<string, number>) {
  const normalizedType = normalizeServiceToken(serviceType);
  if (!normalizedType) return undefined;

  const direct = servicesPriceMap[normalizedType];
  if (typeof direct === "number") return direct;

  for (const [key, price] of Object.entries(servicesPriceMap)) {
    if (normalizedType === key || normalizedType.includes(key) || key.includes(normalizedType)) {
      return price;
    }
  }

  return undefined;
}

function getCurrentPeriod() {
  const now = new Date();
  return {
    startDate: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
    endDate: format(now, "yyyy-MM-dd"),
  };
}

function formatDateBr(dateText?: string) {
  if (!dateText) return "-";

  const [year, month, day] = dateText.split("-");
  if (!year || !month || !day) return dateText;
  return `${day}/${month}/${year}`;
}

function toServiceLabel(appointment: Appointment) {
  if (appointment.serviceLabel) return appointment.serviceLabel;
  if (!appointment.serviceType) return "Servico nao informado";

  return appointment.serviceType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const AdminDashboard = () => {
    const defaultPlanBackUrl =
      typeof window !== "undefined" ? `${window.location.origin}/assinatura/sucesso` : "";

  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const currentPeriod = getCurrentPeriod();

  const [activeTab, setActiveTab] = useState("agenda");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [servicesPriceMap, setServicesPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [filterStartDate, setFilterStartDate] = useState(currentPeriod.startDate);
  const [filterEndDate, setFilterEndDate] = useState(currentPeriod.endDate);
  const [appliedStartDate, setAppliedStartDate] = useState(currentPeriod.startDate);
  const [appliedEndDate, setAppliedEndDate] = useState(currentPeriod.endDate);

  const [financialSummary, setFinancialSummary] = useState<FinancialReport | null>(null);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>([]);

  const [financialLoading, setFinancialLoading] = useState(false);
  const [fixedLoading, setFixedLoading] = useState(false);
  const [variableLoading, setVariableLoading] = useState(false);

  const [financialError, setFinancialError] = useState<string | null>(null);
  const [fixedError, setFixedError] = useState<string | null>(null);
  const [variableError, setVariableError] = useState<string | null>(null);

  const [reportsForbidden, setReportsForbidden] = useState(false);

  const [fixedSubmitting, setFixedSubmitting] = useState(false);
  const [variableSubmitting, setVariableSubmitting] = useState(false);
  const [editingFixedExpense, setEditingFixedExpense] = useState<FixedExpense | null>(null);
  const [editingVariableExpense, setEditingVariableExpense] = useState<VariableExpense | null>(null);
  const [fixedEditSaving, setFixedEditSaving] = useState(false);
  const [variableEditSaving, setVariableEditSaving] = useState(false);

  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedStartsOn, setFixedStartsOn] = useState(currentPeriod.startDate);
  const [fixedEndsOn, setFixedEndsOn] = useState("");
  const [fixedIsActive, setFixedIsActive] = useState(true);
  const [fixedNotes, setFixedNotes] = useState("");

  const [variableTitle, setVariableTitle] = useState("");
  const [variableAmount, setVariableAmount] = useState("");
  const [variableExpenseDate, setVariableExpenseDate] = useState(currentPeriod.endDate);
  const [variableNotes, setVariableNotes] = useState("");

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(false);
  const [barbersError, setBarbersError] = useState<string | null>(null);
  const [barberSubmitting, setBarberSubmitting] = useState(false);
  const [barberName, setBarberName] = useState("");
  const [barberImageUrl, setBarberImageUrl] = useState("");
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);

  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaSlotsByBarber, setAgendaSlotsByBarber] = useState<Record<string, AppointmentSlot[]>>({});
  const [dayHours, setDayHours] = useState<DayHour[]>([]);
  const [newDayHourTime, setNewDayHourTime] = useState("");
  const [newDayHourReason, setNewDayHourReason] = useState("");
  const [dayHourSubmitting, setDayHourSubmitting] = useState(false);

  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planToggleLoadingRef, setPlanToggleLoadingRef] = useState<string | null>(null);

  const [subscribers, setSubscribers] = useState<AdminSubscriber[]>([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);

  const [planName, setPlanName] = useState("Plano Mensal");
  const [planDescription, setPlanDescription] = useState("Assinatura mensal premium");
  const [planAmount, setPlanAmount] = useState("29.90");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleAdminApiError = (error: unknown, options?: { onForbidden?: () => void; silentToast?: boolean }) => {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      if (error.status === 401) {
        if (!options?.silentToast) {
          toast({
            title: "Sessao expirada",
            description: "Faça login novamente para continuar.",
            variant: "destructive",
          });
        }
        navigate("/login");
        return true;
      }

      options?.onForbidden?.();

      if (!options?.silentToast) {
        toast({
          title: "Sem permissao",
          description: "Voce nao tem permissao para acessar esta area.",
          variant: "destructive",
        });
      }

      return true;
    }

    return false;
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await getAdminAppointmentsByDate(filterDate);
      setAppointments(data);
    } catch (error) {
      if (handleAdminApiError(error)) return;

      setAppointments([]);
      toast({
        title: "Erro ao carregar painel",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAdminBarbers = async () => {
    setBarbersLoading(true);
    setBarbersError(null);

    try {
      const data = await getAdminBarbers();
      setBarbers(data);
    } catch (error) {
      if (handleAdminApiError(error, { silentToast: true })) {
        setBarbersError("Sem permissao para acessar barbeiros.");
      } else {
        setBarbersError(getFriendlyErrorMessage(error));
      }
    } finally {
      setBarbersLoading(false);
    }
  };

  const loadAdminSubscriptionPlans = async () => {
    setPlansLoading(true);
    setPlansError(null);

    try {
      const data = await getAdminSubscriptionPlans();
      setSubscriptionPlans(data);
    } catch (error) {
      if (handleAdminApiError(error, { silentToast: true })) {
        setPlansError("Sem permissao para listar planos.");
      } else {
        setPlansError(getFriendlyErrorMessage(error));
      }
    } finally {
      setPlansLoading(false);
    }
  };

  const loadAdminSubscribers = async () => {
    setSubscribersLoading(true);
    setSubscribersError(null);

    try {
      const data = await getAdminSubscribers();
      setSubscribers(data);
    } catch (error) {
      if (handleAdminApiError(error, { silentToast: true })) {
        setSubscribersError("Sem permissao para listar assinantes.");
      } else {
        setSubscribersError(getFriendlyErrorMessage(error));
      }
      setSubscribers([]);
    } finally {
      setSubscribersLoading(false);
    }
  };

  const loadServicesCatalog = async () => {
    try {
      const services = await getAppointmentServices();
      const map: Record<string, number> = {};

      services.forEach((service) => {
        const key = normalizeServiceToken(service.key);
        if (key) {
          map[key] = Number(service.price || 0);
        }
      });

      setServicesPriceMap(map);
    } catch {
      setServicesPriceMap({});
    }
  };

  const loadFinancialSummary = async (startDate: string, endDate: string) => {
    setFinancialLoading(true);
    setFinancialError(null);

    try {
      const data = await getAdminFinancialReport(startDate, endDate);
      setFinancialSummary(data);
      setReportsForbidden(false);
    } catch (error) {
      if (handleAdminApiError(error, { onForbidden: () => setReportsForbidden(true), silentToast: true })) {
        setFinancialError("Sem permissao para consultar relatorio financeiro.");
      } else {
        setFinancialError(getFriendlyErrorMessage(error));
      }
    } finally {
      setFinancialLoading(false);
    }
  };

  const loadFixedExpenses = async () => {
    setFixedLoading(true);
    setFixedError(null);

    try {
      const data = await getAdminFixedExpenses();
      setFixedExpenses(data);
      setReportsForbidden(false);
    } catch (error) {
      if (handleAdminApiError(error, { onForbidden: () => setReportsForbidden(true), silentToast: true })) {
        setFixedError("Sem permissao para listar gastos fixos.");
      } else {
        setFixedError(getFriendlyErrorMessage(error));
      }
    } finally {
      setFixedLoading(false);
    }
  };

  const loadVariableExpenses = async (startDate: string, endDate: string) => {
    setVariableLoading(true);
    setVariableError(null);

    try {
      const data = await getAdminVariableExpenses(startDate, endDate);
      setVariableExpenses(data);
      setReportsForbidden(false);
    } catch (error) {
      if (handleAdminApiError(error, { onForbidden: () => setReportsForbidden(true), silentToast: true })) {
        setVariableError("Sem permissao para listar gastos variaveis.");
      } else {
        setVariableError(getFriendlyErrorMessage(error));
      }
    } finally {
      setVariableLoading(false);
    }
  };

  const reloadReportsByPeriod = async (startDate: string, endDate: string) => {
    await Promise.allSettled([loadFinancialSummary(startDate, endDate), loadVariableExpenses(startDate, endDate)]);
  };

  useEffect(() => {
    if (isAdmin) {
      loadServicesCatalog();
      loadAdminBarbers();
      loadAdminSubscriptionPlans();
      loadAdminSubscribers();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAppointments();
    }
  }, [isAdmin, filterDate]);

  const loadAgendaByDate = async (date: string, currentBarbers: Barber[]) => {
    const activeBarbers = currentBarbers.filter((barber) => barber.isActive);
    if (activeBarbers.length === 0) {
      setAgendaSlotsByBarber({});
      setDayHours([]);
      return;
    }

    setAgendaLoading(true);
    try {
      const [slotsByBarber, overrides] = await Promise.all([
        Promise.all(
          activeBarbers.map(async (barber) => {
            const response = await getSlotsByDate(date, barber.id);
            return { barberId: barber.id, slots: response.slots };
          }),
        ),
        getAdminDayHoursByDate(date),
      ]);

      const nextSlotsByBarber: Record<string, AppointmentSlot[]> = {};
      slotsByBarber.forEach((entry) => {
        nextSlotsByBarber[entry.barberId] = entry.slots;
      });

      setAgendaSlotsByBarber(nextSlotsByBarber);
      setDayHours(overrides);
    } catch (error) {
      if (handleAdminApiError(error, { silentToast: true })) return;

      setAgendaSlotsByBarber({});
      setDayHours([]);
      toast({
        title: "Erro ao carregar grade diaria",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setAgendaLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadAgendaByDate(filterDate, barbers);
  }, [isAdmin, filterDate, barbers]);

  const findSlotOverride = (slot: AppointmentSlot, barberId: string) => {
    if (slot.dayHourOverrideId) {
      return dayHours.find((item) => item.id === slot.dayHourOverrideId);
    }

    const barberScoped = dayHours.find(
      (item) => item.date === filterDate && item.time === slot.time && item.barberId && item.barberId === barberId,
    );
    if (barberScoped) return barberScoped;

    return dayHours.find((item) => item.date === filterDate && item.time === slot.time && !item.barberId);
  };

  const refreshAgendaData = async () => {
    await Promise.allSettled([loadAppointments(), loadAgendaByDate(filterDate, barbers)]);
  };

  const handleCreateDayHour = async (event: FormEvent) => {
    event.preventDefault();

    const safeTime = String(newDayHourTime || "").slice(0, 5);
    if (!isValidTimeFormat(safeTime)) {
      toast({
        title: "Horario invalido",
        description: "Informe o horario no formato HH:mm.",
        variant: "destructive",
      });
      return;
    }

    setDayHourSubmitting(true);
    try {
      await createAdminDayHour({
        date: filterDate,
        time: safeTime,
        isEnabled: true,
        reason: newDayHourReason.trim() || undefined,
      });

      toast({
        title: "Horario criado",
        description: `${safeTime} adicionado para ${formatDateBr(filterDate)}.`,
      });

      setNewDayHourTime("");
      setNewDayHourReason("");
      await refreshAgendaData();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao criar horario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setDayHourSubmitting(false);
    }
  };

  const handleToggleDaySlot = async (barberId: string, slot: AppointmentSlot) => {
    const visualStatus = getAgendaSlotVisualStatus(slot);
    const override = findSlotOverride(slot, barberId);

    if (visualStatus === "reservado") {
      toast({
        title: "Horario reservado",
        description: "Nao e possivel alterar manualmente um slot reservado.",
        variant: "destructive",
      });
      return;
    }

    setDayHourSubmitting(true);
    try {
      if (visualStatus === "desabilitado") {
        if (!override) {
          toast({
            title: "Override nao encontrado",
            description: "Esse slot esta desabilitado, mas sem override associado para reativar.",
            variant: "destructive",
          });
          return;
        }

        await updateAdminDayHour(override.id, { isEnabled: true, reason: undefined });
        toast({
          title: "Horario reativado",
          description: `Horario ${slot.time} reativado com sucesso.`,
        });
      } else {
        const confirmed = window.confirm("Deseja desativar este horario manualmente?");
        if (!confirmed) return;

        const reasonInput = window.prompt("Motivo da desativacao (opcional):", override?.reason || "") || "";
        const reason = reasonInput.trim() || undefined;

        if (override) {
          await updateAdminDayHour(override.id, { isEnabled: false, reason });
        } else {
          await createAdminDayHour({
            date: filterDate,
            time: slot.time,
            isEnabled: false,
            reason,
          });
        }

        toast({
          title: "Horario desativado",
          description: `Horario ${slot.time} desativado com sucesso.`,
        });
      }

      await refreshAgendaData();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao atualizar horario",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setDayHourSubmitting(false);
    }
  };

  const handleDeleteDayHourOverride = async (overrideId: string) => {
    const confirmed = window.confirm("Deseja remover este override do dia?");
    if (!confirmed) return;

    setDayHourSubmitting(true);
    try {
      await deleteAdminDayHour(overrideId);
      toast({
        title: "Override removido",
        description: "O horario voltou a seguir a grade semanal padrao.",
      });
      await refreshAgendaData();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao remover override",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setDayHourSubmitting(false);
    }
  };

  const handleImageUpload = (file: File | null) => {
    if (!file) return;

    const maxSizeBytes = 2 * 1024 * 1024;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo invalido",
        description: "Selecione uma imagem valida.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSizeBytes) {
      toast({
        title: "Imagem muito grande",
        description: "A imagem deve ter no maximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl) {
        setBarberImageUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetBarberForm = () => {
    setBarberName("");
    setBarberImageUrl("");
    setEditingBarberId(null);
  };

  const handleSubmitBarber = async (event: FormEvent) => {
    event.preventDefault();
    if (!barberName.trim()) {
      toast({
        title: "Nome obrigatorio",
        description: "Informe o nome do barbeiro.",
        variant: "destructive",
      });
      return;
    }

    setBarberSubmitting(true);
    try {
      if (editingBarberId) {
        await updateAdminBarber(editingBarberId, {
          full_name: barberName.trim(),
          image_url: barberImageUrl.trim() || null,
        });
        toast({ title: "Barbeiro atualizado" });
      } else {
        await createAdminBarber({
          full_name: barberName.trim(),
          image_url: barberImageUrl.trim() || null,
        });
        toast({ title: "Barbeiro cadastrado" });
      }

      resetBarberForm();
      await loadAdminBarbers();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao salvar barbeiro",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setBarberSubmitting(false);
    }
  };

  const startEditBarber = (barber: Barber) => {
    setEditingBarberId(barber.id);
    setBarberName(barber.fullName);
    setBarberImageUrl(barber.imageUrl || "");
  };

  const handleDeactivateBarber = async (id: string) => {
    const confirmed = window.confirm("Deseja inativar este barbeiro?");
    if (!confirmed) return;

    try {
      await deactivateAdminBarber(id);
      toast({ title: "Barbeiro inativado" });
      await loadAdminBarbers();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao inativar barbeiro",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadFixedExpenses();
      reloadReportsByPeriod(appliedStartDate, appliedEndDate);
    }
  }, [isAdmin]);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    if (status === "disponivel") {
      const confirmed = window.confirm("Deseja liberar este horario e deixá-lo disponivel novamente?");
      if (!confirmed) return;
    }

    try {
      await updateAdminAppointmentStatus(id, status);
      toast({ title: `Status atualizado para ${status}` });
      await loadAppointments();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao atualizar status",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const removeAppointment = async (id: string) => {
    const confirmed = window.confirm("Deseja excluir este agendamento? Essa acao nao pode ser desfeita.");
    if (!confirmed) return;

    try {
      await deleteAdminAppointment(id);
      toast({ title: "Agendamento removido" });
      await loadAppointments();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao remover",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const sendWhatsappConfirmation = (appointment: Appointment) => {
    const phone = normalizeWhatsAppPhone(appointment.phone);
    if (!phone) {
      toast({
        title: "Telefone indisponivel",
        description: "Esse cliente nao possui telefone valido para WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    const message = [
      `Olá, ${appointment.fullName || "cliente"}!`,
      "Seu agendamento foi confirmado com sucesso.",
      `Data: ${appointment.appointmentDate || "nao informada"}`,
      `Hora: ${(appointment.appointmentTime || "").slice(0, 5) || "nao informada"}`,
      `Serviço: ${toServiceLabel(appointment)}`,
      "Aguardamos voce. Até breve!",
    ].join("\n");

    const opened = openWhatsAppMessage(message, phone);
    if (!opened) {
      toast({
        title: "Nao foi possivel abrir o WhatsApp",
        description: "Verifique se o navegador bloqueou pop-up e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "WhatsApp aberto",
      description: "Mensagem de confirmacao pronta para envio.",
    });
  };

  const totals = useMemo(() => {
    const totalAgendado = appointments.filter((appointment) => appointment.status === "agendado").length;
    const totalPago = appointments.filter((appointment) => appointment.status === "pago").length;
    const faturamento = appointments
      .filter((appointment) => appointment.status === "pago")
      .reduce((sum, appointment) => sum + (appointment.price || 0), 0);

    return { totalAgendado, totalPago, faturamento };
  }, [appointments]);

  const premiumSubscribersByUserId = useMemo(() => {
    const map = new Map<string, AdminSubscriber>();
    subscribers.forEach((subscriber) => {
      if (!subscriber.userId) return;
      const state = getSubscriptionState(subscriber);
      if (!state.isActive) return;
      map.set(String(subscriber.userId), subscriber);
    });
    return map;
  }, [subscribers]);

  const applyReportFilter = async () => {
    if (!filterStartDate || !filterEndDate) {
      toast({
        title: "Periodo invalido",
        description: "Informe data inicial e data final.",
        variant: "destructive",
      });
      return;
    }

    if (filterStartDate > filterEndDate) {
      toast({
        title: "Periodo invalido",
        description: "A data inicial deve ser menor ou igual a data final.",
        variant: "destructive",
      });
      return;
    }

    setAppliedStartDate(filterStartDate);
    setAppliedEndDate(filterEndDate);
    await reloadReportsByPeriod(filterStartDate, filterEndDate);
  };

  const handleCreateFixedExpense = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(fixedAmount);
    if (!fixedTitle.trim() || !Number.isFinite(amount) || amount <= 0 || !fixedStartsOn) {
      toast({
        title: "Dados invalidos",
        description: "Preencha titulo, valor maior que zero e data inicial.",
        variant: "destructive",
      });
      return;
    }

    if (fixedEndsOn && fixedStartsOn > fixedEndsOn) {
      toast({
        title: "Periodo invalido",
        description: "A data final do gasto fixo deve ser maior ou igual a data inicial.",
        variant: "destructive",
      });
      return;
    }

    setFixedSubmitting(true);
    try {
      await createAdminFixedExpense({
        title: fixedTitle.trim(),
        amount,
        starts_on: fixedStartsOn,
        ends_on: fixedEndsOn || undefined,
        is_active: fixedIsActive,
        notes: fixedNotes.trim() || undefined,
      });

      toast({ title: "Gasto fixo cadastrado com sucesso" });
      setFixedTitle("");
      setFixedAmount("");
      setFixedEndsOn("");
      setFixedNotes("");
      setFixedIsActive(true);

      await Promise.allSettled([loadFixedExpenses(), loadFinancialSummary(appliedStartDate, appliedEndDate)]);
    } catch (error) {
      if (handleAdminApiError(error, { onForbidden: () => setReportsForbidden(true) })) return;

      toast({
        title: "Erro ao cadastrar gasto fixo",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setFixedSubmitting(false);
    }
  };

  const handleCreateVariableExpense = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(variableAmount);
    if (!variableTitle.trim() || !Number.isFinite(amount) || amount <= 0 || !variableExpenseDate) {
      toast({
        title: "Dados invalidos",
        description: "Preencha titulo, valor maior que zero e data da despesa.",
        variant: "destructive",
      });
      return;
    }

    setVariableSubmitting(true);
    try {
      await createAdminVariableExpense({
        title: variableTitle.trim(),
        amount,
        expense_date: variableExpenseDate,
        notes: variableNotes.trim() || undefined,
      });

      toast({ title: "Gasto variavel cadastrado com sucesso" });
      setVariableTitle("");
      setVariableAmount("");
      setVariableNotes("");
      setVariableExpenseDate(appliedEndDate);

      await Promise.allSettled([
        loadVariableExpenses(appliedStartDate, appliedEndDate),
        loadFinancialSummary(appliedStartDate, appliedEndDate),
      ]);
    } catch (error) {
      if (handleAdminApiError(error, { onForbidden: () => setReportsForbidden(true) })) return;

      toast({
        title: "Erro ao cadastrar gasto variavel",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setVariableSubmitting(false);
    }
  };

  const handleUpdateFixedExpense = async (payload: Parameters<typeof updateAdminFixedExpense>[1]) => {
    if (!editingFixedExpense?.id) return;

    setFixedEditSaving(true);
    try {
      await updateAdminFixedExpense(editingFixedExpense.id, payload);

      toast({
        title: "Gasto fixo atualizado",
        description: "Alteracoes salvas com sucesso.",
      });

      setEditingFixedExpense(null);
      await Promise.allSettled([loadFixedExpenses(), loadFinancialSummary(appliedStartDate, appliedEndDate)]);
    } catch (error) {
      if (handleAdminApiError(error, { onForbidden: () => setReportsForbidden(true) })) return;

      toast({
        title: "Erro ao atualizar gasto fixo",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setFixedEditSaving(false);
    }
  };

  const handleUpdateVariableExpense = async (payload: Parameters<typeof updateAdminVariableExpense>[1]) => {
    if (!editingVariableExpense?.id) return;

    setVariableEditSaving(true);
    try {
      await updateAdminVariableExpense(editingVariableExpense.id, payload);

      toast({
        title: "Gasto variavel atualizado",
        description: "Alteracoes salvas com sucesso.",
      });

      setEditingVariableExpense(null);
      await Promise.allSettled([
        loadVariableExpenses(appliedStartDate, appliedEndDate),
        loadFinancialSummary(appliedStartDate, appliedEndDate),
      ]);
    } catch (error) {
      if (handleAdminApiError(error, { onForbidden: () => setReportsForbidden(true) })) return;

      toast({
        title: "Erro ao atualizar gasto variavel",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setVariableEditSaving(false);
    }
  };

  const handleCreateSubscriptionPlan = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(planAmount);
    if (!planName.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Dados invalidos",
        description: "Nome e valor maior que zero sao obrigatorios.",
        variant: "destructive",
      });
      return;
    }

    setPlanSubmitting(true);
    try {
      await createSubscriptionPlan({
        name: planName.trim(),
        description: planDescription.trim() || undefined,
        transaction_amount: amount,
        frequency: 1,
        frequency_type: "months",
        currency_id: "BRL",
        back_url: defaultPlanBackUrl,
      });

      toast({
        title: "Plano criado",
        description: "Plano mensal criado com sucesso.",
      });

      setPlanName("Plano Mensal");
      setPlanDescription("Assinatura mensal premium");
      setPlanAmount("29.90");
      await loadAdminSubscriptionPlans();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao criar plano",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleToggleSubscriptionPlan = async (plan: SubscriptionPlan) => {
    const reference = String(plan.preapprovalPlanId || plan.id || "").trim();
    if (!reference) {
      toast({
        title: "Referencia invalida",
        description: "Nao foi possivel identificar o plano para atualizar status.",
        variant: "destructive",
      });
      return;
    }

    setPlanToggleLoadingRef(reference);
    try {
      await toggleSubscriptionPlan(reference, !plan.isActive);
      toast({
        title: "Plano atualizado",
        description: `Plano ${!plan.isActive ? "ativado" : "inativado"} com sucesso.`,
      });
      await loadAdminSubscriptionPlans();
    } catch (error) {
      if (handleAdminApiError(error)) return;

      toast({
        title: "Erro ao atualizar plano",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setPlanToggleLoadingRef(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando autenticacao...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="font-heading text-3xl font-bold">
            PAINEL <span className="gold-text">ADMIN</span>
          </h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full max-w-3xl grid grid-cols-5 mb-8">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Relatorios
            </TabsTrigger>
            <TabsTrigger value="barbeiros">Barbeiros</TabsTrigger>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="assinantes" className="gap-2">
              <Users className="h-4 w-4" /> Assinantes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass rounded-lg p-5 text-center">
                <CalendarDays className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-heading font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total do dia</p>
              </div>
              <div className="glass rounded-lg p-5 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-heading font-bold">{totals.totalPago}</p>
                <p className="text-sm text-muted-foreground">Cortes pagos</p>
              </div>
              <div className="glass rounded-lg p-5 text-center">
                <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-heading font-bold">{formatMoney(totals.faturamento)}</p>
                <p className="text-sm text-muted-foreground">Faturamento</p>
              </div>
            </div>

            <div>
              <Input
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="max-w-xs bg-card border-border text-foreground font-heading"
              />
            </div>

            <section className="glass rounded-lg p-4 md:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Grade de horarios por barbeiro</h2>
                  <p className="text-xs text-muted-foreground">Data selecionada: {formatDateBr(filterDate)}</p>
                </div>
              </div>

              <form onSubmit={handleCreateDayHour} className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-2 items-start">
                <Input
                  type="time"
                  value={newDayHourTime}
                  onChange={(event) => setNewDayHourTime(event.target.value)}
                  placeholder="HH:mm"
                  required
                />
                <Input
                  value={newDayHourReason}
                  onChange={(event) => setNewDayHourReason(event.target.value)}
                  placeholder="Motivo opcional"
                  maxLength={120}
                />
                <Button type="submit" className="gap-1" disabled={dayHourSubmitting}>
                  <Plus className="h-4 w-4" /> {dayHourSubmitting ? "Salvando..." : "Criar horario no dia"}
                </Button>
              </form>

              {agendaLoading ? (
                <p className="text-sm text-muted-foreground">Carregando grade do dia...</p>
              ) : barbers.filter((barber) => barber.isActive).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum barbeiro ativo para exibir a grade.</p>
              ) : (
                <div className="space-y-4">
                  {barbers
                    .filter((barber) => barber.isActive)
                    .map((barber) => {
                      const slots = agendaSlotsByBarber[barber.id] || [];

                      return (
                        <div key={barber.id} className="rounded-md border border-border/70 p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{barber.fullName}</p>
                            <p className="text-xs text-muted-foreground">{slots.length} horarios</p>
                          </div>

                          {slots.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sem slots para este barbeiro nesta data.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                              {slots.map((slot) => {
                                const visualStatus = getAgendaSlotVisualStatus(slot);
                                const visualLabel = getAgendaSlotVisualLabel(slot);
                                const override = findSlotOverride(slot, barber.id);
                                const reason = slot.reason || override?.reason;
                                const statusClass =
                                  visualStatus === "desabilitado"
                                    ? "bg-destructive/15 text-destructive"
                                    : visualStatus === "reservado"
                                      ? "bg-amber-500/20 text-amber-500"
                                      : "bg-green-500/20 text-green-500";

                                return (
                                  <div key={`${barber.id}-${slot.time}-${slot.status}-${slot.dayHourOverrideId || "na"}`} className="rounded-md border border-border/70 bg-card p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-heading font-semibold text-base">{slot.time.slice(0, 5)}</p>
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusClass}`}>{visualLabel}</span>
                                    </div>

                                    {reason && (
                                      <p className="text-xs text-muted-foreground mt-2 min-h-8">Motivo: {reason}</p>
                                    )}

                                    <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                      <Button
                                        size="sm"
                                        type="button"
                                        variant="outline"
                                        disabled={dayHourSubmitting || visualStatus === "reservado"}
                                        onClick={() => handleToggleDaySlot(barber.id, slot)}
                                        className="w-full"
                                      >
                                        {visualStatus === "desabilitado" ? "Reativar" : "Desativar"}
                                      </Button>

                                      {override && (
                                        <Button
                                          size="sm"
                                          type="button"
                                          variant="outline"
                                          disabled={dayHourSubmitting}
                                          onClick={() => handleDeleteDayHourOverride(override.id)}
                                          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                                        >
                                          Remover override
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </section>

            {loading ? (
              <p className="text-muted-foreground text-center py-12">Carregando...</p>
            ) : appointments.length === 0 ? (
              <div className="text-center py-16 glass rounded-lg">
                <p className="text-muted-foreground">Nenhum agendamento nesta data</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h2 className="font-heading text-lg font-semibold">Horarios de clientes</h2>
                {appointments.map((appointment) => {
                  const statusClass =
                    appointment.status === "pago"
                      ? "bg-green-500/20 text-green-400"
                      : appointment.status === "agendado"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground";
                  const birthdayDiscountInferred = !appointment.discount?.applied && hasBirthdayDiscountInferred(appointment);
                  const baseServicePrice = findBaseServicePrice(appointment.serviceType, servicesPriceMap);
                  const isHalfPriceInferred =
                    !appointment.discount?.applied &&
                    baseServicePrice !== undefined &&
                    baseServicePrice > 0 &&
                    Math.abs((appointment.price ?? 0) - baseServicePrice * 0.5) < 0.01;
                  const shouldShowBirthdayBadge = Boolean(appointment.discount?.applied || birthdayDiscountInferred || isHalfPriceInferred);
                  const badgePercent = appointment.discount?.discountPercent || ((birthdayDiscountInferred || isHalfPriceInferred) ? 50 : undefined);
                  const prices = getDiscountPriceDetails({
                    base: appointment.discount?.basePrice,
                    final: appointment.discount?.finalPrice,
                    percent: appointment.discount?.discountPercent,
                    fallback: appointment.price ?? 0,
                  });
                  const inferredFinalPrice = birthdayDiscountInferred || isHalfPriceInferred ? (appointment.price ?? 0) : prices.final;
                  const inferredOriginalPrice =
                    birthdayDiscountInferred
                      ? (appointment.price ?? 0) * 2
                      : isHalfPriceInferred
                        ? (baseServicePrice ?? prices.base)
                        : prices.base;
                  const subscriberByAppointmentUserId = appointment.userId
                    ? premiumSubscribersByUserId.get(String(appointment.userId))
                    : undefined;
                  const appointmentSubscriptionState = getSubscriptionState({
                    status: appointment.subscriptionStatus,
                    isActive: appointment.subscriptionIsActive,
                    isCanceled: appointment.subscriptionIsCanceled,
                    subscriptionState: appointment.subscriptionState,
                  });
                  const subscriberState = subscriberByAppointmentUserId ? getSubscriptionState(subscriberByAppointmentUserId) : null;
                  const isPremiumSubscriber = Boolean(appointmentSubscriptionState.isActive || subscriberState?.isActive);
                  const subscriptionPlanName =
                    appointment.subscriptionPlanName || subscriberByAppointmentUserId?.planName || "Plano premium";

                  return (
                    <div key={appointment.id} className="glass rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-heading font-semibold text-lg">{appointment.appointmentTime.slice(0, 5)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{appointment.status}</span>
                            {shouldShowBirthdayBadge && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                                ANIVERSARIO {badgePercent ? `${badgePercent}%` : "50%"}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm text-foreground">Cliente: {appointment.fullName || "Sem nome"}</p>
                            {isPremiumSubscriber && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/40">
                                Assinante premium
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendWhatsappConfirmation(appointment)}
                              className="h-8 px-2 gap-1 text-green-400 border-green-500/40 hover:bg-green-500/10 w-full sm:w-auto"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> Confirmar via WhatsApp
                            </Button>
                          </div>
                          {isPremiumSubscriber && (
                            <p className="text-xs text-green-400">Plano: {subscriptionPlanName}</p>
                          )}
                          <p className="text-sm text-foreground">Servico: {toServiceLabel(appointment)}</p>
                          <p className="text-sm text-foreground">Valor: {formatMoney(appointment.price || 0)}</p>
                          {shouldShowBirthdayBadge && (
                            <div className="mt-1 rounded-md border border-primary/40 bg-primary/10 p-2">
                              <p className="text-xs font-semibold text-primary">Desconto de aniversario aplicado</p>
                              {appointment.discount?.message && (
                                <p className="text-xs text-muted-foreground">{appointment.discount.message}</p>
                              )}
                              {birthdayDiscountInferred && !appointment.discount?.applied && (
                                <p className="text-xs text-muted-foreground">Desconto inferido pela data de aniversario e servico corte.</p>
                              )}
                              {isHalfPriceInferred && !birthdayDiscountInferred && !appointment.discount?.applied && (
                                <p className="text-xs text-muted-foreground">Desconto inferido pela diferenca entre preco base e preco cobrado.</p>
                              )}
                              <p className="text-xs text-foreground">
                                Original: {formatMoney(inferredOriginalPrice)}
                              </p>
                              <p className="text-xs text-foreground">
                                Final: {formatMoney(inferredFinalPrice)}
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {appointment.phone || "-"} · {appointment.email || "-"}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                          {appointment.status === "agendado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(appointment.id, "pago")}
                              className="text-green-400 border-green-400/30 hover:bg-green-400/10 gap-1 w-full sm:w-auto justify-center"
                            >
                              <CheckCircle className="h-3 w-3" /> Pago
                            </Button>
                          )}

                          {appointment.status !== "disponivel" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(appointment.id, "disponivel")}
                              className="gap-1 w-full sm:w-auto justify-center"
                            >
                              <RotateCcw className="h-3 w-3" /> Liberar horario
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeAppointment(appointment.id)}
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 w-full sm:w-auto justify-center"
                          >
                            <Trash2 className="h-3 w-3" /> Excluir agendamento
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="barbeiros" className="space-y-6">
            <section className="glass rounded-lg p-4 md:p-5">
              <h2 className="font-heading text-xl font-semibold mb-4">Gerenciar barbeiros</h2>

              <form onSubmit={handleSubmitBarber} className="space-y-3 mb-5">
                <Input
                  placeholder="Nome do barbeiro"
                  value={barberName}
                  onChange={(event) => setBarberName(event.target.value)}
                  required
                />

                <Input
                  placeholder="URL da imagem (opcional)"
                  value={barberImageUrl}
                  onChange={(event) => setBarberImageUrl(event.target.value)}
                />

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Ou envie uma imagem</label>
                  <Input type="file" accept="image/*" onChange={(event) => handleImageUpload(event.target.files?.[0] || null)} />
                </div>

                {barberImageUrl && (
                  <img src={barberImageUrl} alt="Preview do barbeiro" className="h-20 w-20 rounded-full object-cover border border-border" />
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="submit" disabled={barberSubmitting}>
                    {barberSubmitting ? "Salvando..." : editingBarberId ? "Atualizar barbeiro" : "Cadastrar barbeiro"}
                  </Button>
                  {editingBarberId && (
                    <Button type="button" variant="outline" onClick={resetBarberForm}>
                      Cancelar edicao
                    </Button>
                  )}
                </div>
              </form>

              {barbersError ? (
                <div className="rounded-md border border-destructive/40 p-3">
                  <p className="text-destructive font-semibold">Erro ao carregar barbeiros</p>
                  <p className="text-sm text-muted-foreground mt-1">{barbersError}</p>
                  <Button variant="outline" className="mt-3" onClick={loadAdminBarbers}>
                    Tentar novamente
                  </Button>
                </div>
              ) : barbersLoading ? (
                <p className="text-sm text-muted-foreground">Carregando barbeiros...</p>
              ) : barbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum barbeiro cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {barbers.map((barber) => (
                    <div key={barber.id} className="rounded-md border border-border/70 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {barber.imageUrl ? (
                          <img src={barber.imageUrl} alt={barber.fullName} className="h-12 w-12 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-12 w-12 rounded-full border border-border bg-muted flex items-center justify-center text-xs">Sem foto</div>
                        )}
                        <div>
                          <p className="font-medium">{barber.fullName}</p>
                          <p className="text-xs text-muted-foreground">{barber.isActive ? "Ativo" : "Inativo"}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button type="button" variant="outline" onClick={() => startEditBarber(barber)}>
                          Editar
                        </Button>
                        {barber.isActive && (
                          <Button type="button" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDeactivateBarber(barber.id)}>
                            Inativar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="planos" className="space-y-6">
            <section className="glass rounded-lg p-4 md:p-5 space-y-4">
              <h2 className="font-heading text-xl font-semibold">Novo plano mensal</h2>

              <form onSubmit={handleCreateSubscriptionPlan} className="space-y-3">
                <Input
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                  placeholder="Nome do plano"
                  required
                />
                <Textarea
                  value={planDescription}
                  onChange={(event) => setPlanDescription(event.target.value)}
                  placeholder="Descricao do plano"
                  rows={2}
                />
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={planAmount}
                  onChange={(event) => setPlanAmount(event.target.value)}
                  placeholder="Valor mensal"
                  required
                />

                <Button type="submit" disabled={planSubmitting}>
                  {planSubmitting ? "Criando plano..." : "Criar plano mensal"}
                </Button>
              </form>
            </section>

            <section className="glass rounded-lg p-4 md:p-5 space-y-4">
              <h2 className="font-heading text-xl font-semibold">Planos cadastrados</h2>

              {plansError ? (
                <div className="rounded-md border border-destructive/40 p-3">
                  <p className="text-destructive font-semibold">Erro ao carregar planos</p>
                  <p className="text-sm text-muted-foreground mt-1">{plansError}</p>
                  <Button variant="outline" className="mt-3" onClick={loadAdminSubscriptionPlans}>
                    Tentar novamente
                  </Button>
                </div>
              ) : plansLoading ? (
                <p className="text-sm text-muted-foreground">Carregando planos...</p>
              ) : subscriptionPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-muted-foreground">
                        <th className="py-2 pr-3">Nome</th>
                        <th className="py-2 pr-3">Descricao</th>
                        <th className="py-2 pr-3">Valor</th>
                        <th className="py-2 pr-3">Frequencia</th>
                        <th className="py-2 pr-3">Moeda</th>
                        <th className="py-2 pr-3">preapproval_plan_id</th>
                        <th className="py-2 pr-3">Ativo</th>
                        <th className="py-2">Acao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionPlans.map((plan) => {
                        const reference = String(plan.preapprovalPlanId || plan.id || "");
                        const isToggling = planToggleLoadingRef === reference;

                        return (
                          <tr key={reference || plan.id} className="border-b border-border/40 align-top">
                            <td className="py-2 pr-3">{plan.name || "-"}</td>
                            <td className="py-2 pr-3">{plan.description || "-"}</td>
                            <td className="py-2 pr-3">{formatMoney(plan.transactionAmount || 0)}</td>
                            <td className="py-2 pr-3">{plan.frequency || "-"} {plan.frequencyType || "-"}</td>
                            <td className="py-2 pr-3">{plan.currencyId || "BRL"}</td>
                            <td className="py-2 pr-3 break-all">{plan.preapprovalPlanId || plan.id}</td>
                            <td className="py-2 pr-3">{plan.isActive ? "Sim" : "Nao"}</td>
                            <td className="py-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isToggling}
                                onClick={() => handleToggleSubscriptionPlan(plan)}
                              >
                                {isToggling ? "Atualizando..." : plan.isActive ? "Inativar" : "Ativar"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="assinantes" className="space-y-6">
            <section className="glass rounded-lg p-4 md:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-heading text-xl font-semibold">Assinantes premium</h2>
                  <p className="text-xs text-muted-foreground">Usuarios com assinatura ativa ou pendente.</p>
                </div>
                <Button variant="outline" onClick={loadAdminSubscribers} disabled={subscribersLoading}>
                  {subscribersLoading ? "Atualizando..." : "Atualizar lista"}
                </Button>
              </div>

              {subscribersError ? (
                <div className="rounded-md border border-destructive/40 p-3">
                  <p className="text-destructive font-semibold">Erro ao carregar assinantes</p>
                  <p className="text-sm text-muted-foreground mt-1">{subscribersError}</p>
                </div>
              ) : subscribersLoading ? (
                <p className="text-sm text-muted-foreground">Carregando assinantes...</p>
              ) : subscribers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum assinante premium encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/70 text-left text-muted-foreground">
                        <th className="py-2 pr-3">Nome</th>
                        <th className="py-2 pr-3">Plano</th>
                        <th className="py-2 pr-3">Status</th>
                        <th className="py-2 pr-3">Valor</th>
                        <th className="py-2">Contato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribers.map((subscriber) => (
                        (() => {
                          const state = getSubscriptionState(subscriber);
                          const badgeClass =
                            state.color === "success"
                              ? "bg-green-500/20 text-green-400 border-green-500/40"
                              : state.color === "danger"
                                ? "bg-destructive/20 text-destructive border-destructive/40"
                                : "bg-muted text-muted-foreground border-border";

                          return (
                            <tr key={`${subscriber.userId}-${subscriber.subscriptionId || subscriber.preapprovalPlanId || "-"}`} className="border-b border-border/40 align-top">
                              <td className="py-2 pr-3">{subscriber.fullName || "Sem nome"}</td>
                              <td className="py-2 pr-3">{subscriber.planName || "Plano premium"}</td>
                              <td className="py-2 pr-3">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full border w-fit ${badgeClass}`}>
                                    {state.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">status: {subscriber.status || "-"}</span>
                                </div>
                              </td>
                              <td className="py-2 pr-3">
                                {typeof subscriber.transactionAmount === "number" ? formatMoney(subscriber.transactionAmount) : "-"}
                              </td>
                              <td className="py-2">
                                {subscriber.phone || "-"}
                                {subscriber.email ? ` • ${subscriber.email}` : ""}
                              </td>
                            </tr>
                          );
                        })()
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-6">
            <section className="glass rounded-lg p-4 md:p-5">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="w-full lg:w-auto">
                  <label className="block text-sm text-muted-foreground mb-1">Data inicial</label>
                  <Input type="date" value={filterStartDate} onChange={(event) => setFilterStartDate(event.target.value)} />
                </div>
                <div className="w-full lg:w-auto">
                  <label className="block text-sm text-muted-foreground mb-1">Data final</label>
                  <Input type="date" value={filterEndDate} onChange={(event) => setFilterEndDate(event.target.value)} />
                </div>
                <Button onClick={applyReportFilter} className="lg:mb-[1px]" disabled={financialLoading || variableLoading}>
                  Aplicar filtro
                </Button>
              </div>
            </section>

            {reportsForbidden ? (
              <div className="glass rounded-lg p-8 text-center">
                <p className="font-heading text-lg">Sem permissao para acessar relatorios.</p>
                <p className="text-sm text-muted-foreground mt-2">Se o problema persistir, faca login novamente.</p>
                <Button className="mt-4" variant="outline" onClick={() => navigate("/login")}>Ir para login</Button>
              </div>
            ) : (
              <>
                <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                  <div className="glass rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Quantidade de pagamentos</p>
                    <p className="font-heading text-2xl mt-1">
                      {financialLoading ? "..." : (financialSummary?.paidAppointmentsCount ?? 0)}
                    </p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Receita bruta</p>
                    <p className="font-heading text-2xl mt-1">
                      {financialLoading ? "..." : formatMoney(financialSummary?.paidAppointmentsRevenue ?? 0)}
                    </p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Gastos fixos</p>
                    <p className="font-heading text-2xl mt-1">
                      {financialLoading ? "..." : formatMoney(financialSummary?.fixedExpensesTotal ?? 0)}
                    </p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Gastos variaveis</p>
                    <p className="font-heading text-2xl mt-1">
                      {financialLoading ? "..." : formatMoney(financialSummary?.variableExpensesTotal ?? 0)}
                    </p>
                  </div>
                  <div className="glass rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Lucro liquido</p>
                    <p
                      className={`font-heading text-2xl mt-1 ${(financialSummary?.netProfit ?? 0) >= 0 ? "text-green-400" : "text-destructive"}`}
                    >
                      {financialLoading ? "..." : formatMoney(financialSummary?.netProfit ?? 0)}
                    </p>
                  </div>
                </section>

                {financialError && (
                  <div className="glass rounded-lg p-4 border border-destructive/40">
                    <p className="font-semibold text-destructive">Erro ao carregar resumo financeiro</p>
                    <p className="text-sm text-muted-foreground mt-1">{financialError}</p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => loadFinancialSummary(appliedStartDate, appliedEndDate)}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                )}

                <section className="glass rounded-lg p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Landmark className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-xl font-semibold">Gastos fixos mensais</h2>
                  </div>

                  <form onSubmit={handleCreateFixedExpense} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    <Input
                      placeholder="Titulo do gasto fixo"
                      value={fixedTitle}
                      onChange={(event) => setFixedTitle(event.target.value)}
                      required
                    />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Valor"
                      value={fixedAmount}
                      onChange={(event) => setFixedAmount(event.target.value)}
                      required
                    />
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Inicio</label>
                      <Input type="date" value={fixedStartsOn} onChange={(event) => setFixedStartsOn(event.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Fim (opcional)</label>
                      <Input type="date" value={fixedEndsOn} onChange={(event) => setFixedEndsOn(event.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <Textarea
                        placeholder="Observacoes (opcional)"
                        value={fixedNotes}
                        onChange={(event) => setFixedNotes(event.target.value)}
                        className="min-h-20"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground md:col-span-2">
                      <input
                        type="checkbox"
                        checked={fixedIsActive}
                        onChange={(event) => setFixedIsActive(event.target.checked)}
                        className="h-4 w-4"
                      />
                      Gasto ativo
                    </label>
                    <Button type="submit" disabled={fixedSubmitting} className="md:w-fit">
                      {fixedSubmitting ? "Salvando..." : "Cadastrar gasto fixo"}
                    </Button>
                  </form>

                  {fixedError ? (
                    <div className="rounded-md border border-destructive/40 p-3">
                      <p className="text-destructive font-semibold">Erro ao carregar gastos fixos</p>
                      <p className="text-sm text-muted-foreground mt-1">{fixedError}</p>
                      <Button variant="outline" className="mt-3" onClick={loadFixedExpenses}>
                        Tentar novamente
                      </Button>
                    </div>
                  ) : fixedLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando gastos fixos...</p>
                  ) : fixedExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum gasto fixo cadastrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {fixedExpenses.map((expense) => (
                        <div key={expense.id} className="rounded-md border border-border/70 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="font-medium">{expense.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Inicio: {formatDateBr(expense.startsOn)} · Fim: {formatDateBr(expense.endsOn)} · {expense.isActive ? "Ativo" : "Inativo"}
                            </p>
                            {expense.notes && <p className="text-xs text-muted-foreground mt-1">{expense.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <p className="font-heading text-lg">{formatMoney(expense.amount)}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingFixedExpense(expense)}
                              disabled={fixedEditSaving}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="glass rounded-lg p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-xl font-semibold">Gastos variaveis</h2>
                  </div>

                  <form onSubmit={handleCreateVariableExpense} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    <Input
                      placeholder="Titulo do gasto variavel"
                      value={variableTitle}
                      onChange={(event) => setVariableTitle(event.target.value)}
                      required
                    />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Valor"
                      value={variableAmount}
                      onChange={(event) => setVariableAmount(event.target.value)}
                      required
                    />
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Data da despesa</label>
                      <Input
                        type="date"
                        value={variableExpenseDate}
                        onChange={(event) => setVariableExpenseDate(event.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Textarea
                        placeholder="Observacoes (opcional)"
                        value={variableNotes}
                        onChange={(event) => setVariableNotes(event.target.value)}
                        className="min-h-20"
                      />
                    </div>
                    <Button type="submit" disabled={variableSubmitting} className="md:w-fit">
                      {variableSubmitting ? "Salvando..." : "Cadastrar gasto variavel"}
                    </Button>
                  </form>

                  <div className="mb-3 text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Gastos variaveis de {formatDateBr(appliedStartDate)} ate {formatDateBr(appliedEndDate)}
                  </div>

                  {variableError ? (
                    <div className="rounded-md border border-destructive/40 p-3">
                      <p className="text-destructive font-semibold">Erro ao carregar gastos variaveis</p>
                      <p className="text-sm text-muted-foreground mt-1">{variableError}</p>
                      <Button
                        variant="outline"
                        className="mt-3"
                        onClick={() => loadVariableExpenses(appliedStartDate, appliedEndDate)}
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  ) : variableLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando gastos variaveis...</p>
                  ) : variableExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum gasto variavel neste periodo.</p>
                  ) : (
                    <div className="space-y-2">
                      {variableExpenses.map((expense) => (
                        <div key={expense.id} className="rounded-md border border-border/70 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="font-medium">{expense.title}</p>
                            <p className="text-xs text-muted-foreground">Data: {formatDateBr(expense.expenseDate)}</p>
                            {expense.notes && <p className="text-xs text-muted-foreground mt-1">{expense.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <p className="font-heading text-lg">{formatMoney(expense.amount)}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingVariableExpense(expense)}
                              disabled={variableEditSaving}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </TabsContent>
        </Tabs>

        <FixedExpenseEditModal
          open={Boolean(editingFixedExpense)}
          onOpenChange={(open) => {
            if (!open) setEditingFixedExpense(null);
          }}
          expense={editingFixedExpense}
          isSaving={fixedEditSaving}
          onSave={handleUpdateFixedExpense}
        />

        <VariableExpenseEditModal
          open={Boolean(editingVariableExpense)}
          onOpenChange={(open) => {
            if (!open) setEditingVariableExpense(null);
          }}
          expense={editingVariableExpense}
          isSaving={variableEditSaving}
          onSave={handleUpdateVariableExpense}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
