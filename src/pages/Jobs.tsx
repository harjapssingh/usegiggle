import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, Sparkles, ShieldCheck, ShieldAlert } from "lucide-react";
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
  status?: string;
}

type ApprovalState = "approved" | "pending" | "none";

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [isUnder18, setIsUnder18] = useState(false);
  const [approvals, setApprovals] = useState<Record<string, ApprovalState>>({});

  useEffect(() => {
    const fetch = async () => {
      // Explicit columns — PIN fields are not selectable from the table; assigned helper retrieves via RPC.
      const JOB_COLS = "id, category, description, budget, status, neighbourhood, scheduled_date, scheduled_time_window, homeowner_id, helper_id, created_at";
      const [{ data: jobsData }, { data: myInt }, { data: assigned }, { data: hp }] = await Promise.all([
        supabase.from("jobs").select(JOB_COLS).eq("status", "open").order("created_at", { ascending: false }),
        user ? supabase.from("job_interests").select("job_id").eq("helper_id", user.id) : Promise.resolve({ data: [] as any[] }),
        user ? supabase.from("jobs").select(JOB_COLS).eq("helper_id", user.id) : Promise.resolve({ data: [] as any[] }),
        user ? supabase.from("helper_profiles").select("is_under_18").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null as any }),
      ]);
      const interestIds = new Set<string>((myInt ?? []).map((r: { job_id: string }) => r.job_id));
      setInterested(interestIds);
      setIsUnder18(!!hp?.is_under_18);

      // Build "my jobs" = interested jobs (any status) + assigned jobs, deduped
      const map = new Map<string, Job>();
      (assigned as Job[] ?? []).forEach((j) => map.set(j.id, j));
      if (interestIds.size && user) {
        const { data: ij } = await supabase.from("jobs").select(JOB_COLS).in("id", Array.from(interestIds));
        (ij as Job[] ?? []).forEach((j) => map.set(j.id, j));
      }
      const mine = Array.from(map.values());
      setMyJobs(mine);

      // For under-18 helpers, fetch approval state for each "my job"
      if (user && hp?.is_under_18 && mine.length) {
        const { data: appr } = await supabase
          .from("job_helper_approvals")
          .select("job_id, approved")
          .eq("helper_id", user.id)
          .in("job_id", mine.map((j) => j.id));
        const byId: Record<string, ApprovalState> = {};
        mine.forEach((j) => { byId[j.id] = "none"; });
        (appr ?? []).forEach((r: any) => { byId[r.job_id] = r.approved ? "approved" : "pending"; });
        setApprovals(byId);
      }

      // Open feed: hide ones I've already shown interest in
      setJobs(((jobsData as Job[]) ?? []).filter((j) => !interestIds.has(j.id)));
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

    if (isUnder18) {
      const { error: rerr } = await supabase.rpc("request_job_approval", { _job_id: jobId });
      if (rerr) {
        if (/No confirmed guardian/i.test(rerr.message)) {
          toast.warning("Link a guardian from your Profile before they can approve jobs.");
        } else {
          toast.error(rerr.message);
        }
      } else {
        toast.info("Your guardian needs to approve this in their app.");
        setApprovals((a) => ({ ...a, [jobId]: "pending" }));
      }
    }
  };

  return (
    <div className="space-y-8">
      {myJobs.length > 0 && (
        <section>
          <h2 className="font-display text-2xl mb-1">Your jobs</h2>
          <p className="text-muted-foreground mb-4 text-sm">Jobs you've shown interest in or been confirmed for. Tap to chat & view PIN.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {myJobs.map((j) => {
              const Icon = categoryIcon(j.category);
              const appr = approvals[j.id];
              return (
                <Link key={j.id} to={`/app/jobs/${j.id}`} className="card-soft card-soft-hover p-5 flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{categoryLabel(j.category)}</p>
                    <p className="font-semibold leading-snug line-clamp-2">{j.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <p className="text-xs text-muted-foreground capitalize">Status: {(j as any).status?.replace("_", " ") ?? "open"}</p>
                      {isUnder18 && appr === "pending" && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                          <ShieldAlert className="h-3 w-3" /> Awaiting guardian
                        </span>
                      )}
                      {isUnder18 && appr === "approved" && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary-soft text-primary">
                          <ShieldCheck className="h-3 w-3" /> Guardian approved
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-display text-lg text-primary">${Number(j.budget).toFixed(0)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section>
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
      </section>
    </div>
  );
}
