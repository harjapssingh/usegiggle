import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Heart, HandHeart, Sprout } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Role = "helper" | "homeowner";

export default function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, profile, profileChecked, refreshProfile } = useAuth();

  // If they already have a profile, never show onboarding again.
  useEffect(() => {
    if (profileChecked && profile) navigate("/app", { replace: true });
  }, [profile, profileChecked, navigate]);

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>((params.get("role") as Role) || null);
  const [fullName, setFullName] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");

  // Helper-only
  const [age, setAge] = useState<string>("");
  const [school, setSchool] = useState("");
  const [bio, setBio] = useState("");
  const [categories, setCategories] = useState<CategoryKey[]>([]);
  const [hourlyRate, setHourlyRate] = useState<string>("20");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");

  // Homeowner-only
  const [ageRange, setAgeRange] = useState<string>("");
  const [accessNotes, setAccessNotes] = useState("");

  const isUnder18 = role === "helper" && Number(age) > 0 && Number(age) < 18;

  const steps = useMemo(() => {
    if (!role) return ["role"];
    const base = ["role", "name", "neighbourhood"];
    if (role === "homeowner") return [...base, "ageRange", "access"];
    const helperSteps = [...base, "age", "school"];
    if (isUnder18) helperSteps.push("guardian");
    return [...helperSteps, "categories", "rate", "bio"];
  }, [role, isUnder18]);

  const progress = ((step + 1) / steps.length) * 100;
  const current = steps[step];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const toggleCategory = (k: CategoryKey) =>
    setCategories((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));

  const canContinue = () => {
    switch (current) {
      case "role": return !!role;
      case "name": return fullName.trim().length >= 2;
      case "neighbourhood": return neighbourhood.trim().length >= 2;
      case "age": return Number(age) >= 14 && Number(age) <= 24;
      case "school": return school.trim().length >= 2;
      case "guardian": return guardianName.trim().length >= 2 && /\S+@\S+\.\S+/.test(guardianEmail);
      case "categories": return categories.length > 0;
      case "rate": return Number(hourlyRate) >= 5;
      case "bio": return true;
      case "ageRange": return !!ageRange;
      case "access": return true;
      default: return true;
    }
  };

  const handleFinish = async () => {
    if (!user || !role) return;
    try {
      const { error: pErr } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: fullName.trim(),
        role,
        neighbourhood: neighbourhood.trim() || null,
      });
      if (pErr) throw pErr;

      if (role === "helper") {
        const ageNum = Number(age);
        const { error } = await supabase.from("helper_profiles").insert({
          id: user.id,
          age: ageNum,
          school_name: school.trim(),
          bio: bio.trim() || null,
          categories,
          hourly_rate: Number(hourlyRate),
          rate_type: "hourly",
          is_under_18: ageNum < 18,
          is_active: true,
          guardian_name: ageNum < 18 ? guardianName.trim() : null,
          guardian_email: ageNum < 18 ? guardianEmail.trim() : null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homeowner_profiles").insert({
          id: user.id,
          age_range: ageRange || null,
          accessibility_notes: accessNotes.trim() || null,
        });
        if (error) throw error;
      }

      await refreshProfile();
      toast.success("You're all set! Welcome to Giggle 🌱");
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't save profile");
    }
  };

  const onPrimary = () => (step < steps.length - 1 ? next() : handleFinish());

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="container py-5 flex items-center justify-between">
        <button onClick={back} disabled={step === 0} className="flex items-center gap-2 text-sm font-medium disabled:opacity-30">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
            <Sprout className="h-4 w-4" />
          </div>
          <span className="font-display text-xl">Giggle</span>
        </div>
        <div className="w-16 text-right text-xs text-muted-foreground">{step + 1} / {steps.length}</div>
      </header>

      <div className="container max-w-2xl">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <main className="flex-1 container max-w-2xl py-10 md:py-16">
        <div key={current} className="animate-fade-up">
          {current === "role" && (
            <Step title="Welcome to Giggle 👋" subtitle="First — what brings you here?">
              <div className="grid sm:grid-cols-2 gap-4">
                <RoleCard
                  icon={Heart}
                  title="I need a hand"
                  desc="I'm looking for help around the house."
                  selected={role === "homeowner"}
                  onClick={() => setRole("homeowner")}
                />
                <RoleCard
                  icon={HandHeart}
                  title="I want to help"
                  desc="I'm a student aged 14–24 looking to earn."
                  selected={role === "helper"}
                  onClick={() => setRole("helper")}
                />
              </div>
            </Step>
          )}

          {current === "name" && (
            <Step title="What's your first name?" subtitle="This is what neighbours will see.">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Sam Patel" className="h-14 text-lg rounded-xl bg-card" autoFocus />
            </Step>
          )}

          {current === "neighbourhood" && (
            <Step title="Which neighbourhood?" subtitle="We'll match you with people close by.">
              <Input value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} placeholder="e.g. Riverdale, Toronto" className="h-14 text-lg rounded-xl bg-card" autoFocus />
            </Step>
          )}

          {current === "age" && (
            <Step title="How old are you?" subtitle="Helpers must be 14–24. We'll add a guardian step if you're under 18.">
              <Input type="number" min={14} max={24} value={age} onChange={(e) => setAge(e.target.value)} className="h-14 text-lg rounded-xl bg-card" autoFocus />
            </Step>
          )}

          {current === "school" && (
            <Step title="Which school do you go to?" subtitle="We'll verify and add a 'School Verified' badge to your profile.">
              <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="e.g. Riverdale Collegiate" className="h-14 text-lg rounded-xl bg-card" autoFocus />
            </Step>
          )}

          {current === "categories" && (
            <Step title="What can you help with?" subtitle="Pick everything you'd be happy to do.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((c) => {
                  const active = categories.includes(c.key);
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.key} onClick={() => toggleCategory(c.key)} type="button"
                      className={cn(
                        "card-soft p-4 text-left transition-all",
                        active ? "ring-2 ring-primary border-primary" : "card-soft-hover"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-2", c.tint)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-sm">{c.label}</p>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {current === "rate" && (
            <Step title="What's your hourly rate?" subtitle="Most Helpers charge $15–$30 / hour.">
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl">$</span>
                <Input type="number" min={5} value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className="h-14 text-2xl font-display rounded-xl bg-card max-w-[160px]" />
                <span className="text-muted-foreground">/ hour</span>
              </div>
            </Step>
          )}

          {current === "bio" && (
            <Step title="Tell your neighbours a bit about yourself" subtitle="Optional — but a friendly bio helps people pick you.">
              <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} placeholder="Hi! I'm in grade 11 and love being outside…" className="min-h-[120px] text-base rounded-xl bg-card" />
              <p className="text-xs text-muted-foreground mt-2 text-right">{bio.length} / 150</p>
            </Step>
          )}

          {current === "ageRange" && (
            <Step title="Which best describes you?" subtitle="So Helpers can give you the right kind of care.">
              <div className="grid gap-3">
                {[
                  { v: "35-55", label: "Busy parent (35–55)" },
                  { v: "55-70", label: "Active senior (55–70)" },
                  { v: "70+",   label: "Senior (70+)" },
                  { v: "other", label: "Prefer not to say" },
                ].map((o) => (
                  <button
                    key={o.v} type="button" onClick={() => setAgeRange(o.v)}
                    className={cn(
                      "card-soft p-5 text-left text-base font-medium tap-target",
                      ageRange === o.v ? "ring-2 ring-primary border-primary" : "card-soft-hover"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Step>
          )}

          {current === "access" && (
            <Step title="Anything Helpers should know?" subtitle="Optional. Things like 'please knock loudly' or 'I have stairs at the front'.">
              <Textarea value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} placeholder="e.g. Please ring the bell twice — I'm a bit hard of hearing." className="min-h-[120px] text-base rounded-xl bg-card" />
            </Step>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border">
        <div className="container max-w-2xl py-4 flex justify-end">
          <Button onClick={onPrimary} disabled={!canContinue()} size="lg" className="rounded-xl tap-target text-base min-w-[160px]">
            {step === steps.length - 1 ? (<>Finish <Check className="h-4 w-4" /></>) : (<>Continue <ArrowRight className="h-4 w-4" /></>)}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl mb-2">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-lg mb-8">{subtitle}</p>}
      <div>{children}</div>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, selected, onClick }: any) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "card-soft p-6 text-left transition-all tap-target",
        selected ? "ring-2 ring-primary border-primary" : "card-soft-hover"
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-xl mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </button>
  );
}
