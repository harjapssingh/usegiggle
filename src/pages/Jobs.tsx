import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { categoryIcon, categoryLabel, type CategoryKey } from "@/lib/categories";
import { toast } from "sonner";

interface Job {
  id: string;
  category: CategoryKey;
  description: string;
  budget: number;
  neighbourhood: string | null;
  scheduled_date: string | null;
  scheduled_time_window: string | null;
  homeowner_id: string;
}

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [interested, setInterested] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetch = async () => {
      const [{ data: jobsData }, { data: myInt }] = await Promise.all([
        supabase.from("jobs").select("*").eq("status", "open").order("created_at", { ascending: false }),
        user ? supabase.from("job_interests").select("job_id").eq("helper_id", user.id) : Promise.resolve({ data: [] as any[] }),
      ]);
      setJobs((jobsData as Job[]) ?? []);
      setInterested(new Set((myInt ?? []).map((r: any) => r.job_id)));
      setLoading(false);
    };
    fetch();
  }, [user]);

  const expressInterest = async (jobId: string) => {
    if (!user) return;
    const { error } = await supabase.from("job_interests").insert({ job_id: jobId, helper_id: user.id });
    if (error) { toast.error(error.message); return; }
    setInterested((s) => new Set([...s, jobId]));
    toast.success("Interest sent! The homeowner will see it.");

    // If under 18, trigger guardian approval
    const { data: hp } = await supabase.from("helper_profiles").select("is_under_18, guardian_email").eq("id", user.id).maybeSingle();
    if (hp?.is_under_18 && hp.guardian_email) {
      const { data } = await supabase.functions.invoke("request-guardian-approval", {
        body: { job_id: jobId, app_origin: window.location.origin },
      });
      if (data?.emailSent) toast.info(`Guardian email sent to ${data.guardianEmail}.`);
      else if (data?.approveUrl) toast.info("Open the job to share the guardian link.");
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl mb-1">Open jobs</h1>
      <p className="text-muted-foreground mb-6">Tap "I'm interested" — the homeowner will pick from interested helpers.</p>

      {loading ? (
        <div className="grid gap-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="card-soft p-10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary-soft text-primary mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="font-display text-xl mb-2">No open jobs right now</h3>
          <p className="text-muted-foreground">Check back soon — new ones appear all the time.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {jobs.map((j) => {
            const Icon = categoryIcon(j.category);
            const already = interested.has(j.id);
            return (
              <div key={j.id} className="card-soft card-soft-hover p-5 flex flex-col">
                <Link to={`/app/jobs/${j.id}`} className="flex items-start gap-3 mb-3">
                  <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">{categoryLabel(j.category)}</p>
                    <p className="font-semibold leading-snug">{j.description}</p>
                  </div>
                  <span className="font-display text-xl text-primary">${Number(j.budget).toFixed(0)}</span>
                </Link>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
                  {j.neighbourhood && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{j.neighbourhood}</span>}
                  {j.scheduled_date && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(j.scheduled_date).toLocaleDateString()}{j.scheduled_time_window ? ` · ${j.scheduled_time_window}` : ""}</span>}
                </div>
                <Button
                  onClick={() => expressInterest(j.id)} disabled={already}
                  className="rounded-xl tap-target mt-auto"
                  variant={already ? "secondary" : "default"}
                >
                  {already ? "Interest sent ✓" : "I'm interested"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
