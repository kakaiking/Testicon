import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { BrandWordmark } from "@/components/BrandMark";
import { HeroTips } from "@/components/HeroTips";
import { PhoneBooth } from "@/components/PhoneBooth";

const raidSteps = [
  { label: "INVITE", title: "Get on the list", body: "Admins shortlist testers. No public signup — if you’re here, you’re in." },
  { label: "ENTER", title: "Open the booth", body: "Accept terms, launch the app in a secure in-app browser, keep Back and Report always handy." },
  { label: "HIT", title: "Log what breaks", body: "Stamp severity, attach a screenshot, get paid when the hit is approved." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 nav:px-8 py-4 nav:py-5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-flex">
          <BrandWordmark size={26} />
        </Link>
        <div className="flex gap-2">
          <Link href="/login" className="btn-secondary text-sm py-2 px-3 nav:px-4">
            Sign in
          </Link>
          <Link href="/admin/login" className="btn-primary text-sm py-2 px-3 nav:px-4 hidden nav:inline-flex">
            Admin
          </Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="text-left">
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--accent)] mb-4">
            INVITE-ONLY TESTING
          </p>
          <h1 className="font-heading text-4xl nav:text-6xl font-extrabold leading-[1.05] tracking-tight mb-4">
            Break it.
            <br />
            <span className="text-[var(--accent)]">Get paid.</span>
          </h1>
          <HeroTips />
          <div className="flex flex-col nav:flex-row gap-3">
            <Link
              href="/login"
              className="btn-primary inline-flex items-center justify-center gap-2 text-base px-6 py-3"
            >
              I&apos;m a Tester <ArrowRight size={18} />
            </Link>
            <Link
              href="/admin/login"
              className="btn-secondary inline-flex items-center justify-center gap-2 text-base px-6 py-3"
            >
              <Shield size={18} /> Admin Console
            </Link>
          </div>
        </div>

        <PhoneBooth />
      </section>

      <section className="landing-below" aria-labelledby="raid-heading">
        <h2 id="raid-heading" className="font-heading text-xl font-bold mb-2 tracking-tight">
          How a raid works
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-2">
          Three steps from invite to payout — same shape every time.
        </p>
        {raidSteps.map((step) => (
          <div key={step.label} className="landing-step">
            <span className="landing-step-label">{step.label}</span>
            <div>
              <h3 className="font-heading font-semibold text-[var(--text-main)]">{step.title}</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">{step.body}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
