import { NavLink } from "react-router-dom";
import { Home, NotebookPen } from "lucide-react";

export function BottomNav() {
  const base =
    "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 font-mono-tech text-[10px] font-bold uppercase tracking-wider transition-colors";
  return (
    <nav className="sticky bottom-0 z-30 border-t-2 border-foreground bg-background/95 backdrop-blur">
      <div className="container max-w-2xl px-0">
        <div className="flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
            }
          >
            <Home className="h-5 w-5" strokeWidth={2.5} />
            Home
          </NavLink>
          <NavLink
            to="/diary"
            className={({ isActive }) =>
              `${base} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
            }
          >
            <NotebookPen className="h-5 w-5" strokeWidth={2.5} />
            Diary
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
