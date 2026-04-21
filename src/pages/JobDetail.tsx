import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Check, Lock, ShieldCheck, AlertCircle, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryIcon, categoryLabel, type CategoryKey } from "@/lib/categories";
import { Chat } from "@/components/Chat";
import { toast } from "sonner";

interface Job {
  id: string;
  category: CategoryKey;
  description: string;
  budget: number;
  status: string;
  neighbourhood: string | null;
  scheduled_date: string | null;
  scheduled_time_window: string | null;
  homeowner_id: string;
  helper_id: string | null;
  start_pin: string | null;
  completion_pin: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface InterestedHelper {
  interest_id: string;
  helper_id: string;
  message: string | null;
  full_name: string;
  avatar_url: string | null;
  age: number | null;
  school_name: string | null;
  bio: string | null;
  hourly_rate: number | null;
  per_job_rate: number | null;
  rate_type: string | null;
  is_under_18: boolean;
  guardian_approved_for_job: boolean;
}

export default function JobDetail() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [interested, setInterested] = useState<InterestedHelper[]>([]);
  const [helperProfile, setHelperProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [guardianStatus, setGuardianStatus] = useState<{ approved: boolean; approveUrl?: string } | null>(null);

  const isHomeowner = !!user && job?.homeowner_id === user.id;
  const isAssignedHelper = !!user && job?.helper_id === user.id;

  const load = useCallback(async () => {
    if (!id) return;
    const { data: jobData } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (!jobData) { setLoading(false); return; }
    setJob(jobData as Job);

    if (jobData.helper_id) {
      const { data: hp } = await supabase.from("profiles").select("full_name").eq("id", jobData.helper_id).maybeSingle();
      setHelperProfile(hp as any);
    }

    // Load interested helpers (only homeowner sees, RLS enforces)
    if (user && jobData.homeowner_id === user.id) {
      const { data: rows } = await supabase
        .from("job_interests")
        .select("id, helper_id, message")
        .eq("job_id", id);

      if (rows && rows.length) {
        const helperIds = rows.map((r) => r.helper_id);
        const [{ data: profs }, { data: hps }, { data: approvals }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url").in("id", helperIds),
          supabase.from("helper_profiles").select("id, age, school_name, bio, hourly_rate, per_job_rate, rate_type, is_under_18").in("id", helperIds),
          supabase.from("job_guardian_approvals").select("helper_id, approved").eq("job_id", id).in("helper_id", helperIds),
        ]);
        const merged: InterestedHelper[] = rows.map((r) => {
          const p = profs?.find((x: any) => x.id === r.helper_id) ?? {};
          const hp = hps?.find((x: any) => x.id === r.helper_id) ?? {};
          const ga = approvals?.find((x: any) => x.helper_id === r.helper_id);
          return {
            interest_id: r.id,
            helper_id: r.helper_id,
            message: r.message,
            full_name: (p as any).full_name ?? "Helper",
            avatar_url: (p as any).avatar_url ?? null,
            age: (hp as any).age ?? null,
            school_name: (hp as any).school_name ?? null,
            bio: (hp as any).bio ?? null,
            hourly_rate: (hp as any).hourly_rate ?? null,
            per_job_rate: (hp as any).per_job_rate ?? null,
            rate_type: (hp as any).rate_type ?? null,
            is_under_18: (hp as any).is_under_18 ?? false,
            guardian_approved_for_job: !!ga?.approved,
          };
        });
        setInterested(merged);
      } else {
        setInterested([]);
      }
    }

    // Helper viewing: load guardian status for this job
    if (user && profile?.role === "helper") {
      const { data: ga } = await supabase
        .from("job_guardian_approvals")
        .select("approved")
        .eq("job_id", id).eq("helper_id", user.id)
        .maybeSingle();
      if (ga) setGuardianStatus({ approved: ga.approved });
    }

    setLoading(false);
  }, [id, user, profile]);

  useEffect(() => { load(); }, [load]);

