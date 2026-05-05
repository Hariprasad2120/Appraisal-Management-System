"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type DepartmentOption = {
  id: string;
  label: string;
};

export function TemplateDepartmentPicker({
  departments,
  selectedDepartmentId,
}: {
  departments: DepartmentOption[];
  selectedDepartmentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">Department or division</span>
      <select
        value={selectedDepartmentId}
        disabled={pending}
        onChange={(event) => {
          const params = new URLSearchParams(window.location.search);
          params.set("tab", "templates");
          params.set("departmentId", event.target.value);
          startTransition(() => {
            router.replace(`/admin/kpi?${params.toString()}`, { scroll: false });
          });
        }}
        className="h-9 min-w-[280px] rounded-md border border-border bg-background px-3 text-sm disabled:opacity-60"
      >
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.label}
          </option>
        ))}
      </select>
    </label>
  );
}
