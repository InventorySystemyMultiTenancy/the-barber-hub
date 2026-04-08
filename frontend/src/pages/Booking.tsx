import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  createAppointment,
  getBackendHealth,
  getFriendlyErrorMessage,
  getSlotsByDate,
  type AppointmentSlot,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const Booking = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(format(startOfToday(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [backendNow, setBackendNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    getBackendHealth()
      .then((health) => {
        const now = new Date(health.timestamp);
        if (!Number.isNaN(now.getTime())) {
          setBackendNow(now);
        }
      })
      .catch(() => {
        setBackendNow(null);
      });
  }, []);

  const availableDates = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i))
        .filter((d) => d.getDay() !== 0)
        .slice(0, 7),
    [],
  );

  const loadSlots = async (date: string) => {
    setSlotsLoading(true);
    try {
      const response = await getSlotsByDate(date);
      setSlots(response);
    } catch (error) {
      setSlots([]);
      toast({
        title: "Falha ao carregar horarios",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate || !user) return;
    setSelectedTime("");
    loadSlots(selectedDate);
  }, [selectedDate, user]);

  const isPastForBackendToday = (time: string) => {
    if (!backendNow) return false;

    const backendDate = format(backendNow, "yyyy-MM-dd");
    if (selectedDate !== backendDate) return false;

    const [hour, minute] = time.slice(0, 5).split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return false;

    const slotMinutes = hour * 60 + minute;
    const nowMinutes = backendNow.getHours() * 60 + backendNow.getMinutes();
    return slotMinutes <= nowMinutes;
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;

    if (isPastForBackendToday(selectedTime)) {
      toast({
        title: "Erro ao agendar",
        description: "Esse horario ja e considerado passado pelo backend. Escolha outro horario ou outra data.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({ date: selectedDate, time: selectedTime });
      toast({ title: "Agendamento confirmado!", description: `${format(new Date(selectedDate), "dd/MM/yyyy")} às ${selectedTime.slice(0, 5)}` });
      await loadSlots(selectedDate);
      navigate("/meus-agendamentos");
    } catch (error) {
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
                    isSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/30"
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
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">Horarios disponiveis</h2>
          </div>

          {slotsLoading ? (
            <p className="text-muted-foreground">Carregando horarios...</p>
          ) : slots.length === 0 ? (
            <div className="glass rounded-lg p-5 text-center text-muted-foreground">Nenhum horario retornado para esta data.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot) => {
                const blockedByBackendTime = isPastForBackendToday(slot.time);
                const disabled = slot.status !== "disponivel" || blockedByBackendTime;
                const isSelected = selectedTime === slot.time;
                const statusLabel = blockedByBackendTime
                  ? "Passado"
                  : slot.status === "pago"
                    ? "Pago"
                    : slot.status === "agendado"
                      ? "Agendado"
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
                  {format(new Date(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-primary font-heading text-lg">{selectedTime.slice(0, 5)}</p>
              </div>
            </div>
            <Button onClick={handleBook} disabled={submitting} className="font-heading">
              {submitting ? "Agendando..." : "CONFIRMAR AGENDAMENTO"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
