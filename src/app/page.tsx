import Link from "next/link";
import { ArrowRight, FlaskConical, Shield, CircleAlert, Wallet } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 nav:px-8 py-4 nav:py-6 flex flex-col nav:flex-row nav:items-center nav:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl nav:text-3xl">🧪</span>
          <span className="font-heading text-xl nav:text-2xl font-bold">Testicon</span>
        </div>
        <div className="flex flex-col nav:flex-row gap-2 nav:gap-3 w-full nav:w-auto">
          <Link href="/login" className="btn-secondary text-center">Tester Sign In</Link>
          <Link href="/admin/login" className="btn-primary text-center">Admin Portal</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 nav:px-6 text-center">
        <div className="max-w-3xl">
          <h1 className="font-heading text-3xl nav:text-5xl font-extrabold mb-4 nav:mb-6 leading-tight">
            Test smarter.<br />
            <span className="text-[var(--accent)]">Reward better.</span>
          </h1>
          <p className="text-base nav:text-lg text-[var(--text-muted)] mb-8 nav:mb-10 max-w-xl mx-auto">
            Testicon lets your team invite selected testers, launch internal apps in a secure shell,
            collect structured bug reports, and pay rewards by severity.
          </p>
          <div className="flex flex-col nav:flex-row gap-3 nav:gap-4 justify-center">
            <Link href="/login" className="btn-primary inline-flex items-center justify-center gap-2 text-base nav:text-lg px-6 nav:px-8 py-3">
              I&apos;m a Tester <ArrowRight size={18} />
            </Link>
            <Link href="/admin/login" className="btn-secondary inline-flex items-center justify-center gap-2 text-base nav:text-lg px-6 nav:px-8 py-3">
              <Shield size={18} /> Admin Console
            </Link>
          </div>
        </div>

        <div className="grid nav:grid-cols-2 gap-4 nav:gap-6 mt-12 nav:mt-20 max-w-5xl w-full">
          {[
            { icon: FlaskConical, title: "App Testing", desc: "Launch apps in iframes with back & report controls" },
            { icon: Shield, title: "NDA & Terms", desc: "Per-app agreements before testers access apps" },
            { icon: CircleAlert, title: "Issue Reports", desc: "Structured issues synced to Internal-App" },
            { icon: Wallet, title: "Rewards", desc: "Pay testers by issue severity, withdraw when approved" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-4 nav:p-6 text-left">
              <Icon className="text-[var(--accent)] mb-3" size={24} />
              <h3 className="font-heading font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
