import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Shield, DollarSign, CalendarDays, CheckCircle, Trash2, RotateCcw } from "lucide-react";

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  price: number;
  user_id: string;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
}

interface AppointmentWithProfile extends AppointmentRow {
  profile?: ProfileRow;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/");
  }, [user, isAdmin, authLoading, navigate]);

  const fetchAppointments = async () => {
    const { data: aptsData } = await supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", filterDate)
      .order("appointment_time", { ascending: true });

    const apts = (aptsData as AppointmentRow[]) ?? [];
    const userIds = [...new Set(apts.map((a) => a.user_id))];

    let profilesMap: Record<string, ProfileRow> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, email")
        .in("user_id", userIds);
      for (const p of (profilesData as ProfileRow[]) ?? []) {
        profilesMap[p.user_id] = p;
      }
    }

    setAppointments(apts.map((a) => ({ ...a, profile: profilesMap[a.user_id] })));
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchAppointments();
  }, [isAdmin, filterDate]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Status atualizado para: ${status}` });
      fetchAppointments();
    }
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agendamento excluído" });
      fetchAppointments();
    }
  };

  const totalAgendados = appointments.filter((a) => a.status === "agendado").length;
  const totalPagos = appointments.filter((a) => a.status === "pago").length;
  const faturamento = totalPagos * 45;

  if (authLoading || !isAdmin) return null;

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

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="glass rounded-lg p-5 text-center">
            <CalendarDays className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold">{appointments.length}</p>
            <p className="text-sm text-muted-foreground">Total do dia</p>
          </div>
          <div className="glass rounded-lg p-5 text-center">
            <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold">{totalPagos}</p>
            <p className="text-sm text-muted-foreground">Cortes pagos</p>
          </div>
          <div className="glass rounded-lg p-5 text-center">
            <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-heading font-bold">R$ {faturamento}</p>
            <p className="text-sm text-muted-foreground">Faturamento</p>
          </div>
        </div>

        {/* Date filter */}
        <div className="mb-6">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-card border border-border rounded-lg px-4 py-2 text-foreground font-heading"
          />
        </div>

        {/* Appointments Table */}
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 glass rounded-lg">
            <p className="text-muted-foreground">Nenhum agendamento nesta data</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => {
              const profile = apt.profile;
              const statusColors: Record<string, string> = {
                agendado: "bg-primary/20 text-primary",
                pago: "bg-green-500/20 text-green-400",
                disponivel: "bg-muted text-muted-foreground",
              };
              return (
                <div key={apt.id} className="glass rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-heading font-semibold text-lg">
                          {(apt.appointment_time as string).slice(0, 5)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[apt.status] ?? ""}`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{profile?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile?.phone} · {profile?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.status === "agendado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(apt.id, "pago")}
                          className="text-green-400 border-green-400/30 hover:bg-green-400/10 gap-1"
                        >
                          <CheckCircle className="h-3 w-3" /> Pago
                        </Button>
                      )}
                      {apt.status !== "disponivel" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(apt.id, "disponivel")}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3 w-3" /> Liberar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAppointment(apt.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
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
