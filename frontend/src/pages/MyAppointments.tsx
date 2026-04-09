import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cancelMyAppointment, getFriendlyErrorMessage, getMyAppointments, type Appointment } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

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

  const handleCancel = async (id: string) => {
    try {
      await cancelMyAppointment(id);
      toast({ title: "Agendamento cancelado" });
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
              return (
                <div key={appointment.id} className="glass rounded-lg p-5 flex items-center justify-between">
                  <div>
                    <p className="font-heading font-semibold">
                      {formatAppointmentDate(appointment.appointmentDate)}
                    </p>
                    <p className="text-primary font-heading text-lg">{formatAppointmentTime(appointment.appointmentTime)}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  {appointment.status !== "pago" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(appointment.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
