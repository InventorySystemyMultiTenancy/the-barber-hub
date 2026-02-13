import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Trash2 } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  price: number;
}

const MyAppointments = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchAppointments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("appointment_date", { ascending: true });
    setAppointments((data as Appointment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agendamento cancelado" });
      fetchAppointments();
    }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; class: string }> = {
      agendado: { label: "Agendado", class: "bg-primary/20 text-primary" },
      pago: { label: "Pago ✓", class: "bg-green-500/20 text-green-400" },
      disponivel: { label: "Disponível", class: "bg-muted text-muted-foreground" },
    };
    return map[s] ?? { label: s, class: "bg-muted text-muted-foreground" };
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-2xl px-4 pt-24 pb-16">
        <h1 className="font-heading text-3xl font-bold mb-2">
          MEUS <span className="gold-text">AGENDAMENTOS</span>
        </h1>
        <p className="text-muted-foreground mb-8">Gerencie seus horários</p>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 glass rounded-lg">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum agendamento encontrado</p>
            <Button onClick={() => navigate("/agendar")} className="font-heading">AGENDAR AGORA</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt) => {
              const status = statusLabel(apt.status);
              return (
                <div key={apt.id} className="glass rounded-lg p-5 flex items-center justify-between">
                  <div>
                    <p className="font-heading font-semibold">
                      {format(new Date(apt.appointment_date + "T00:00:00"), "EEEE, dd/MM", { locale: ptBR })}
                    </p>
                    <p className="text-primary font-heading text-lg">{(apt.appointment_time as string).slice(0, 5)}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                  {apt.status !== "pago" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(apt.id)}
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
