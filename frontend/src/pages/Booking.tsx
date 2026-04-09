import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  ApiClientError,
  createAppointment,
  getAppointmentServices,
  getFriendlyErrorMessage,
  getSlotsByDate,
  type Appointment,
  type AppointmentService,
  type AppointmentSlot,
  type SlotsMeta,
} from "@/lib/api";
import { BUSINESS_WHATSAPP_NUMBER, openWhatsAppMessage } from "@/lib/whatsapp";
import { toast } from "@/hooks/use-toast";

function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function getDefaultBookingWindow() {
  const today = startOfToday();
  return {
    start: format(today, "yyyy-MM-dd"),
    end: format(addDays(today, 15), "yyyy-MM-dd"),
  };
}

function isDateWithinWindow(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function logBookingDebug(step: string, payload: Record<string, unknown>) {
  console.group(`[BOOKING_DEBUG] ${step}`);
  Object.entries(payload).forEach(([key, value]) => {
    console.log(`${key}:`, value);
  });
  console.groupEnd();
}

const Booking = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const defaultWindow = getDefaultBookingWindow();
  const [selectedDate, setSelectedDate] = useState<string>(defaultWindow.start);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsMeta, setSlotsMeta] = useState<SlotsMeta>({});
  const [bookingWindowStart, setBookingWindowStart] = useState(defaultWindow.start);
  const [bookingWindowEnd, setBookingWindowEnd] = useState(defaultWindow.end);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflictedTimesByDate, setConflictedTimesByDate] = useState<Record<string, string[]>>({});
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServiceKey, setSelectedServiceKey] = useState("");
  const [lastDiscountSummary, setLastDiscountSummary] = useState<{
    applied: boolean;
    message?: string;
    basePrice?: number;
    finalPrice?: number;
    discountPercent?: number;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const availableDates = useMemo(
    () => {
      const start = parseLocalDate(bookingWindowStart);
      const end = parseLocalDate(bookingWindowEnd);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        return [] as Date[];
      }

      const days = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      return Array.from({ length: days }, (_, i) => addDays(start, i));
    },
    [bookingWindowStart, bookingWindowEnd],
  );

  const mergeSlotsWithConflicts = (date: string, incomingSlots: AppointmentSlot[], extraBlockedTimes: string[] = []) => {
    const blockedTimes = new Set([...(conflictedTimesByDate[date] || []), ...extraBlockedTimes]);

    return incomingSlots.map((slot) => {
      if (!blockedTimes.has(slot.time) || slot.status !== "disponivel") return slot;

      return {
        ...slot,
        status: "agendado" as const,
        reason: slot.reason || "Reservado (confirmado no banco)",
      };
    });
  };

  const loadSlots = async (date: string, extraBlockedTimes: string[] = []) => {
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      if (!isDateWithinWindow(date, bookingWindowStart, bookingWindowEnd)) {
        setSlots([]);
        setSelectedTime("");
        setSlotsError("Data fora da janela de agendamento.");
        return;
      }

      const response = await getSlotsByDate(date);
      setSlots(mergeSlotsWithConflicts(date, response.slots, extraBlockedTimes));
      setSlotsMeta(response.meta || {});

      const nextWindowStart = response.meta?.bookingWindowStart || bookingWindowStart;
      const nextWindowEnd = response.meta?.bookingWindowEnd || bookingWindowEnd;
      setBookingWindowStart(nextWindowStart);
      setBookingWindowEnd(nextWindowEnd);

      if (!isDateWithinWindow(date, nextWindowStart, nextWindowEnd)) {
        setSelectedDate(nextWindowStart);
        setSelectedTime("");
        setSlots([]);
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        toast({
          title: "Sessao expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (error instanceof ApiClientError && error.status === 500) {
        setSlotsError("Erro interno ao carregar horarios. Tente novamente.");
      } else if (error instanceof ApiClientError && error.status === 400) {
        setSlotsError(error.message || "Dados invalidos para buscar horarios.");
      } else {
        setSlotsError("Falha ao carregar horarios.");
      }

      setSlots([]);
      toast({
        title: "Falha ao carregar horarios",
        description: error instanceof ApiClientError && error.status === 500
          ? "Erro interno do servidor. Use Tentar novamente."
          : getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const catalog = await getAppointmentServices();
      setServices(catalog);

      if (selectedServiceKey && !catalog.some((service) => service.key === selectedServiceKey)) {
        setSelectedServiceKey("");
      }
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        toast({
          title: "Sessao expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      setServices([]);
      setSelectedServiceKey("");
      toast({
        title: "Falha ao carregar servicos",
        description: error instanceof ApiClientError && error.status === 500
          ? "Erro interno do servidor. Tente novamente."
          : getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate || !user) return;

    if (!isDateWithinWindow(selectedDate, bookingWindowStart, bookingWindowEnd)) {
      setSelectedDate(bookingWindowStart);
      return;
    }

    setSelectedTime("");
    setLastDiscountSummary(null);
    loadSlots(selectedDate);
  }, [selectedDate, user, bookingWindowStart, bookingWindowEnd]);

  useEffect(() => {
    if (!user) return;
    loadServices();
  }, [user]);

  const selectedService = services.find((service) => service.key === selectedServiceKey) || null;

  const getAppointmentSummary = (appointment: Appointment) => {
    const serviceLabel = appointment.serviceLabel || selectedService?.label || selectedServiceKey || "Servico";
    const servicePrice = Number.isFinite(appointment.price) ? appointment.price : (selectedService?.price ?? 0);
    const dateValue = appointment.appointmentDate || selectedDate;
    const timeValue = appointment.appointmentTime || selectedTime;

    return {
      serviceLabel,
      servicePrice,
      dateValue,
      timeValue,
    };
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;

    if (!isDateWithinWindow(selectedDate, bookingWindowStart, bookingWindowEnd)) {
      toast({
        title: "Data fora da janela de agendamento",
        description: `Escolha uma data entre ${bookingWindowStart} e ${bookingWindowEnd}.`,
        variant: "destructive",
      });
      return;
    }

    if (!selectedServiceKey) {
      toast({
        title: "Selecione um servico",
        description: "Escolha o servico antes de confirmar o agendamento.",
        variant: "destructive",
      });
      return;
    }

    logBookingDebug("BOOK_CLICKED", {
      selectedDate,
      selectedTime,
      bookingWindowStart,
      bookingWindowEnd,
      timezone: slotsMeta.timezone,
    });

    setSubmitting(true);
    try {
      const latestSlots = await getSlotsByDate(selectedDate);
      const mergedLatestSlots = mergeSlotsWithConflicts(selectedDate, latestSlots.slots);
      setSlots(mergedLatestSlots);
      setSlotsMeta(latestSlots.meta || {});

      const nextWindowStart = latestSlots.meta?.bookingWindowStart || bookingWindowStart;
      const nextWindowEnd = latestSlots.meta?.bookingWindowEnd || bookingWindowEnd;
      setBookingWindowStart(nextWindowStart);
      setBookingWindowEnd(nextWindowEnd);

      if (!isDateWithinWindow(selectedDate, nextWindowStart, nextWindowEnd)) {
        toast({
          title: "Data fora da janela de agendamento",
          description: `Escolha uma data entre ${nextWindowStart} e ${nextWindowEnd}.`,
          variant: "destructive",
        });
        setSelectedDate(nextWindowStart);
        setSelectedTime("");
        return;
      }

      logBookingDebug("PREFLIGHT_SLOTS", {
        selectedDate,
        selectedTime,
        totalSlots: mergedLatestSlots.length,
        selectedSlot: mergedLatestSlots.find((slot) => slot.time === selectedTime) || null,
      });

      const selectedSlot = mergedLatestSlots.find((slot) => slot.time === selectedTime);
      if (!selectedSlot || selectedSlot.status !== "disponivel") {
        setSelectedTime("");
        toast({
          title: "Horario nao disponivel",
          description: "Atualizamos os horarios em tempo real. Escolha outro horario disponivel.",
          variant: "destructive",
        });
        return;
      }

      logBookingDebug("POST_APPOINTMENT_REQUEST", {
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        service_type: selectedServiceKey,
      });

      const createdAppointment = await createAppointment({
        date: selectedDate,
        time: selectedTime,
        serviceType: selectedServiceKey,
      });

      const summary = getAppointmentSummary(createdAppointment);
      const discount = createdAppointment.discount;

      logBookingDebug("POST_APPOINTMENT_SUCCESS", {
        selectedDate,
        selectedTime,
        serviceType: createdAppointment.serviceType || selectedServiceKey,
        serviceLabel: createdAppointment.serviceLabel || summary.serviceLabel,
        price: createdAppointment.price,
      });

      toast({
        title: "Agendamento confirmado!",
        description: `${summary.serviceLabel} • ${formatMoney(summary.servicePrice)} • ${summary.dateValue} às ${summary.timeValue.slice(0, 5)}`,
      });

      if (discount?.applied) {
        setLastDiscountSummary({
          applied: true,
          message: discount.message,
          basePrice: discount.basePrice,
          finalPrice: discount.finalPrice,
          discountPercent: discount.discountPercent,
        });

        toast({
          title: "Desconto de aniversario aplicado",
          description: discount.message || `Preco original ${formatMoney(discount.basePrice || summary.servicePrice)} • preco final ${formatMoney(discount.finalPrice || summary.servicePrice)}`,
        });
      } else {
        setLastDiscountSummary(null);
      }

      const bookingWhatsAppMessage = [
        `Olá! Meu nome é ${user?.fullName || "Cliente"}.`,
        "Acabei de agendar um horário.",
        `Data: ${summary.dateValue}`,
        `Hora: ${summary.timeValue.slice(0, 5)}`,
        `Serviço: ${summary.serviceLabel}`,
      ].join("\n");

      const openedWhatsApp = openWhatsAppMessage(bookingWhatsAppMessage, BUSINESS_WHATSAPP_NUMBER || undefined);
      if (!openedWhatsApp) {
        toast({
          title: "Nao foi possivel abrir o WhatsApp automaticamente",
          description: "Verifique se o navegador bloqueou pop-up e tente novamente.",
          variant: "destructive",
        });
      }

      await loadSlots(selectedDate);
      navigate("/meus-agendamentos");
    } catch (error) {
      if (error instanceof ApiClientError) {
        logBookingDebug("POST_APPOINTMENT_ERROR", {
          status: error.status,
          code: error.code || null,
          message: error.message,
          details: error.details || null,
          selectedDate,
          selectedTime,
        });
      } else {
        logBookingDebug("POST_APPOINTMENT_ERROR_UNKNOWN", {
          error,
          selectedDate,
          selectedTime,
        });
      }

      if (error instanceof ApiClientError && error.status === 401) {
        toast({
          title: "Sessao expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      if (error instanceof ApiClientError && (error.status === 409 || error.code === "SLOT_ALREADY_BOOKED")) {
        const isDbUniqueConflict =
          !!error.details && typeof error.details === "object" && (error.details as Record<string, unknown>).source === "db_unique_index";

        if (isDbUniqueConflict) {
          setConflictedTimesByDate((prev) => {
            const current = prev[selectedDate] || [];
            if (current.includes(selectedTime)) return prev;
            return {
              ...prev,
              [selectedDate]: [...current, selectedTime],
            };
          });
        }

        setSelectedTime("");
        await loadSlots(selectedDate, isDbUniqueConflict ? [selectedTime] : []);

        toast({
          title: "Horario atualizado",
          description: isDbUniqueConflict
            ? "Esse horario constava como disponivel, mas ja estava reservado no banco. Atualizamos a lista para voce escolher outro."
            : "Esse horario nao pode mais ser reservado. Escolha outro disponivel.",
          variant: "destructive",
        });
        return;
      }

      if (error instanceof ApiClientError && error.status === 400 && error.code === "INVALID_SERVICE_TYPE") {
        setSelectedServiceKey("");
        await loadServices();
        toast({
          title: "Servico invalido",
          description: "O servico selecionado nao e mais valido. Recarregamos o catalogo para voce selecionar novamente.",
          variant: "destructive",
        });
        return;
      }

      if (error instanceof ApiClientError && error.status === 400) {
        const rawMessage = (error.message || "").toLowerCase();
        const isWindowValidation =
          (error.code || "").toLowerCase().includes("window") ||
          rawMessage.includes("janela") ||
          rawMessage.includes("window");

        const message =
          isWindowValidation && bookingWindowStart && bookingWindowEnd
            ? `Data fora da janela de agendamento. Escolha uma data entre ${bookingWindowStart} e ${bookingWindowEnd}.`
            : error.message || "Dados invalidos para concluir o agendamento.";

        toast({
          title: "Nao foi possivel confirmar o agendamento",
          description: message,
          variant: "destructive",
        });
        return;
      }

      if (error instanceof ApiClientError && error.status === 500) {
        toast({
          title: "Erro interno",
          description: "Nao foi possivel concluir agora. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Erro ao agendar",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando autenticacao...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl px-4 pt-24 pb-16">
        <h1 className="font-heading text-3xl font-bold mb-2">
          AGENDAR <span className="gold-text">HORARIO</span>
        </h1>
        <p className="text-muted-foreground mb-8">Escolha o dia e horario do seu corte</p>
        <p className="text-sm text-muted-foreground mb-8">
          Agendamentos disponiveis de {format(parseLocalDate(bookingWindowStart), "dd/MM")} a {format(parseLocalDate(bookingWindowEnd), "dd/MM")}. 
        </p>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Escolha o dia</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {availableDates.map((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`rounded-lg p-3 text-center transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="font-heading text-sm font-semibold uppercase">{format(d, "EEE", { locale: ptBR })}</div>
                  <div className="text-lg font-bold">{format(d, "dd")}</div>
                  <div className="text-xs text-muted-foreground">{format(d, "MMM", { locale: ptBR })}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Escolha o servico</h2>
          </div>

          {servicesLoading ? (
            <p className="text-muted-foreground">Carregando servicos...</p>
          ) : services.length === 0 ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground">Nenhum servico disponivel no catalogo.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((service) => {
                const isSelected = selectedServiceKey === service.key;
                return (
                  <button
                    key={service.key}
                    onClick={() => setSelectedServiceKey(service.key)}
                    className={`rounded-lg p-4 text-left transition-all border ${
                      isSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <p className="font-heading font-semibold">{service.label}</p>
                    <p className="text-sm text-muted-foreground">{formatMoney(service.price)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Horarios disponiveis</h2>
          </div>

          {slotsLoading ? (
            <p className="text-muted-foreground">Carregando horarios...</p>
          ) : slotsError ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground space-y-3">
              <p>{slotsError}</p>
              <Button variant="outline" onClick={() => loadSlots(selectedDate)}>Tentar novamente</Button>
            </div>
          ) : slots.length === 0 ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground">Sem horarios disponiveis para esta data.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const disabled = slot.status !== "disponivel";
                const isSelected = selectedTime === slot.time;
                const statusLabel =
                  slot.status === "pago"
                    ? "Pago"
                    : slot.status === "agendado"
                      ? "Agendado"
                      : slot.status === "desabilitado"
                        ? "Desabilitado"
                        : "Disponivel";
                const reasonLabel = slot.status === "desabilitado" && slot.reason ? slot.reason : null;

                return (
                  <button
                    key={`${slot.time}-${slot.status}-${slot.reason || ""}`}
                    disabled={disabled}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-lg p-3 text-center transition-all border font-heading ${
                      disabled
                        ? "border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                        : isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <div>{slot.time.slice(0, 5)}</div>
                    <div className="text-[10px] mt-1">{statusLabel}</div>
                    {reasonLabel && <div className="text-[10px] mt-1 opacity-80">{reasonLabel}</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedDate && selectedTime && (
          <div className="animate-fade-in glass rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div>
                <p className="font-heading font-semibold">
                  {format(parseLocalDate(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-primary font-heading text-lg">{selectedTime.slice(0, 5)}</p>
                {selectedService && (
                  <p className="text-sm text-muted-foreground">
                    {selectedService.label} • {formatMoney(selectedService.price)}
                  </p>
                )}

                {lastDiscountSummary?.applied && (
                  <div className="mt-2 rounded-md border border-primary/40 bg-primary/10 p-2">
                    <p className="text-sm font-semibold text-primary">Desconto de aniversario aplicado</p>
                    {lastDiscountSummary.message && (
                      <p className="text-xs text-muted-foreground mt-1">{lastDiscountSummary.message}</p>
                    )}
                    <p className="text-xs text-foreground mt-1">
                      Preco original: {formatMoney(lastDiscountSummary.basePrice || selectedService?.price || 0)}
                    </p>
                    <p className="text-xs text-foreground">
                      Preco final: {formatMoney(lastDiscountSummary.finalPrice || selectedService?.price || 0)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleBook} disabled={submitting || !selectedServiceKey} className="font-heading">
              {submitting ? "Agendando..." : "CONFIRMAR AGENDAMENTO"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
