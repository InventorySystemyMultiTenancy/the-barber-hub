import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, MessageCircle, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cancelMyAppointment, getFriendlyErrorMessage, getMyAppointments, type Appointment } from "@/lib/api";
import { BUSINESS_WHATSAPP_NUMBER, openWhatsAppMessage } from "@/lib/whatsapp";
import { toast } from "@/hooks/use-toast";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
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

function parseLocalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day);
    if (!Number.isNaN(localDate.getTime())) return localDate;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatAppointmentDate(value: string) {
  const date = parseLocalDate(value);
  if (!date) return "Data invalida";
  return format(date, "EEEE, dd/MM", { locale: ptBR });
}

function formatAppointmentTime(value: string) {
  if (!value) return "--:--";
  return value.slice(0, 5);
}

function buildAppointmentWhatsAppMessage(appointment: Appointment, customerName?: string, mode: "scheduled" | "canceled" = "scheduled") {
  const serviceLabel = appointment.serviceLabel || "Servico";
  const customerLabel = customerName || appointment.fullName || "Cliente";
  const actionLabel = mode === "canceled" ? "cancelou o agendamento" : "agendou um horario";

  return [
    `O cliente ${customerLabel} ${actionLabel}.`,
    `Data: ${formatAppointmentDate(appointment.appointmentDate)}`,
    `Hora: ${formatAppointmentTime(appointment.appointmentTime)}`,
    `Servico: ${serviceLabel}`,
    `Valor: ${formatMoney(appointment.price || 0)}`,
  ].join("\n");
}

const MyAppointments = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await getMyAppointments();
      setAppointments(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar agendamentos",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const handleSendToWhatsApp = (appointment: Appointment, mode: "scheduled" | "canceled" = "scheduled") => {
    const message = buildAppointmentWhatsAppMessage(appointment, user?.fullName, mode);
    const opened = openWhatsAppMessage(message, BUSINESS_WHATSAPP_NUMBER);

    if (!opened) {
      toast({
        title: "Nao foi possivel abrir o WhatsApp",
        description: "Verifique se o navegador bloqueou a abertura da nova aba.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleCancel = async (appointment: Appointment) => {
    const confirmed = window.confirm("Deseja cancelar este agendamento?");
    if (!confirmed) return;

    try {
      await cancelMyAppointment(appointment.id);
      toast({ title: "Agendamento cancelado" });
      handleSendToWhatsApp(appointment, "canceled");
      await loadAppointments();
    } catch (error) {
      toast({
        title: "Erro ao cancelar",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      agendado: { label: "Agendado", className: "bg-primary/20 text-primary" },
      pago: { label: "Pago", className: "bg-green-500/20 text-green-400" },
      disponivel: { label: "Disponivel", className: "bg-muted text-muted-foreground" },
    };

    return map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
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
          MEUS <span className="gold-text">AGENDAMENTOS</span>
        </h1>
        <p className="text-muted-foreground mb-8">Gerencie seus horarios</p>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 glass rounded-lg">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum agendamento encontrado</p>
            <Button onClick={() => navigate("/agendar")} className="font-heading">
              AGENDAR AGORA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const status = statusLabel(appointment.status);
              const discountPrices = getDiscountPriceDetails({
                base: appointment.discount?.basePrice,
                final: appointment.discount?.finalPrice,
                percent: appointment.discount?.discountPercent,
                fallback: appointment.price ?? 0,
              });

              return (
                <div key={appointment.id} className="glass rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-semibold">
                      {formatAppointmentDate(appointment.appointmentDate)}
                    </p>
                    <p className="text-primary font-heading text-lg">{formatAppointmentTime(appointment.appointmentTime)}</p>
                    {appointment.serviceLabel && (
                      <p className="text-sm text-foreground/80 mt-1">{appointment.serviceLabel}</p>
                    )}
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-2">Valor: {formatMoney(appointment.price || 0)}</p>
                    {appointment.discount?.applied && (
                      <div className="mt-2 rounded-md border border-primary/40 bg-primary/10 p-2">
                        <p className="text-xs font-semibold text-primary">Desconto de aniversario aplicado</p>
                        {appointment.discount.message && (
                          <p className="text-xs text-muted-foreground mt-1">{appointment.discount.message}</p>
                        )}
                        <p className="text-xs text-foreground mt-1">
                          Original: {formatMoney(discountPrices.base)}
                        </p>
                        <p className="text-xs text-foreground">
                          Final: {formatMoney(discountPrices.final)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendToWhatsApp(appointment, "scheduled")}
                      className="gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar para WhatsApp
                    </Button>
                    {appointment.status !== "pago" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(appointment)}
                        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;
