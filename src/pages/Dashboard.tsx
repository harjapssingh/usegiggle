import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, MapPin, Clock, ArrowRight, Sparkles, MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryIcon, categoryLabel, type CategoryKey } from "@/lib/categories";

interface Job {
  id: string;
  category: CategoryKey;
  description: string;
  budget: number;
  status: string;
  neighbourhood: string | null;
  scheduled_date: string | null;
  created_at: string;
  homeowner_id: string;
}

const statusStyle: Record<string, string> = {
  open: "bg-accent-soft text-accent-foreground",
  matched: "bg-primary-soft text-primary",
  in_progress: "bg-[hsl(200_50%_92%)] text-[hsl(205_50%_30%)]",
  completed: "bg-secondary text-foreground",
  disputed: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default function Dashboard() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myActivity, setMyActivity] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const isHomeowner = profile?.role === "homeowner";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Explicit columns — PIN fields are not selectable from the table.
      const JOB_COLS = "id, category, description, budget, status, neighbourhood, scheduled_date, scheduled_time_window, homeowner_id, helper_id, created_at";
      if (isHomeowner) {
        const { data } = await supabase.from("jobs").select(JOB_COLS)
          .eq("homeowner_id", profile!.id)
          .order("created_at", { ascending: false }).limit(20);
        setJobs((data as Job[]) ?? []);
      } else {
        // Helper: open jobs feed + their own activity (interested or assigned)
        const [{ data: openJobs }, { data: interests }, { data: assigned }] = await Promise.all([
          supabase.from("jobs").select(JOB_COLS).eq("status", "open").order("created_at", { ascending: false }).limit(10),
          supabase.from("job_interests").select("job_id").eq("helper_id", profile!.id),
          supabase.from("jobs").select(JOB_COLS).eq("helper_id", profile!.id).order("created_at", { ascending: false }),
        ]);
        const interestIds = (interests ?? []).map((r: any) => r.job_id);
        let interestJobs: Job[] = [];
        if (interestIds.length) {
          const { data: ij } = await supabase.from("jobs").select(JOB_COLS).in("id", interestIds);
          interestJobs = (ij as Job[]) ?? [];
        }
        // Merge assigned + interested, dedupe by id
        const map = new Map<string, Job>();
        [...(assigned as Job[] ?? []), ...interestJobs].forEach((j) => map.set(j.id, j));
        setMyActivity(Array.from(map.values()).sort((a, b) => (b.created_at > a.created_at ? 1 : -1)));
        setJobs((openJobs as Job[]) ?? []);
      }
      setLoading(false);
    };
    if (profile) fetchData();
  }, [profile, isHomeowner]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="font-display text-3xl md:text-4xl">{profile?.full_name?.split(" ")[0]}</h1>
      </div>

      {/* Primary action */}
      {isHomeowner ? (
        <Link to="/app/post">
          <div className="card-soft card-soft-hover p-6 md:p-8 bg-gradient-to-br from-primary-soft/70 to-accent-soft/60 cursor-pointer">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary mb-1">Need a hand today?</p>
                <h2 className="font-display text-2xl md:text-3xl mb-1">Post a job</h2>
                <p className="text-muted-foreground">Tell us what you need — neighbours nearby will see it right away.</p>
              </div>
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <PlusCircle className="h-6 w-6" />
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <Link to="/app/jobs">
          <div className="card-soft card-soft-hover p-6 md:p-8 bg-gradient-to-br from-primary-soft/70 to-accent-soft/60 cursor-pointer">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary mb-1">Ready to earn?</p>
                <h2 className="font-display text-2xl md:text-3xl mb-1">Find jobs near you</h2>
                <p className="text-muted-foreground">Browse open jobs from neighbours in your area.</p>
              </div>
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Helper: my activity (interests + assigned) */}
      {!isHomeowner && !loading && myActivity.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">Your activity</h2>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Tap to chat & view PIN
            </span>
          </div>
          <div className="grid gap-3">
            {myActivity.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </div>
      )}

      {/* Jobs list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">{isHomeowner ? "Your jobs" : "Open jobs nearby"}</h2>
          {!isHomeowner && jobs.length > 0 && (
            <Link to="/app/jobs" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              See all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState isHomeowner={isHomeowner} />
        ) : (
          <div className="grid gap-3">
            {jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const Icon = categoryIcon(job.category);
  return (
    <Link to={`/app/jobs/${job.id}`} className="card-soft card-soft-hover p-5 flex items-start gap-4">
      <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-sm font-medium text-muted-foreground">{categoryLabel(job.category)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[job.status] ?? "bg-muted"}`}>
            {job.status.replace("_", " ")}
          </span>
        </div>
        <p className="font-medium leading-snug mb-2 line-clamp-2">{job.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {job.neighbourhood && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.neighbourhood}</span>}
          {job.scheduled_date && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(job.scheduled_date).toLocaleDateString()}</span>}
          <span className="font-semibold text-foreground">${Number(job.budget).toFixed(0)}</span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ isHomeowner }: { isHomeowner: boolean }) {
  return (
    <div className="card-soft p-10 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary-soft text-primary mx-auto mb-4 flex items-center justify-center">
        <Sparkles className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl mb-2">{isHomeowner ? "No jobs yet" : "Nothing open right now"}</h3>
      <p className="text-muted-foreground mb-5 max-w-sm mx-auto">
        {isHomeowner ? "Post your first job and watch your neighbourhood show up." : "Check back soon — new jobs appear all the time."}
      </p>
      {isHomeowner && (
        <Link to="/app/post"><Button className="rounded-xl tap-target">Post a job</Button></Link>
      )}
    </div>
  );
}
