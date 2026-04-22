import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, MapPin, ShieldCheck, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Profile() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isUnder18, setIsUnder18] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== "helper") return;
    supabase.from("helper_profiles").select("is_under_18, guardian_name, guardian_email").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setIsUnder18(!!data.is_under_18);
        setGuardianName(data.guardian_name ?? "");
        setGuardianEmail(data.guardian_email ?? "");
      });
  }, [user, profile]);

  const saveGuardian = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("helper_profiles")
      .update({ guardian_name: guardianName.trim(), guardian_email: guardianEmail.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Guardian details saved.");
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
          <Field label="Neighbourhood" value={profile?.neighbourhood ?? "—"} icon={<MapPin className="h-3.5 w-3.5" />} />
        </div>

        <Button
          variant="outline" className="rounded-xl mt-6 tap-target"
          onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      {isUnder18 && (
        <div className="card-soft p-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl">Guardian on file</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            We'll email this guardian when you express interest in a job. You can update their details anytime.
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gn" className="mb-1.5 block">Guardian's name</Label>
              <Input id="gn" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="h-12 rounded-xl bg-card" />
            </div>
            <div>
              <Label htmlFor="ge" className="mb-1.5 block">Guardian's email</Label>
              <Input id="ge" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} className="h-12 rounded-xl bg-card" />
            </div>
            <Button onClick={saveGuardian} disabled={saving} className="rounded-xl tap-target">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </Button>
          </div>
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
