import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MapPin, Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { saveProfile } from "@/lib/localApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Profile() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? "Neighbour");
  const [neighbourhood, setNeighbourhood] = useState(profile?.neighbourhood ?? "Local neighbourhood");

  const save = async () => {
    if (!profile && !user) return;
    saveProfile({
      id: profile?.id ?? user!.id,
      full_name: fullName.trim() || "Neighbour",
      role: profile?.role ?? "helper",
      neighbourhood: neighbourhood.trim() || "Local neighbourhood",
      avatar_url: profile?.avatar_url ?? null,
      age: profile?.age ?? null,
      school_name: profile?.school_name ?? null,
      bio: profile?.bio ?? null,
      categories: profile?.categories ?? [],
      hourly_rate: profile?.hourly_rate ?? null,
      is_under_18: profile?.is_under_18 ?? false,
    });
    await refreshProfile();
    toast.success("Profile saved");
  };

  return (
    <div className="max-w-xl space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl md:text-4xl">Your profile</h1>

      <div className="card-soft p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-display text-2xl">
            {(fullName || "N")[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-xl">{fullName || "Neighbour"}</h2>
            <p className="text-sm text-muted-foreground capitalize">{profile?.role ?? "helper"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-base">Name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-card" />
          </div>
          <div>
            <Label htmlFor="hood" className="text-base inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Neighbourhood</Label>
            <Input id="hood" value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} className="mt-1.5 h-12 rounded-xl bg-card" />
          </div>
          <div className="text-sm border-t border-border pt-4">
            <Field label="Email" value={user?.email ?? "guest@giggle.local"} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <Button onClick={save} className="rounded-xl tap-target">
            <Save className="h-4 w-4" /> Save profile
          </Button>
          <Button
            variant="outline" className="rounded-xl tap-target"
            onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}