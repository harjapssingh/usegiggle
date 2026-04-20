import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, PlusCircle, Users, User, LogOut, Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isHomeowner = profile?.role === "homeowner";

  const navItems = [
    { to: "/app", label: "Home", icon: Home, end: true },
    isHomeowner
      ? { to: "/app/post", label: "Post a job", icon: PlusCircle, end: false }
      : { to: "/app/jobs",  label: "Find jobs", icon: PlusCircle, end: false },
    { to: "/app/helpers", label: isHomeowner ? "Helpers" : "Community", icon: Users, end: false },
    { to: "/app/profile", label: "Profile", icon: User, end: false },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 border-r border-border bg-card/60 backdrop-blur-sm flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10">
          <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="font-display text-2xl">Giggle</span>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-secondary"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <div className="px-2 pb-3 text-sm">
            <p className="font-semibold truncate">{profile?.full_name}</p>
            <p className="text-muted-foreground capitalize">{profile?.role}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 pb-24 md:pb-10">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Sprout className="h-4 w-4" />
            </div>
            <span className="font-display text-xl">Giggle</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <div className="px-5 md:px-10 py-6 md:py-10 max-w-5xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "tap-target flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl flex-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[11px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
