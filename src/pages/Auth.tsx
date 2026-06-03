import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { localSignIn } from "@/lib/localApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Auth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile, profileChecked } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // If already signed in, route appropriately. ONBOARDING ONLY IF NO PROFILE.
  useEffect(() => {
    if (user && profileChecked) {
      navigate(profile ? "/app" : "/onboarding", { replace: true });
    }
  }, [user, profile, profileChecked, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { profile } = localSignIn(email);
    navigate(profile ? "/app" : "/onboarding", { replace: true });
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
                autoComplete="email"
                className="mt-1.5 h-12 text-base rounded-xl bg-background"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-base">Password</Label>
              <Input
                id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="mt-1.5 h-12 text-base rounded-xl bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1.5">At least 6 characters.</p>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base tap-target">
              {mode === "signup" ? "Create account" : "Sign in"}
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
