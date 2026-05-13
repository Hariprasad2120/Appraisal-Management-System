import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-4xl">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_400px] lg:items-center">
          <section className="hidden lg:block space-y-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl">
                  <p className="text-3xl ds-h1" style={{ fontSize: "32px", letterSpacing: "0.03em" }}>ME</p>
                </span>
                <div>
                  <p className="ds-h1 text-foreground" style={{ fontSize: "32px", letterSpacing: "0.03em" }}>Monolith Engine</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="ds-label text-primary">
                Multi-organization workspace
              </p>
              <h1
                className="ds-h1 heading-icon-none"
                style={{ fontSize: "32px", letterSpacing: "0.03em" }}
              >
                Appraisals, KPI reviews, and team workflows in one{" "}
                <span className="text-gradient-teal">secure SaaS portal.</span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
                Sign in to manage organization-level reviews, employee performance,
                and operational follow-through without losing tenant separation.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                { dot: "bg-[#00cec4]", label: "Organization routing" },
                { dot: "bg-primary", label: "Appraisal workflows" },
                { dot: "bg-[#ffaa2d]", label: "KPI visibility" },
                { dot: "bg-[#ff8333]", label: "Role-based access" },
              ].map((feature) => (
                <span
                  key={feature.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground text-sm"
                >
                  <span
                    className={`size-1.5 rounded-full ${feature.dot} inline-block`}
                  />
                  {feature.label}
                </span>
              ))}
            </div>

            <div
              className="h-px w-40 opacity-30"
              style={{
                background: "linear-gradient(90deg, #0e8a95, transparent)",
              }}
            />
          </section>

          <section className="w-full">
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-6" />
              </span>
              <p className="mt-3 text-xs font-medium text-primary">
                Monolith Engine
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
