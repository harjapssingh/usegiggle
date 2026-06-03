import { useEffect, useState } from "react";
import { Star, BadgeCheck, MapPin } from "lucide-react";
import { LOCAL_CHANGE_EVENT, getHelpers } from "@/lib/localApp";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryLabel, type CategoryKey } from "@/lib/categories";

interface Helper {
  id: string;
  bio: string | null;
  school_verified: boolean;
  hourly_rate: number | null;
  categories: CategoryKey[];
  profiles?: { full_name: string; neighbourhood: string | null; avatar_url: string | null } | null;
}

export default function Helpers() {
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      setHelpers(getHelpers().map((h) => ({
        id: h.id,
        bio: h.bio ?? null,
        school_verified: true,
        hourly_rate: h.hourly_rate ?? null,
        categories: h.categories ?? [],
        profiles: { full_name: h.full_name, neighbourhood: h.neighbourhood, avatar_url: h.avatar_url },
      })) as Helper[]);
      setLoading(false);
    };
    load();
    window.addEventListener(LOCAL_CHANGE_EVENT, load);
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, load);
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl md:text-4xl mb-1">Helpers near you</h1>
      <p className="text-muted-foreground mb-6">Friendly local students ready to lend a hand.</p>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
      ) : helpers.length === 0 ? (
        <div className="card-soft p-10 text-center">
          <h3 className="font-display text-xl mb-2">No active helpers yet</h3>
          <p className="text-muted-foreground">Be the first to invite a student to your block!</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {helpers.map((h) => (
            <div key={h.id} className="card-soft card-soft-hover p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center font-display text-lg shrink-0">
                  {h.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold truncate">{h.profiles?.full_name ?? "Helper"}</h3>
                    {h.school_verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {h.profiles?.neighbourhood ?? "—"}
                  </p>
                </div>
                {h.hourly_rate && (
                  <div className="text-right shrink-0">
                    <p className="font-display text-lg leading-none">${Number(h.hourly_rate).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">/ hour</p>
                  </div>
                )}
              </div>
              {h.bio && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{h.bio}</p>}
              <div className="flex flex-wrap gap-1.5">
                {h.categories?.slice(0, 3).map((c) => (
                  <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary font-medium">
                    {categoryLabel(c)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
