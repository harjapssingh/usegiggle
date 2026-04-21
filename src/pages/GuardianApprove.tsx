import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guardian-approve`;

export default function GuardianApprove() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "ready" | "approved" | "invalid" | "submitting">("loading");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`${FN_URL}?token=${encodeURIComponent(token)}`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) setState("invalid");
      else setState(data.approved ? "approved" : "ready");
    }).catch(() => setState("invalid"));
  }, [token]);

  const approve = async () => {
    setState("submitting");
    const r = await fetch(FN_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setState(r.ok ? "approved" : "invalid");
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="card-soft max-w-md w-full p-8 text-center">
        {state === "loading" && <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />}

        {state === "invalid" && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive mx-auto mb-4 flex items-center justify-center">
              <X className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl mb-2">Link not valid</h1>
            <p className="text-muted-foreground">This approval link is invalid or expired.</p>
          </>
        )}

        {state === "ready" && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary mx-auto mb-4 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl mb-2">Approve this job?</h1>
            <p className="text-muted-foreground mb-6">Your child has expressed interest in a neighbourhood task. Approving lets the homeowner see their interest and contact them.</p>
            <Button onClick={approve} size="lg" className="rounded-xl tap-target w-full">I approve this job</Button>
          </>
        )}

        {state === "submitting" && <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />}

        {state === "approved" && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary mx-auto mb-4 flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl mb-2">Approved — thank you!</h1>
            <p className="text-muted-foreground">The homeowner can now see your child's interest. You can close this window.</p>
          </>
        )}
      </div>
    </div>
  );
}
