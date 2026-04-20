import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children, requireProfile = true }: { children: React.ReactNode; requireProfile?: boolean }) {
  const { user, profile, loading, profileChecked } = useAuth();
  const location = useLocation();

  if (loading || !profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />;

  // Onboarding gate: only shown to users without a profile row.
  if (requireProfile && !profile && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // Already onboarded? Don't show onboarding again.
  if (!requireProfile && profile && location.pathname === "/onboarding") {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
