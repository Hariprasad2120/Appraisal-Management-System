import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center px-4 py-10">
      {/* Subtle ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-48 -left-48 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #0e8a95 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[380px] h-[380px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #ff8333 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/4 w-[440px] h-[360px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #00cec4 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="grid w-full gap-10 lg:grid-cols-[1fr_400px] lg:items-center">
          {/* Left — branding */}
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
              <h1 className="ds-h1" style={{ fontSize: "32px", letterSpacing: "-0.02em" }}>
                Performance.{" "}
                <span className="text-gradient-teal">Rewarded fairly.</span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
                Manage employee reviews, self-assessments, ratings, and appraisal
                workflows from one unified portal.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2.5">
              {[
                { dot: "bg-[#00cec4]", label: "Self-assessments" },
                { dot: "bg-primary", label: "360° Reviews" },
                { dot: "bg-[#ffaa2d]", label: "Salary insights" },
                { dot: "bg-[#ff8333]", label: "Role-based access" },
              ].map((f) => (
                <span
                  key={f.label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground text-sm"
                >
                  <span className={`size-1.5 rounded-full ${f.dot} inline-block`} />
                  {f.label}
                </span>
              ))}
            </div>

            <div
              className="h-px w-40 opacity-30"
              style={{ background: "linear-gradient(90deg, #0e8a95, transparent)" }}
            />
          </section>

          {/* Right — form */}
          <section className="w-full">
            {/* Mobile logo */}
            <div className="flex flex-col items-center mb-8 lg:hidden">
              <Image
                src="/api/logo"
                alt="Adarsh Shipping logo"
                width={320}
                height={107}
                className="h-auto w-[180px] object-contain opacity-90"
              />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
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
