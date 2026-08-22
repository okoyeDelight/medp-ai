import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Diary from "./pages/Diary.tsx";
import Auth from "./pages/Auth.tsx";
import Profile from "./pages/Profile.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import TermsOfService from "./pages/TermsOfService.tsx";
import SafetyScan from "./pages/SafetyScan.tsx";
import SafetySync from "./pages/SafetySync.tsx";
import HealthSync from "./pages/HealthSync.tsx";
import Connectivity from "./pages/Connectivity.tsx";
import ProviderAuth from "./pages/ProviderAuth.tsx";
import ProviderPending from "./pages/ProviderPending.tsx";
import HospitalDashboard from "./pages/HospitalDashboard.tsx";
import Chemists from "./pages/Chemists.tsx";
import PharmacyDashboard from "./pages/PharmacyDashboard.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import PatientTriage from "./pages/PatientTriage.tsx";
import TriageDesk from "./pages/TriageDesk.tsx";
import SelectWorkspace from "./pages/SelectWorkspace.tsx";
import Welcome from "./pages/Welcome.tsx";
import { BottomNav } from "@/components/BottomNav";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireProvider } from "@/components/RequireProvider";
import { I18nProvider } from "@/lib/i18n";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Index />
                  </RequireAuth>
                }
              />
              <Route
                path="/diary"
                element={
                  <RequireAuth>
                    <Diary />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route
                path="/safety-scan"
                element={
                  <RequireAuth>
                    <SafetyScan />
                  </RequireAuth>
                }
              />
              <Route
                path="/safety-sync"
                element={
                  <RequireAuth>
                    <SafetySync />
                  </RequireAuth>
                }
              />
              <Route
                path="/health-sync"
                element={
                  <RequireAuth>
                    <HealthSync />
                  </RequireAuth>
                }
              />
              <Route
                path="/connectivity"
                element={
                  <RequireAuth>
                    <Connectivity />
                  </RequireAuth>
                }
              />
              <Route path="/provider/auth" element={<ProviderAuth />} />
              <Route
                path="/provider/pending"
                element={
                  <RequireAuth>
                    <ProviderPending />
                  </RequireAuth>
                }
              />
              <Route
                path="/hospital-dashboard"
                element={
                  <RequireProvider>
                    <HospitalDashboard />
                  </RequireProvider>
                }
              />
              <Route
                path="/chemists"
                element={
                  <RequireAuth>
                    <Chemists />
                  </RequireAuth>
                }
              />
              <Route
                path="/pharmacy/dashboard"
                element={
                  <RequireAuth>
                    <PharmacyDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/triage"
                element={<RequireAuth><PatientTriage /></RequireAuth>}
              />
              <Route
                path="/triage-desk"
                element={<RequireProvider><TriageDesk /></RequireProvider>}
              />
              <Route path="/select-workspace" element={<RequireAuth><SelectWorkspace /></RequireAuth>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
