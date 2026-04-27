import { Link } from "react-router-dom";
import { Sprout, Heart, Shield, Sun, ArrowRight, Snowflake, Leaf, ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="container flex items-center justify-between py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" className="rounded-xl">Sign in</Button></Link>
          <Link to="/auth?mode=signup"><Button className="rounded-xl">Get started</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-10 md:pt-20 pb-16 md:pb-24 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-foreground mb-6">
            <Heart className="h-3.5 w-3.5" /> Built for neighbours, by neighbours
          </span>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] mb-5">
            A little help from <span className="text-primary">your block</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
            Giggle connects local students with seniors and busy families who could use a hand —
            mowing the lawn, shovelling the drive, picking up groceries.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/auth?mode=signup&role=homeowner">
              <Button size="lg" className="rounded-xl tap-target text-base w-full sm:w-auto">
                I need a hand <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth?mode=signup&role=helper">
              <Button size="lg" variant="outline" className="rounded-xl tap-target text-base w-full sm:w-auto bg-card">
                I want to earn
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero illustration — pure CSS bulletin-board card stack, no AI image */}
        <div className="relative aspect-[5/4] hidden md:block">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary-soft via-accent-soft to-secondary" />
          <div className="absolute top-8 left-8 w-56 card-soft p-5 rotate-[-4deg]">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <Sprout className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Lawn care</span>
            </div>
            <p className="text-sm font-semibold leading-snug">Mow the front yard — Maple Street</p>
            <p className="text-xs text-muted-foreground mt-1">$25 · this Saturday</p>
          </div>
          <div className="absolute top-20 right-6 w-56 card-soft p-5 rotate-[3deg]">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-[hsl(200_50%_92%)] text-[hsl(205_50%_30%)] flex items-center justify-center">
                <Snowflake className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Snow shovelling</span>
            </div>
            <p className="text-sm font-semibold leading-snug">Driveway after the storm</p>
            <p className="text-xs text-muted-foreground mt-1">$30 · tomorrow morning</p>
          </div>
          <div className="absolute bottom-8 left-16 w-60 card-soft p-5 rotate-[2deg]">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-9 w-9 rounded-xl bg-accent-soft text-accent-foreground flex items-center justify-center">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Errands</span>
            </div>
            <p className="text-sm font-semibold leading-snug">Pick up groceries from Loblaws</p>
            <p className="text-xs text-muted-foreground mt-1">$15 · Friday afternoon</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-display text-3xl md:text-4xl mb-3">How Giggle works</h2>
          <p className="text-muted-foreground text-lg">Simple, friendly, and built around trust.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Sun, title: "Post what you need", body: "Describe the task in plain words and pick a day. Takes about a minute." },
            { icon: Heart, title: "Match with a neighbour", body: "Local students nearby express interest. Pick the one that feels right." },
            { icon: Check, title: "Job done, neighbours happier", body: "Mark the job complete. Both of you leave a friendly review." },
          ].map((s) => (
            <div key={s.title} className="card-soft card-soft-hover p-6 md:p-7">
              <div className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl mb-2">{s.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="container py-16 md:py-20">
        <div className="card-soft p-8 md:p-12 bg-gradient-to-br from-primary-soft/60 to-accent-soft/60">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-medium mb-5">
                <Shield className="h-3.5 w-3.5 text-primary" /> Safe by design
              </span>
              <h2 className="font-display text-3xl md:text-4xl mb-4">Your trust is everything.</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Real names. Real schools. Reviews from real neighbours. Because we're not building a marketplace —
                we're rebuilding a community.
              </p>
            </div>
            <ul className="space-y-3">
              {["School verification on every Helper", "Visible review history before you book", "Friendly profiles, real first names"].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-base">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-24 text-center">
        <Leaf className="h-10 w-10 mx-auto text-primary mb-4" />
        <h2 className="font-display text-3xl md:text-5xl mb-5">Ready to meet your block?</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">Join Giggle today and find a friendly hand close to home.</p>
        <Link to="/auth?mode=signup">
          <Button size="lg" className="rounded-xl tap-target text-base">
            Create your account <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <footer className="container py-10 border-t border-border text-sm text-muted-foreground flex items-center justify-between">
        <span>© {new Date().getFullYear()} Giggle</span>
        <span>Made with care, for neighbours.</span>
      </footer>
    </div>
  );
}
