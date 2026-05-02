import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-4xl">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_400px] lg:items-center">
          <section className="hidden lg:block space-y-8">
            <div>
              <Image
                src="/api/logo"
                alt="Adarsh Shipping logo"
                width={430}
                height={143}
                className="h-auto w-[260px] object-contain opacity-90"
              />
            </div>

            <div className="space-y-3">
              <p className="ds-label text-primary">
                Appraisal Management Portal
              </p>
              <h1 className="ds-h1" style={{ fontSize: "32px", letterSpacing: "0.03em" }}>
                Performance.{" "}
                <span className="text-gradient-teal">Rewarded fairly.</span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
                Manage employee reviews, self-assessments, ratings, and appraisal
                workflows from one unified portal.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                { dot: "bg-[#00cec4]", label: "Self-assessments" },
                { dot: "bg-primary", label: "360 Reviews" },
                { dot: "bg-[#ffaa2d]", label: "Salary insights" },
                { dot: "bg-[#ff8333]", label: "Role-based access" },
              ].map((feature) => (
                <span
                  key={feature.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground text-sm"
                >
                  <span className={`size-1.5 rounded-full ${feature.dot} inline-block`} />
                  {feature.label}
                </span>
              ))}
            </div>

            <div
              className="h-px w-40 opacity-30"
              style={{ background: "linear-gradient(90deg, #0e8a95, transparent)" }}
            />
          </section>

          <section className="w-full">
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <Image
                src="/api/logo"
                alt="Adarsh Shipping logo"
                width={320}
                height={107}
                className="h-auto w-[180px] object-contain opacity-90"
              />
              <p className="mt-3 text-xs font-medium text-primary">
                Appraisal Portal
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
