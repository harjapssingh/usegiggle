import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createJob } from "@/lib/localApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CATEGORIES, type CategoryKey } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function PostJob() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [budget, setBudget] = useState("25");
  const [submitting, setSubmitting] = useState(false);

  const steps = ["category", "describe", "when", "budget", "review"] as const;
  const current = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => (step === 0 ? navigate(-1) : setStep((s) => s - 1));

  const canContinue = () => {
    switch (current) {
      case "category": return !!category;
      case "describe": return description.trim().length >= 8;
      case "when": return !!date;
      case "budget": return Number(budget) >= 5;
      default: return true;
    }
  };

  const submit = async () => {
    if (!category) return;
    setSubmitting(true);
    createJob(profile, {
      category,
      description: description.trim(),
      scheduled_date: date,
      scheduled_time_window: timeWindow || null,
      budget: Number(budget),
    });
    toast.success("Job posted! Neighbours nearby will see it.");
    navigate("/app", { replace: true });
    setSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={back} className="flex items-center gap-2 text-sm font-medium mb-5">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-8">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div key={current} className="animate-fade-up">
        {current === "category" && (
          <>
            <h1 className="font-display text-3xl mb-2">What do you need help with?</h1>
            <p className="text-muted-foreground mb-8">Pick a category to get started.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.key;
                return (
                  <button
                    key={c.key} type="button" onClick={() => setCategory(c.key)}
                    className={cn(
                      "card-soft p-4 text-left transition-all tap-target",
                      active ? "ring-2 ring-primary border-primary" : "card-soft-hover"
                    )}
                  >
                    <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center mb-2", c.tint)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-medium">{c.label}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {current === "describe" && (
          <>
            <h1 className="font-display text-3xl mb-2">Describe the job</h1>
            <p className="text-muted-foreground mb-6">A few sentences is plenty. Mention anything important.</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="e.g. Mow the front and back lawn — about half an hour. Mower in the shed."
              className="min-h-[160px] text-base rounded-xl bg-card"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">{description.length} / 300</p>
          </>
        )}

        {current === "when" && (
          <>
            <h1 className="font-display text-3xl mb-2">When would you like it done?</h1>
            <p className="text-muted-foreground mb-6">Pick a date and a rough time window.</p>
            <div className="space-y-5">
              <div>
                <Label className="text-base">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-14 text-base rounded-xl bg-card mt-1.5" />
              </div>
              <div>
                <Label className="text-base">Time window <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} placeholder="e.g. Morning, 9am–12pm" className="h-14 text-base rounded-xl bg-card mt-1.5" />
              </div>
            </div>
          </>
        )}

        {current === "budget" && (
          <>
            <h1 className="font-display text-3xl mb-2">What's your budget?</h1>
            <p className="text-muted-foreground mb-6">Most small jobs fall between $15 and $40.</p>
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl">$</span>
              <Input type="number" min={5} value={budget} onChange={(e) => setBudget(e.target.value)} className="h-14 text-2xl font-display rounded-xl bg-card max-w-[180px]" />
            </div>
          </>
        )}

        {current === "review" && (
          <>
            <h1 className="font-display text-3xl mb-2">Looks good?</h1>
            <p className="text-muted-foreground mb-6">Review and post your job.</p>
            <div className="card-soft p-6 space-y-4">
              <Row label="Category" value={CATEGORIES.find((c) => c.key === category)?.label ?? ""} />
              <Row label="Description" value={description} />
              <Row label="When" value={`${new Date(date).toLocaleDateString()}${timeWindow ? ` · ${timeWindow}` : ""}`} />
              <Row label="Budget" value={`$${budget}`} />
              <Row label="Neighbourhood" value={profile?.neighbourhood ?? "—"} />
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 md:mx-0 mt-8 bg-background/90 backdrop-blur border-t border-border md:border-0 md:bg-transparent px-5 py-4 md:py-6 flex justify-end">
        <Button
          onClick={step === steps.length - 1 ? submit : next}
          disabled={!canContinue() || submitting}
          size="lg" className="rounded-xl tap-target text-base min-w-[180px]"
        >
          {step === steps.length - 1 ? (
            submitting ? "Posting…" : <>Post job <Check className="h-4 w-4" /></>
          ) : (
            <>Continue <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
      <span className="text-sm text-muted-foreground sm:w-32 shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
