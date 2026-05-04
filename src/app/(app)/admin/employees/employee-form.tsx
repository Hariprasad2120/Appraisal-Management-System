import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Manager = { id: string; name: string };

export type BasicDefaults = {
  email?: string;
  name?: string;
  role?: string;
  department?: string | null;
  joiningDate?: Date | string | null;
  active?: boolean;
  employeeNumber?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  location?: string | null;
  fatherName?: string | null;
  designation?: string | null;
  zohoRole?: string | null;
  employmentType?: string | null;
  employeeStatus?: string | null;
  sourceOfHire?: string | null;
  reportingManagerId?: string | null;
  dob?: Date | string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  workPhone?: string | null;
  personalPhone?: string | null;
  personalEmail?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
  aadhaar?: string | null;
  pan?: string | null;
  uan?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  accountType?: string | null;
  stateCode?: string | null;
};

function iso(v?: Date | string | null): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toISOString().slice(0, 10);
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

export function BasicForm({
  action,
  defaults,
  managers,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaults: BasicDefaults;
  managers: Manager[];
  submitLabel: string;
}) {
  const roles = ["ADMIN", "MANAGEMENT", "MANAGER", "HR", "TL", "EMPLOYEE", "REVIEWER", "PARTNER"];
  return (
    <form action={action} className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Identity</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Employee Number" name="employeeNumber" type="number" defaultValue={defaults.employeeNumber ?? ""} />
          <Field label="First Name" name="firstName" defaultValue={defaults.firstName ?? ""} />
          <Field label="Last Name" name="lastName" defaultValue={defaults.lastName ?? ""} />
          <Field label="Full Name" name="name" defaultValue={defaults.name ?? ""} required />
          <Field label="Email (login)" name="email" type="email" defaultValue={defaults.email ?? ""} required />
          <Field label="Personal Email" name="personalEmail" type="email" defaultValue={defaults.personalEmail ?? ""} />
          <Field label="Father Name" name="fatherName" defaultValue={defaults.fatherName ?? ""} />
          <Field label="DOB" name="dob" type="date" defaultValue={iso(defaults.dob)} />
          <div className="space-y-1">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              name="gender"
              defaultValue={defaults.gender ?? ""}
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            >
              <option value="">-</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <Field label="Marital Status" name="maritalStatus" defaultValue={defaults.maritalStatus ?? ""} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Employment</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="role">App Role</Label>
            <select
              id="role"
              name="role"
              defaultValue={defaults.role ?? "EMPLOYEE"}
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              required
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Field label="Department" name="department" defaultValue={defaults.department ?? ""} />
          <Field label="Designation" name="designation" defaultValue={defaults.designation ?? ""} />
          <Field label="Zoho Role" name="zohoRole" defaultValue={defaults.zohoRole ?? ""} />
          <Field label="Employment Type" name="employmentType" defaultValue={defaults.employmentType ?? ""} />
          <Field label="Employee Status" name="employeeStatus" defaultValue={defaults.employeeStatus ?? "Active"} />
          <Field label="Source of Hire" name="sourceOfHire" defaultValue={defaults.sourceOfHire ?? ""} />
          <Field label="Location" name="location" defaultValue={defaults.location ?? ""} />
          <Field label="Joining Date" name="joiningDate" type="date" defaultValue={iso(defaults.joiningDate)} required />
          <div className="space-y-1">
            <Label htmlFor="reportingManagerId">Reporting Manager</Label>
            <select
              id="reportingManagerId"
              name="reportingManagerId"
              defaultValue={defaults.reportingManagerId ?? ""}
              className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            >
              <option value="">-</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Label htmlFor="active" className="flex items-center gap-2">
              <input
                id="active"
                name="active"
                type="checkbox"
                defaultChecked={defaults.active ?? true}
              />
              Active
            </Label>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Contact</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Work Phone" name="workPhone" defaultValue={defaults.workPhone ?? ""} />
          <Field label="Personal Phone" name="personalPhone" defaultValue={defaults.personalPhone ?? ""} />
          <div />
          <div className="col-span-3 space-y-1">
            <Label htmlFor="presentAddress">Present Address</Label>
            <textarea
              id="presentAddress"
              name="presentAddress"
              defaultValue={defaults.presentAddress ?? ""}
              className="min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="col-span-3 space-y-1">
            <Label htmlFor="permanentAddress">Permanent Address</Label>
            <textarea
              id="permanentAddress"
              name="permanentAddress"
              defaultValue={defaults.permanentAddress ?? ""}
              className="min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Identifiers & Bank</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Aadhaar" name="aadhaar" defaultValue={defaults.aadhaar ?? ""} />
          <Field label="PAN" name="pan" defaultValue={defaults.pan ?? ""} />
          <Field label="UAN" name="uan" defaultValue={defaults.uan ?? ""} />
          <Field label="Bank Name" name="bankName" defaultValue={defaults.bankName ?? ""} />
          <Field label="Account Number" name="bankAccount" defaultValue={defaults.bankAccount ?? ""} />
          <Field label="IFSC" name="ifsc" defaultValue={defaults.ifsc ?? ""} />
          <Field label="Account Type" name="accountType" defaultValue={defaults.accountType ?? "Savings"} />
          <Field label="State Code" name="stateCode" defaultValue={defaults.stateCode ?? ""} />
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

export type SalaryDefaults = {
  grossAnnum?: number | string | null;
  ctcAnnum?: number | string | null;
  basic?: number | string | null;
  hra?: number | string | null;
  conveyance?: number | string | null;
  transport?: number | string | null;
  travelling?: number | string | null;
  fixedAllowance?: number | string | null;
  stipend?: number | string | null;
};

function num(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "0";
  return String(v);
}

export function SalaryForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaults: SalaryDefaults;
  submitLabel: string;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Gross (per annum)" name="grossAnnum" type="number" defaultValue={num(defaults.grossAnnum)} />
        <Field label="CTC (per annum)" name="ctcAnnum" type="number" defaultValue={num(defaults.ctcAnnum)} />
        <Field label="Basic" name="basic" type="number" defaultValue={num(defaults.basic)} />
        <Field label="HRA" name="hra" type="number" defaultValue={num(defaults.hra)} />
        <Field label="Conveyance" name="conveyance" type="number" defaultValue={num(defaults.conveyance)} />
        <Field label="Transport" name="transport" type="number" defaultValue={num(defaults.transport)} />
        <Field label="Travelling" name="travelling" type="number" defaultValue={num(defaults.travelling)} />
        <Field label="Fixed Allowance" name="fixedAllowance" type="number" defaultValue={num(defaults.fixedAllowance)} />
        <Field label="Stipend" name="stipend" type="number" defaultValue={num(defaults.stipend)} />
      </div>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