  // Realtime: refresh when job changes (status / pins)
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`job-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs", filter: `id=eq.${id}` }, (payload) => {
        setJob((prev) => (prev ? { ...prev, ...(payload.new as Job) } : (payload.new as Job)));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  const confirmHelper = async (helperId: string) => {
    if (!job) return;
    setBusy(true);
    const { data: pinStart } = await supabase.rpc("generate_pin");
    const { data: pinEnd } = await supabase.rpc("generate_pin");
    const { error } = await supabase.from("jobs").update({
      helper_id: helperId,
      status: "matched",
      start_pin: (pinStart as unknown as string) ?? `${Math.floor(1000 + Math.random()*9000)}`,
      completion_pin: (pinEnd as unknown as string) ?? `${Math.floor(1000 + Math.random()*9000)}`,
    }).eq("id", job.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Helper confirmed! Share the start PIN when they arrive.");
    load();
  };

  const submitPin = async () => {
    if (!job || pinInput.length !== 4) return;
    setBusy(true);
    if (job.status === "matched") {
      // start
      if (pinInput !== job.start_pin) { toast.error("That PIN doesn't match."); setBusy(false); return; }
      const { error } = await supabase.from("jobs").update({ status: "in_progress", started_at: new Date().toISOString() }).eq("id", job.id);
      if (error) toast.error(error.message); else { toast.success("Job started!"); setPinInput(""); }
    } else if (job.status === "in_progress") {
      if (pinInput !== job.completion_pin) { toast.error("That PIN doesn't match."); setBusy(false); return; }
      const { error } = await supabase.from("jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
      if (error) toast.error(error.message); else { toast.success("Job complete! 🎉"); setPinInput(""); }
    }
    setBusy(false);
  };

  const requestGuardian = async () => {
    if (!job) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("request-guardian-approval", {
      body: { job_id: job.id, app_origin: window.location.origin },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setGuardianStatus({ approved: false, approveUrl: data?.approveUrl });
    if (data?.emailSent) toast.success(`Approval email sent to ${data.guardianEmail}`);
    else toast.info("Share the approval link with your guardian.");
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-48 rounded-2xl" /></div>;
  if (!job) return <div className="card-soft p-10 text-center">Job not found.</div>;

  const Icon = categoryIcon(job.category);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Job summary */}
      <div className="card-soft p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">{categoryLabel(job.category)}</p>
            <h1 className="font-display text-2xl mb-2">{job.description}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {job.neighbourhood && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.neighbourhood}</span>}
              {job.scheduled_date && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(job.scheduled_date).toLocaleDateString()}{job.scheduled_time_window ? ` · ${job.scheduled_time_window}` : ""}</span>}
              <span className="font-semibold text-foreground">${Number(job.budget).toFixed(0)}</span>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium bg-primary-soft text-primary capitalize`}>{job.status.replace("_", " ")}</span>
        </div>
      </div>

      {/* HELPER VIEW: guardian status */}
      {!isHomeowner && profile?.role === "helper" && (
        <HelperGuardianBlock
          guardianStatus={guardianStatus}
          onRequest={requestGuardian}
          busy={busy}
        />
      )}

      {/* HOMEOWNER: interested helpers */}
      {isHomeowner && job.status === "open" && (
        <div>
          <h2 className="font-display text-xl mb-3">Interested helpers ({interested.length})</h2>
          {interested.length === 0 ? (
            <div className="card-soft p-8 text-center text-muted-foreground">
              <p>No one's expressed interest yet. Hang tight — neighbours will see your job.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interested.map((h) => (
                <div key={h.interest_id} className="card-soft p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0 font-display text-lg">
                      {h.full_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{h.full_name}</p>
                        {h.age && <span className="text-xs text-muted-foreground">· age {h.age}</span>}
                        {h.is_under_18 && (
                          h.guardian_approved_for_job
                            ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary-soft text-primary"><ShieldCheck className="h-3 w-3" /> Guardian approved</span>
                            : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"><AlertCircle className="h-3 w-3" /> Awaiting guardian</span>
                        )}
                      </div>
                      {h.school_name && <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5"><GraduationCap className="h-3 w-3" /> {h.school_name}</p>}
                      {h.bio && <p className="text-sm mt-2">{h.bio}</p>}
                      {h.message && <p className="text-sm mt-2 italic text-muted-foreground">"{h.message}"</p>}
                      <div className="flex items-center justify-between mt-3 gap-3">
                        <p className="text-sm font-medium">
                          {h.rate_type === "per_job" && h.per_job_rate ? `$${h.per_job_rate} / job` :
                           h.hourly_rate ? `$${h.hourly_rate} / hr` : "Rate not set"}
                        </p>
                        <Button
                          onClick={() => confirmHelper(h.helper_id)}
                          disabled={busy || (h.is_under_18 && !h.guardian_approved_for_job)}
                          className="rounded-xl"
                          size="sm"
                        >
                          {h.is_under_18 && !h.guardian_approved_for_job ? "Awaiting guardian" : "Confirm"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PIN block — once matched */}
      {job.helper_id && (job.status === "matched" || job.status === "in_progress") && (
        <PinBlock
          job={job}
          isHomeowner={isHomeowner}
          isHelper={isAssignedHelper}
          pinInput={pinInput}
          setPinInput={setPinInput}
          submitPin={submitPin}
          busy={busy}
        />
      )}

      {job.status === "completed" && (
        <div className="card-soft p-6 text-center bg-primary-soft/40">
          <Check className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="font-display text-xl">Job complete</p>
          <p className="text-sm text-muted-foreground">Thanks for helping out!</p>
        </div>
      )}

      {/* Chat — visible to homeowner + assigned helper, also to interested helpers */}
      {(isHomeowner || isAssignedHelper || profile?.role === "helper") && (
        <Chat
          jobId={job.id}
          otherName={isHomeowner ? (helperProfile?.full_name ?? "your helper") : "the homeowner"}
        />
      )}
    </div>
  );
}

function PinBlock({ job, isHomeowner, isHelper, pinInput, setPinInput, submitPin, busy }: {
  job: Job;
  isHomeowner: boolean;
  isHelper: boolean;
  pinInput: string;
  setPinInput: (v: string) => void;
  submitPin: () => void;
  busy: boolean;
}) {
  const phase = job.status === "matched" ? "start" : "complete";
  const pinForPhase = phase === "start" ? job.start_pin : job.completion_pin;

  return (
    <div className="card-soft p-6 bg-accent-soft/30">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl">{phase === "start" ? "Start PIN" : "Completion PIN"}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {phase === "start"
          ? "When the helper arrives, share this PIN so they can mark the job as started."
          : "When the work's done, share this PIN so the helper can mark the job complete."}
      </p>

      {isHomeowner && pinForPhase && (
        <div className="bg-card rounded-2xl p-6 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Your PIN</p>
          <p className="font-display text-5xl tracking-[0.5em] pl-[0.5em]">{pinForPhase}</p>
        </div>
      )}

      {isHelper && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <InputOTP maxLength={4} value={pinInput} onChange={setPinInput}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button onClick={submitPin} disabled={busy || pinInput.length !== 4} className="w-full rounded-xl tap-target">
            {phase === "start" ? "Start job" : "Mark complete"}
          </Button>
        </div>
      )}
    </div>
  );
}

function HelperGuardianBlock({ guardianStatus, onRequest, busy }: {
  guardianStatus: { approved: boolean; approveUrl?: string } | null;
  onRequest: () => void;
  busy: boolean;
}) {
  if (!guardianStatus) {
    return (
      <div className="card-soft p-5 bg-accent-soft/30">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Guardian approval needed</p>
            <p className="text-sm text-muted-foreground mb-3">Since you're under 18, we'll send your guardian a quick approval link before the homeowner sees your interest.</p>
            <Button onClick={onRequest} disabled={busy} className="rounded-xl" size="sm">Request guardian approval</Button>
          </div>
        </div>
      </div>
    );
  }
  if (guardianStatus.approved) {
    return (
      <div className="card-soft p-4 bg-primary-soft/40 flex items-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-primary" /> Guardian has approved you for this job.
      </div>
    );
  }
  return (
    <div className="card-soft p-5 bg-muted/40">
      <p className="font-medium mb-1">Waiting on guardian approval</p>
      {guardianStatus.approveUrl && (
        <>
          <p className="text-sm text-muted-foreground mb-2">Share this link with your guardian if they didn't get the email:</p>
          <code className="block text-xs bg-card p-2 rounded-lg break-all">{guardianStatus.approveUrl}</code>
        </>
      )}
    </div>
  );
}
