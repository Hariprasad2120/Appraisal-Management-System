import { AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  ATTENDANCE_MODULE_KEY,
  CRM_MODULE_KEY,
  HUMAN_RESOURCE_MODULE_KEY,
} from "@/lib/module-catalog";
import { APPRAISAL_DISABLED_MESSAGE } from "@/lib/tenant";
import { APPRAISAL_MODULE_KEY } from "@/lib/workspace-navigation";

const MODULE_COPY: Record<string, { title: string; description: string }> = {
  [APPRAISAL_MODULE_KEY]: {
    title: "Appraisal Module Not Enabled",
    description: APPRAISAL_DISABLED_MESSAGE,
  },
  [ATTENDANCE_MODULE_KEY]: {
    title: "Attendance Module Not Enabled",
    description:
      "Attendance Management is not enabled for this organization yet.",
  },
  [HUMAN_RESOURCE_MODULE_KEY]: {
    title: "Human Resource Module Not Enabled",
    description:
      "Human Resource Management is not enabled for this organization yet.",
  },
  [CRM_MODULE_KEY]: {
    title: "CRM Module Not Enabled",
    description:
      "Customer Relationship Management is not enabled for this organization yet.",
  },
};

export default async function ModuleDisabledPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const session = await auth();
  const organizationName = session?.user.organizationName ?? "this organization";
  const { module } = await searchParams;
  const copy = MODULE_COPY[module ?? APPRAISAL_MODULE_KEY] ?? MODULE_COPY[APPRAISAL_MODULE_KEY];

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
          <AlertTriangle className="size-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {copy.description}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Current organization: {organizationName}
        </p>
      </section>
    </main>
  );
}
