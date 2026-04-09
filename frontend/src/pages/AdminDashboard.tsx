import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CalendarDays, CheckCircle, DollarSign, RotateCcw, Shield, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteAdminAppointment,
  getAdminAppointmentsByDate,
  getFriendlyErrorMessage,
  updateAdminAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
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
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
    }
  }, [user, isAdmin, authLoading, navigate]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await getAdminAppointmentsByDate(filterDate);
      setAppointments(data);
    } catch (error) {
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

  useEffect(() => {
    if (isAdmin) {
      loadAppointments();
    }
  }, [isAdmin, filterDate]);

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
      toast({
        title: "Erro ao remover",
        description: getFriendlyErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const totals = useMemo(() => {
    const totalAgendado = appointments.filter((appointment) => appointment.status === "agendado").length;
    const totalPago = appointments.filter((appointment) => appointment.status === "pago").length;
    const faturamento = appointments
      .filter((appointment) => appointment.status === "pago")
      .reduce((sum, appointment) => sum + (appointment.price || 0), 0);

    return { totalAgendado, totalPago, faturamento };
  }, [appointments]);

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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
            <p className="text-2xl font-heading font-bold">R$ {totals.faturamento}</p>
            <p className="text-sm text-muted-foreground">Faturamento</p>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            className="bg-card border border-border rounded-lg px-4 py-2 text-foreground font-heading"
          />
        </div>

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

              return (
                <div key={appointment.id} className="glass rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-heading font-semibold text-lg">{appointment.appointmentTime.slice(0, 5)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>{appointment.status}</span>
                      </div>
                      <p className="text-sm text-foreground">Cliente: {appointment.fullName || "Sem nome"}</p>
                      <p className="text-sm text-foreground">Servico: {toServiceLabel(appointment)}</p>
                      <p className="text-sm text-foreground">Valor: {formatMoney(appointment.price || 0)}</p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.phone || "-"} · {appointment.email || "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {appointment.status === "agendado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(appointment.id, "pago")}
                          className="text-green-400 border-green-400/30 hover:bg-green-400/10 gap-1"
                        >
                          <CheckCircle className="h-3 w-3" /> Pago
                        </Button>
                      )}

                      {appointment.status !== "disponivel" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(appointment.id, "disponivel")}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3 w-3" /> Liberar horario
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeAppointment(appointment.id)}
                        className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
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
      </div>
    </div>
  );
};

export default AdminDashboard;
