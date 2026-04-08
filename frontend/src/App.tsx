import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { API_BASE_URL, getBackendHealth } from "@/lib/api";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Booking from "./pages/Booking";
import MyAppointments from "./pages/MyAppointments";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    getBackendHealth()
      .then((health) => {
        console.info("Backend connected", {
          apiUrl: API_BASE_URL,
          status: health.status,
          service: health.service,
        });
      })
      .catch((error) => {
        console.warn("Backend unavailable", {
          apiUrl: API_BASE_URL,
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Register />} />
              <Route path="/agendar" element={<Booking />} />
              <Route path="/meus-agendamentos" element={<MyAppointments />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
