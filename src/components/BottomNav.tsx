import { NavLink, useLocation } from "react-router-dom";
import { Activity, Home, NotebookPen, Pill, Shield, User } from "lucide-react";

export function BottomNav() {
  const { pathname } = useLocation();
  // Hide patient nav on provider/clinical routes
  if (
    pathname.startsWith("/provider") ||
    pathname.startsWith("/hospital-dashboard") ||
    pathname.startsWith("/pharmacy/") ||
    pathname === "/welcome" ||
    pathname === "/auth"
  ) {
    return null;
  }
  const base =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 font-mono-tech text-[10px] font-bold uppercase tracking-wider transition-colors";
  return (
    <nav className="sticky bottom-0 z-30 border-t-2 border-foreground bg-background/95 backdrop-blur">
      <div className="container max-w-2xl px-0">
        <div className="flex">
          <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Home className="h-5 w-5" strokeWidth={2.5} />
            Home
          </NavLink>
          <NavLink to="/diary" className={({ isActive }) => `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <NotebookPen className="h-5 w-5" strokeWidth={2.5} />
            Diary
          </NavLink>
          <NavLink to="/safety-scan" className={({ isActive }) => `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Shield className="h-5 w-5" strokeWidth={2.5} />
            Safety
          </NavLink>
          <NavLink to="/chemists" className={({ isActive }) => `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Pill className="h-5 w-5" strokeWidth={2.5} />
            Chemist
          </NavLink>
          <NavLink to="/health-sync" className={({ isActive }) => `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Activity className="h-5 w-5" strokeWidth={2.5} />
            Vitals
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <User className="h-5 w-5" strokeWidth={2.5} />
            Profile
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
