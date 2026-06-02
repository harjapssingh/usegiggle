import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode; requireProfile?: boolean }) {
  // Auth disabled — always render children.
  return <>{children}</>;
}
