import { FadeIn } from "@/components/motion-div";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumb";
import { createPolicyAction } from "../actions";
import { PolicyForm } from "../policy-form";

export default function NewPolicyPage() {
  return (
    <FadeIn>
      <div className="p-6 max-w-2xl space-y-6">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "HRMS", href: "/hrms" }, { label: "Policies", href: "/hrms/policies" }, { label: "New" }]} />
          <h1 className="text-2xl font-bold text-foreground">New Policy</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Policy Details</CardTitle>
          </CardHeader>
          <CardContent>
            <PolicyForm action={createPolicyAction} defaults={{ status: "DRAFT" }} submitLabel="Create Policy" />
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

