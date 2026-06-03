import type { CategoryKey } from "@/lib/categories";

export type Role = "helper" | "homeowner" | "guardian" | "admin";

export interface LocalUser {
  id: string;
  email: string;
}

export interface LocalProfile {
  id: string;
  full_name: string;
  role: Role;
  neighbourhood: string | null;
  avatar_url: string | null;
  age?: number | null;
  school_name?: string | null;
  bio?: string | null;
  categories?: CategoryKey[];
  hourly_rate?: number | null;
  is_under_18?: boolean;
}

export interface LocalJob {
  id: string;
  category: CategoryKey;
  description: string;
  budget: number;
  status: "open" | "matched" | "in_progress" | "completed" | "cancelled" | "disputed";
  neighbourhood: string | null;
  scheduled_date: string | null;
  scheduled_time_window: string | null;
  homeowner_id: string;
  helper_id: string | null;
  start_pin: string;
  completion_pin: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LocalMessage {
  id: string;
  job_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface LocalInterest {
  id: string;
  job_id: string;
  helper_id: string;
  message: string | null;
  created_at: string;
}

const USER_KEY = "giggle.local.user";
const PROFILES_KEY = "giggle.local.profiles";
const JOBS_KEY = "giggle.local.jobs";
const INTERESTS_KEY = "giggle.local.interests";
const MESSAGES_KEY = "giggle.local.messages";
export const LOCAL_CHANGE_EVENT = "giggle-local-change";

const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

const DEMO_HELPERS: LocalProfile[] = [
  {
    id: "helper-maya",
    full_name: "Maya Chen",
    role: "helper",
    neighbourhood: "Riverdale",
    avatar_url: null,
    age: 17,
    school_name: "Riverdale Collegiate",
    bio: "Friendly student who likes outdoor jobs and pet care.",
    categories: ["lawn_care", "pet_care", "errands"],
    hourly_rate: 18,
    is_under_18: false,
  },
  {
    id: "helper-jordan",
    full_name: "Jordan Lee",
    role: "helper",
    neighbourhood: "Leslieville",
    avatar_url: null,
    age: 19,
    school_name: "Eastview High",
    bio: "Quick, careful, and happy to help with errands or yard work.",
    categories: ["errands", "leaf_raking", "gardening"],
    hourly_rate: 20,
    is_under_18: false,
  },
];

const DEMO_JOBS: LocalJob[] = [
  {
    id: "job-lawn-demo",
    category: "lawn_care",
    description: "Mow the front lawn and tidy the edges by the walkway.",
    budget: 35,
    status: "open",
    neighbourhood: "Riverdale",
    scheduled_date: daysFromNow(2),
    scheduled_time_window: "Morning",
    homeowner_id: "homeowner-alex",
    helper_id: null,
    start_pin: "1234",
    completion_pin: "5678",
    started_at: null,
    completed_at: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "job-errands-demo",
    category: "errands",
    description: "Pick up a small grocery order and leave it at the porch.",
    budget: 22,
    status: "open",
    neighbourhood: "Leslieville",
    scheduled_date: daysFromNow(1),
    scheduled_time_window: "After school",
    homeowner_id: "homeowner-sam",
    helper_id: null,
    start_pin: "2468",
    completion_pin: "1357",
    started_at: null,
    completed_at: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = <T,>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const notify = () => window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));

const emailToId = (email: string) => `local-${email.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "guest"}`;

export const getCurrentUser = () => read<LocalUser | null>(USER_KEY, null);
export const getProfiles = () => [...DEMO_HELPERS, ...read<LocalProfile[]>(PROFILES_KEY, [])];
export const getCurrentProfile = () => {
  const user = getCurrentUser();
  return user ? getProfiles().find((p) => p.id === user.id) ?? null : null;
};

export const localSignIn = (email: string) => {
  const cleanEmail = email.trim().toLowerCase() || "guest@giggle.local";
  const user = { id: emailToId(cleanEmail), email: cleanEmail };
  write(USER_KEY, user);
  notify();
  return { user, profile: getProfiles().find((p) => p.id === user.id) ?? null };
};

export const localSignOut = () => {
  localStorage.removeItem(USER_KEY);
  notify();
};

export const saveProfile = (profile: LocalProfile) => {
  const profiles = read<LocalProfile[]>(PROFILES_KEY, []).filter((p) => p.id !== profile.id);
  write(PROFILES_KEY, [...profiles, profile]);
  notify();
  return profile;
};

export const getJobs = () => read<LocalJob[]>(JOBS_KEY, DEMO_JOBS);
const saveJobs = (jobs: LocalJob[]) => { write(JOBS_KEY, jobs); notify(); };
const getInterests = () => read<LocalInterest[]>(INTERESTS_KEY, []);
const saveInterests = (items: LocalInterest[]) => { write(INTERESTS_KEY, items); notify(); };

export const createJob = (profile: LocalProfile | null, input: Pick<LocalJob, "category" | "description" | "scheduled_date" | "scheduled_time_window" | "budget">) => {
  const user = getCurrentUser();
  const job: LocalJob = {
    id: id("job"),
    ...input,
    status: "open",
    neighbourhood: profile?.neighbourhood ?? "Local neighbourhood",
    homeowner_id: profile?.id ?? user?.id ?? "local-homeowner",
    helper_id: null,
    start_pin: String(Math.floor(1000 + Math.random() * 9000)),
    completion_pin: String(Math.floor(1000 + Math.random() * 9000)),
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
  };
  saveJobs([job, ...getJobs()]);
  return job;
};

export const getDashboardJobs = (profile: LocalProfile | null) => {
  const jobs = getJobs().sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
  if (profile?.role === "homeowner") {
    return { jobs: jobs.filter((j) => j.homeowner_id === profile.id), myActivity: [] as LocalJob[] };
  }
  const interests = new Set(getInterests().filter((i) => i.helper_id === profile?.id).map((i) => i.job_id));
  return {
    jobs: jobs.filter((j) => j.status === "open" && !interests.has(j.id)).slice(0, 10),
    myActivity: jobs.filter((j) => j.helper_id === profile?.id || interests.has(j.id)),
  };
};

export const getJobsPageData = (profile: LocalProfile | null) => {
  const jobs = getJobs();
  const interests = new Set(getInterests().filter((i) => i.helper_id === profile?.id).map((i) => i.job_id));
  return {
    openJobs: jobs.filter((j) => j.status === "open" && !interests.has(j.id)),
    myJobs: jobs.filter((j) => j.helper_id === profile?.id || interests.has(j.id)),
    interestedIds: interests,
  };
};

export const expressInterest = (jobId: string, profile: LocalProfile | null) => {
  if (!profile) return;
  const interests = getInterests();
  if (!interests.some((i) => i.job_id === jobId && i.helper_id === profile.id)) {
    saveInterests([...interests, { id: id("interest"), job_id: jobId, helper_id: profile.id, message: null, created_at: new Date().toISOString() }]);
  }
};

export const getJob = (jobId: string) => getJobs().find((j) => j.id === jobId) ?? null;

export const getInterestedHelpers = (jobId: string) => {
  const profiles = getProfiles();
  return getInterests()
    .filter((i) => i.job_id === jobId)
    .map((i) => ({ interest_id: i.id, message: i.message, ...(profiles.find((p) => p.id === i.helper_id) ?? DEMO_HELPERS[0]), helper_id: i.helper_id }));
};

export const assignHelper = (jobId: string, helperId: string) => {
  saveJobs(getJobs().map((j) => j.id === jobId ? { ...j, helper_id: helperId, status: "matched" as const } : j));
};

export const advanceJobWithPin = (jobId: string, phase: "start" | "complete") => {
  saveJobs(getJobs().map((j) => {
    if (j.id !== jobId) return j;
    return phase === "start"
      ? { ...j, status: "in_progress" as const, started_at: new Date().toISOString() }
      : { ...j, status: "completed" as const, completed_at: new Date().toISOString() };
  }));
};

export const getHelpers = () => {
  const current = getCurrentProfile();
  const localHelpers = getProfiles().filter((p) => p.role === "helper" && p.id !== current?.id);
  return localHelpers.length ? localHelpers : DEMO_HELPERS;
};

export const getMessages = (jobId: string) => read<LocalMessage[]>(MESSAGES_KEY, []).filter((m) => m.job_id === jobId);
export const sendMessage = (jobId: string, senderId: string, body: string) => {
  const messages = read<LocalMessage[]>(MESSAGES_KEY, []);
  write(MESSAGES_KEY, [...messages, { id: id("msg"), job_id: jobId, sender_id: senderId, body, created_at: new Date().toISOString() }]);
  notify();
};