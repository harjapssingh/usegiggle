import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, UserPlus, Briefcase, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { categoryIcon, categoryLabel, type CategoryKey } from "@/lib/categories";

interface PendingItem {
  kind: "link" | "job";
  helper_id: string;
  helper_name: string;
  job_id: string | null;
  job_description: string | null;
  job_category: CategoryKey | null;
  requested_at: string;
}

export default function GuardianHome() {
  const { profile } = useAuth();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems([]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-fade-up max-w-2xl">
      <div>
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="font-display text-3xl md:text-4xl">{profile?.full_name?.split(" ")[0]}</h1>
      </div>

      <div className="card-soft p-5 bg-primary-soft/30 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Basic guardian mode is on.</p>
          <p className="text-sm text-muted-foreground">No PINs or verification are required in this version.</p>
        </div>
      </div>

      <h2 className="font-display text-xl">Needs your approval</h2>

      {loading ? (
        <div className="grid gap-3">{[0,1].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="card-soft p-10 text-center animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-primary-soft text-primary mx-auto mb-3 flex items-center justify-center">
            <Check className="h-7 w-7" />
          </div>
          <p className="font-display text-xl mb-1">All caught up</p>
          <p className="text-sm text-muted-foreground">No pending requests right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(
            items.reduce<Record<string, PendingItem[]>>((acc, it) => {
              (acc[it.helper_name] ||= []).push(it);
              return acc;
            }, {})
          ).map(([helperName, group]) => (
            <section key={helperName} className="space-y-2 animate-fade-up">
              <div className="flex items-center gap-2 px-1">
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center font-display text-xs">
                  {helperName[0]}
                </div>
                <p className="text-sm font-medium">{helperName}</p>
                <span className="text-xs text-muted-foreground">· {group.length} pending</span>
              </div>
              <div className="space-y-2">
                {group.map((it, i) => {
                  const Icon = it.kind === "link" ? UserPlus : (it.job_category ? categoryIcon(it.job_category) : Briefcase);
                  return (
                      <div
                      key={`${it.kind}-${it.helper_id}-${it.job_id ?? "x"}-${i}`}
                      className="card-soft card-soft-hover p-5 w-full text-left flex items-start gap-4 transition-transform active:scale-[0.99]"
                    >
                      <div className="h-12 w-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          {it.kind === "link" ? "New helper link" : (it.job_category ? categoryLabel(it.job_category) : "Job")}
                        </p>
                        <p className="font-semibold leading-snug">
                          {it.kind === "link"
                            ? `${it.helper_name} wants to link to you.`
                            : `Approval for: ${it.job_description}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(it.requested_at).toLocaleString()}
                        </p>
                      </div>
                      </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

    </div>
  );
}
