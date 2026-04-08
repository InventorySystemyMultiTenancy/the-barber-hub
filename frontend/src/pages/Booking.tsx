import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { format, addDays, isBefore, startOfToday, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react";

const HOURS = Array.from({ length: 11 }, (_, i) => {
  const h = 9 + i; // 09:00 to 19:00
  return `${String(h).padStart(2, "0")}:00`;
});

const Booking = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Generate next 7 days (Mon-Sat only)
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i))
    .filter((d) => d.getDay() !== 0) // no Sunday
    .slice(0, 7);

  // Fetch booked slots for selected date
  useEffect(() => {
    if (!selectedDate) return;
    const fetchSlots = async () => {
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", selectedDate)
        .in("status", ["agendado", "pago"]);
      setBookedSlots(data?.map((a) => a.appointment_time as string) ?? []);
    };
    fetchSlots();
  }, [selectedDate]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      appointment_date: selectedDate,
      appointment_time: selectedTime,
      status: "agendado",
    });

    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Horário já reservado", description: "Escolha outro horário.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Agendamento confirmado!", description: `${format(new Date(selectedDate), "dd/MM/yyyy")} às ${selectedTime}` });
      navigate("/meus-agendamentos");
    }
  };

  // Check if time is in the past for today
  const isTimePast = (date: string, time: string) => {
    if (date !== format(startOfToday(), "yyyy-MM-dd")) return false;
    const [h] = time.split(":").map(Number);
    return h <= new Date().getHours();
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl px-4 pt-24 pb-16">
        <h1 className="font-heading text-3xl font-bold mb-2">
          AGENDAR <span className="gold-text">HORÁRIO</span>
        </h1>
        <p className="text-muted-foreground mb-8">Escolha o dia e horário do seu corte</p>

        {/* Step 1: Date */}
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
                  onClick={() => { setSelectedDate(dateStr); setSelectedTime(""); }}
                  className={`rounded-lg p-3 text-center transition-all border ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="font-heading text-sm font-semibold uppercase">
                    {format(d, "EEE", { locale: ptBR })}
                  </div>
                  <div className="text-lg font-bold">{format(d, "dd")}</div>
                  <div className="text-xs text-muted-foreground">{format(d, "MMM", { locale: ptBR })}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Time */}
        {selectedDate && (
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-lg font-semibold">Escolha o horário</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {HOURS.map((time) => {
                const timeForDb = time + ":00"; // HH:mm:ss
                const isBooked = bookedSlots.some((s) => s.startsWith(time));
                const isPast = isTimePast(selectedDate, time);
                const disabled = isBooked || isPast;
                const isSelected = selectedTime === timeForDb;

                return (
                  <button
                    key={time}
                    disabled={disabled}
                    onClick={() => setSelectedTime(timeForDb)}
                    className={`rounded-lg p-3 text-center transition-all border font-heading ${
                      disabled
                        ? "border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed line-through"
                        : isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
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
