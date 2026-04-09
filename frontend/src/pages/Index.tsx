import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Clock, CalendarDays, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import heroImage from "@/assets/hero-barbershop.jpg";
import logoImage from "@/assets/Chincoa Cort's logo.png";

function isBirthdayToday(dateText?: string) {
  if (!dateText) return false;
  const parts = dateText.slice(0, 10).split("-");
  if (parts.length !== 3) return false;

  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const now = new Date();

  return month === now.getMonth() + 1 && day === now.getDate();
}

const Index = () => {
  const { user, birthdayDiscount, refreshSession } = useAuth();
  const hasBirthdayPromo = Boolean(
    birthdayDiscount.active || ((birthdayDiscount.discountPercent ?? 0) > 0 && isBirthdayToday(user?.birthDate)),
  );

  useEffect(() => {
    if (user) {
      refreshSession();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto animate-fade-in">
          {user && hasBirthdayPromo && (
            <div className="mb-4 glass rounded-lg border border-primary/40 bg-primary/10 p-4 text-left sm:text-center">
              <div className="inline-flex items-center gap-2 text-primary font-semibold">
                <Gift className="h-4 w-4" />
                Parabens! Desconto de aniversario ativo
              </div>
              <p className="text-sm text-foreground mt-2">{birthdayDiscount.message || "Voce tem 50% no corte hoje."}</p>
              <p className="text-sm font-semibold text-primary mt-1">
                {birthdayDiscount.discountPercent ? `${birthdayDiscount.discountPercent}% no corte hoje` : "50% no corte hoje"}
              </p>
            </div>
          )}

          <img
            src={logoImage}
            alt="Logo Chincoa Cortes"
            className="h-20 w-20 md:h-24 md:w-24 object-contain mx-auto mb-2"
          />

          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-primary/30 bg-primary/10">
            <Scissors className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Barbearia Premium</span>
          </div>
          
          <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6 leading-tight">
            ESTILO QUE<br />
            <span className="gold-text">DEFINE VOCÊ</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Experiência premium em corte masculino. Agende online e garanta seu horário.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={user ? "/agendar" : "/cadastro"}>
              <Button size="lg" className="text-lg px-8 py-6 font-heading">
                AGENDAR AGORA
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-16">
            NOSSOS <span className="gold-text">SERVIÇOS</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Scissors, title: "Corte Masculino", desc: "Corte personalizado com técnicas modernas", price: "R$ 50" },
              { icon: Clock, title: "Barba", desc: "Modelagem e acabamento profissional", price: "R$ 30" },
              { icon: CalendarDays, title: "Combo Completo", desc: "Corte + barba + sobrancelha", price: "R$ 85" },
            ].map((service, i) => (
              <div
                key={service.title}
                className="glass rounded-lg p-8 text-center hover:border-primary/30 transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <service.icon className="h-10 w-10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-heading text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{service.desc}</p>
                <span className="font-heading text-2xl font-bold text-primary">{service.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="font-heading text-3xl font-bold mb-4">
            PRONTO PARA O <span className="gold-text">SEU CORTE</span>?
          </h2>
          <p className="text-muted-foreground mb-8">
            Cadastre-se e agende seu horário em segundos.
          </p>
          <Link to={user ? "/agendar" : "/cadastro"}>
            <Button size="lg" className="font-heading text-lg px-8">
              {user ? "AGENDAR" : "COMEÇAR AGORA"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© 2026 Chincoa Cortes. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
