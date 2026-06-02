import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, profileChecked } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already signed in, route appropriately. ONBOARDING ONLY IF NO PROFILE.
  useEffect(() => {
    if (user && profileChecked) {
      navigate(profile ? "/app" : "/onboarding", { replace: true });
    }
  }, [user, profile, profileChecked, navigate]);

  // Direct XHR fallback that bypasses the preview fetch proxy (which can block
  // POST /auth/v1/token with "Failed to fetch" / "Load failed").
  const xhrAuth = (path: string, body: any) =>
    new Promise<any>((resolve, reject) => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/${path}`;
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      xhr.setRequestHeader("Authorization", `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`);
      xhr.onload = () => {
        try {
          const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          if (xhr.status >= 200 && xhr.status < 300) resolve(json);
          else reject(new Error(json?.msg || json?.error_description || json?.error || `HTTP ${xhr.status}`));
        } catch (e: any) {
          reject(new Error(e?.message || "Unexpected response"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(JSON.stringify(body));
    });

  const fallbackSignIn = async () => {
    const data = await xhrAuth("token?grant_type=password", { email, password });
    if (data?.access_token && data?.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return true;
    }
    throw new Error("No session returned");
  };

  const fallbackSignUp = async () => {
    const data = await xhrAuth("signup", { email, password });
    if (data?.access_token && data?.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return true;
    }
    // Auto-confirm is on, but if no session returned, try signing in.
    return await fallbackSignIn();
  };

  const isNetworkErr = (msg: string) => {
    const m = msg.toLowerCase();
    return m.includes("failed to fetch") || m.includes("load failed") || m.includes("networkerror") || m.includes("network error");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/onboarding", { replace: true });
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="container py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <Logo className="h-9 w-9" wordmarkClassName="text-xl" />
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md card-soft p-7 md:p-9">
          <h1 className="font-display text-3xl mb-2">{mode === "signup" ? "Join Giggle" : "Welcome back"}</h1>
          <p className="text-muted-foreground mb-7">
            {mode === "signup" ? "Create an account in 30 seconds." : "Sign in to your account."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email"
                className="mt-1.5 h-12 text-base rounded-xl bg-background"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-base">Password</Label>
              <Input
                id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="mt-1.5 h-12 text-base rounded-xl bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1.5">At least 6 characters.</p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl text-base tap-target">
              {submitting ? "Just a moment…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signup" ? "Already a neighbour?" : "New to Giggle?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
