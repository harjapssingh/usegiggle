import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, MapPin, ShieldCheck, Save, Copy, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Profile() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  // Helper-side
  const [isUnder18, setIsUnder18] = useState(false);
  const [linkedGuardianName, setLinkedGuardianName] = useState<string | null>(null);
  const [linkConfirmed, setLinkConfirmed] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [requesting, setRequesting] = useState(false);

  // Guardian-side
  const [guardianCode, setGuardianCode] = useState<string | null>(null);
  const [linkedHelpers, setLinkedHelpers] = useState<Array<{ helper_id: string; full_name: string; confirmed: boolean }>>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;

      if (profile?.role === "helper") {
        const { data: hp } = await supabase
          .from("helper_profiles")
          .select("is_under_18")
          .eq("id", user.id)
          .maybeSingle();
        setIsUnder18(!!hp?.is_under_18);

        if (hp?.is_under_18) {
          // Find linked guardian (if any) — uses guardian_helpers RLS (helper can see own row)
          const { data: links } = await supabase
            .from("guardian_helpers")
            .select("guardian_id, confirmed")
            .eq("helper_id", user.id)
            .maybeSingle();
          if (links) {
            setLinkConfirmed(links.confirmed);
            const { data: gp } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", links.guardian_id)
              .maybeSingle();
            setLinkedGuardianName(gp?.full_name ?? null);
          }
        }
      }

      if (profile?.role === "guardian") {
        const { data: gp } = await supabase
          .from("guardian_profiles")
          .select("link_code")
          .eq("id", user.id)
          .maybeSingle();
        setGuardianCode(gp?.link_code ?? null);

        const { data: links } = await supabase
          .from("guardian_helpers")
          .select("helper_id, confirmed")
          .eq("guardian_id", user.id);
        if (links?.length) {
          const ids = links.map((l) => l.helper_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          setLinkedHelpers(
            links.map((l) => ({
              helper_id: l.helper_id,
              full_name: profs?.find((p) => p.id === l.helper_id)?.full_name ?? "Helper",
              confirmed: l.confirmed,
            }))
          );
        }
      }
    })();
  }, [user, profile]);

  const requestNewLink = async () => {
    if (!newCode.trim()) return;
    setRequesting(true);
    const { error } = await supabase.rpc("request_guardian_link", { _code: newCode.trim() });
    setRequesting(false);
    if (error) return toast.error(error.message);
    setNewCode("");
    toast.success("Request sent. Ask your guardian to confirm it from their app.");
  };

  const copyCode = () => {
    if (!guardianCode) return;
    navigator.clipboard.writeText(guardianCode);
    toast.success("Code copied!");
  };

  return (
    <div className="max-w-xl space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl md:text-4xl">Your profile</h1>

      <div className="card-soft p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-display text-2xl">
            {profile?.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl">{profile?.full_name}</h2>
            <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <Field label="Email" value={user?.email ?? "—"} />
          {profile?.role !== "guardian" && (
            <Field label="Neighbourhood" value={profile?.neighbourhood ?? "—"} icon={<MapPin className="h-3.5 w-3.5" />} />
          )}
        </div>

        <Button
          variant="outline" className="rounded-xl mt-6 tap-target"
          onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {/* HELPER under 18: guardian link status */}
      {profile?.role === "helper" && isUnder18 && (
        <div className="card-soft p-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl">Guardian link</h2>
          </div>

          {linkedGuardianName && linkConfirmed ? (
            <p className="text-sm text-muted-foreground">
              Linked to <span className="font-semibold text-foreground">{linkedGuardianName}</span>. They'll approve your jobs.
            </p>
          ) : linkedGuardianName ? (
            <p className="text-sm text-muted-foreground">
              Waiting for <span className="font-semibold text-foreground">{linkedGuardianName}</span> to confirm the link from their account.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              You're not linked to a guardian yet. Ask your parent or guardian to create a Giggle guardian account, then enter their 8-character code below.
            </p>
          )}

          <div className="space-y-3 mt-4">
            <div>
              <Label htmlFor="gcode" className="mb-1.5 block">Guardian link code</Label>
              <Input
                id="gcode" value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7P2QR9X"
                className="h-12 rounded-xl bg-card font-mono tracking-widest uppercase"
              />
            </div>
            <Button onClick={requestNewLink} disabled={requesting || newCode.length < 4} className="rounded-xl tap-target">
              <Link2 className="h-4 w-4" /> {requesting ? "Sending…" : "Request link"}
            </Button>
          </div>
        </div>
      )}

      {/* GUARDIAN: share code & see linked helpers */}
      {profile?.role === "guardian" && (
        <div className="card-soft p-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl">Your link code</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Share this code with your child. They'll enter it in their Giggle account so requests come to you.
          </p>
          {guardianCode && (
            <div className="bg-card rounded-2xl p-5 flex items-center justify-between gap-3 mb-6">
              <p className="font-display text-2xl tracking-[0.3em] text-primary">{guardianCode}</p>
              <Button variant="outline" size="sm" onClick={copyCode} className="rounded-xl">
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          )}

          <h3 className="font-display text-lg mb-2">Linked helpers</h3>
          {linkedHelpers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one's linked to you yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {linkedHelpers.map((h) => (
                <li key={h.helper_id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-medium">{h.full_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    h.confirmed ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {h.confirmed ? "Confirmed" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium inline-flex items-center gap-1.5">{icon}{value}</span>
    </div>
  );
}
