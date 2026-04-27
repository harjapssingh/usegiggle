import logo from "@/assets/giggle-logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

/**
 * Giggle brand mark — hammer-i logo (deep teal on cream).
 * The PNG is transparent-friendly via `mix-blend-multiply` so the cream square
 * blends into our cream background without a visible bounding box.
 */
export function Logo({ className, showWordmark = true, wordmarkClassName }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logo}
        alt="Giggle logo"
        className={cn(
          "h-9 w-9 object-contain mix-blend-multiply select-none",
          className,
        )}
        draggable={false}
      />
      {showWordmark && (
        <span className={cn("font-display text-2xl tracking-tight text-foreground", wordmarkClassName)}>
          Giggle
        </span>
      )}
    </div>
  );
}
