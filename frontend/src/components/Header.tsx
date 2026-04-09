import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Calendar, Shield } from "lucide-react";
import logoImage from "@/assets/Chincoa Cort's logo.png";

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImage} alt="Logo Chincoa Cortes" className="h-8 w-8 object-contain" />
          <span className="font-heading text-xl font-bold gold-text">CHINCOA CORTES</span>
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/agendar">
                <Button variant="ghost" size="sm" className="gap-2 text-foreground hover:text-primary">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden sm:inline">Agendar</span>
                </Button>
              </Link>
              <Link to="/meus-agendamentos">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
                  <span className="hidden sm:inline">Meus Horários</span>
                  <span className="sm:hidden">Horários</span>
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-2 text-primary">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">Entrar</Button>
              </Link>
              <Link to="/cadastro">
                <Button size="sm">Cadastrar</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
