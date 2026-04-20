import { Sprout, Snowflake, Leaf, ShoppingBag, Car, Flower2, Dog, Sparkles, type LucideIcon } from "lucide-react";

export type CategoryKey =
  | "lawn_care"
  | "snow_removal"
  | "leaf_raking"
  | "errands"
  | "car_washing"
  | "gardening"
  | "pet_care"
  | "other";

export const CATEGORIES: { key: CategoryKey; label: string; icon: LucideIcon; tint: string }[] = [
  { key: "lawn_care",    label: "Lawn care",    icon: Sprout,     tint: "bg-primary-soft text-primary" },
  { key: "snow_removal", label: "Snow removal", icon: Snowflake,  tint: "bg-[hsl(200_50%_92%)] text-[hsl(205_50%_30%)]" },
  { key: "leaf_raking",  label: "Leaf raking",  icon: Leaf,       tint: "bg-accent-soft text-accent-foreground" },
  { key: "errands",      label: "Errands",      icon: ShoppingBag,tint: "bg-[hsl(20_60%_92%)] text-[hsl(20_50%_30%)]" },
  { key: "car_washing",  label: "Car washing",  icon: Car,        tint: "bg-[hsl(210_40%_92%)] text-[hsl(215_40%_30%)]" },
  { key: "gardening",    label: "Gardening",    icon: Flower2,    tint: "bg-primary-soft text-primary" },
  { key: "pet_care",     label: "Pet care",     icon: Dog,        tint: "bg-[hsl(280_30%_92%)] text-[hsl(280_30%_30%)]" },
  { key: "other",        label: "Something else", icon: Sparkles, tint: "bg-muted text-muted-foreground" },
];

export const categoryLabel = (k: CategoryKey) => CATEGORIES.find((c) => c.key === k)?.label ?? k;
export const categoryIcon  = (k: CategoryKey) => CATEGORIES.find((c) => c.key === k)?.icon ?? Sparkles;
