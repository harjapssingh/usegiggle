import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Loader2, UserPlus, Briefcase, Check, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { categoryIcon, categoryLabel, type CategoryKey } from "@/lib/categories";
import { toast } from "sonner";

interface PendingItem {
  kind: "link" | "job";
  helper_id: string;
  helper_name: string;
  job_id: string | null;
  job_description: string | null;
  job_category: CategoryKey | null;
  requested_at: string;
}

export default function GuardianHome() {
  const { profile, user } = useAuth();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PendingItem | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinMissing, setPinMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_guardian_pending");
    if (error) toast.error("Couldn't load pending items.");
    setItems(((data as PendingItem[]) ?? []));
    if (user) {
      const { data: gp } = await supabase.from("guardian_profiles").select("id").eq("id", user.id).maybeSingle();
      setPinMissing(!gp);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!active || pin.length !== 4) return;
    setBusy(true);
    try {
      if (active.kind === "link") {
        const { data, error } = await supabase.rpc("confirm_guardian_link", {
          _helper_id: active.helper_id, _pin: pin,
        });
        if (error) { toast.error(error.message); return; }
        if (data === true) { toast.success(`Linked to ${active.helper_name}.`); setActive(null); setPin(""); load(); }
        else toast.error("Wrong PIN. Try again.");
      } else if (active.kind === "job" && active.job_id) {
        const { data, error } = await supabase.rpc("approve_job_with_pin", {
          _job_id: active.job_id, _helper_id: active.helper_id, _pin: pin,
        });
        if (error) { toast.error(error.message); return; }
        if (data === true) { toast.success("Approved!"); setActive(null); setPin(""); load(); }
        else toast.error("Wrong PIN. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div>
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="font-display text-3xl md:text-4xl">{profile?.full_name?.split(" ")[0]}</h1>
      </div>

      {pinMissing ? (
        <div className="card-soft p-5 bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-fade-in">
          <KeyRound className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Set your guardian PIN</p>
            <p className="text-sm text-muted-foreground mb-3">
              Before you can approve jobs or helper links, you need to set a 4-digit PIN.
            </p>
            <Button asChild size="sm" className="rounded-xl">
              <Link to="/app/profile">Set PIN now</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="card-soft p-5 bg-primary-soft/30 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">You're keeping your child safe.</p>
            <p className="text-sm text-muted-foreground">
              Each job request below needs your 4-digit PIN before your child can be confirmed.
            </p>
          </div>
        </div>
      )}

      <h2 className="font-display text-xl">Needs your approval</h2>

      {loading ? (
        <div className="grid gap-3">{[0,1].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="card-soft p-10 text-center animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary mx-auto mb-3 flex items-center justify-center">
            <Check className="h-7 w-7" />
          </div>
          <p className="font-display text-xl mb-1">All caught up</p>
          <p className="text-sm text-muted-foreground">No pending requests right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(
            items.reduce<Record<string, PendingItem[]>>((acc, it) => {
              (acc[it.helper_name] ||= []).push(it);
              return acc;
            }, {})
          ).map(([helperName, group]) => (
            <section key={helperName} className="space-y-2 animate-fade-up">
              <div className="flex items-center gap-2 px-1">
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center font-display text-xs">
                  {helperName[0]}
                </div>
                <p className="text-sm font-medium">{helperName}</p>
                <span className="text-xs text-muted-foreground">· {group.length} pending</span>
              </div>
              <div className="space-y-2">
                {group.map((it, i) => {
                  const Icon = it.kind === "link" ? UserPlus : (it.job_category ? categoryIcon(it.job_category) : Briefcase);
                  return (
                    <button
                      key={`${it.kind}-${it.helper_id}-${it.job_id ?? "x"}-${i}`}
                      onClick={() => { setActive(it); setPin(""); }}
                      className="card-soft card-soft-hover p-5 w-full text-left flex items-start gap-4 transition-transform active:scale-[0.99]"
                    >
                      <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          {it.kind === "link" ? "New helper link" : (it.job_category ? categoryLabel(it.job_category) : "Job")}
                        </p>
                        <p className="font-semibold leading-snug">
                          {it.kind === "link"
                            ? `${it.helper_name} wants to link to you.`
                            : `Approval for: ${it.job_description}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(it.requested_at).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* PIN modal */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="bg-card rounded-3xl p-7 max-w-md w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl mb-1">
              {active.kind === "link" ? "Confirm link" : "Approve job"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {active.kind === "link"
                ? `Link to ${active.helper_name}? Enter your 4-digit PIN.`
                : `Approve "${active.job_description}" for ${active.helper_name}? Enter your 4-digit PIN.`}
            </p>

            <div className="flex justify-center mb-6">
              <InputOTP maxLength={4} value={pin} onChange={setPin} autoFocus>
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-14 text-2xl font-display rounded-xl" />
                  <InputOTPSlot index={1} className="h-14 w-14 text-2xl font-display" />
                  <InputOTPSlot index={2} className="h-14 w-14 text-2xl font-display" />
                  <InputOTPSlot index={3} className="h-14 w-14 text-2xl font-display rounded-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl flex-1" onClick={() => setActive(null)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={busy || pin.length !== 4} className="rounded-xl flex-1 tap-target">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (active.kind === "link" ? "Confirm" : "Approve")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
