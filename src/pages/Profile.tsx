import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl md:text-4xl mb-6">Your profile</h1>

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
