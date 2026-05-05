import * as XLSX from "xlsx";
import { mkdirSync } from "fs";
import { dirname } from "path";

const output = process.argv[2] ?? "docs/appraisal-import-template.xlsx";

type SheetSpec = {
  name: string;
  headers: string[];
  sample?: Record<string, string | number>;
};

const sheets: SheetSpec[] = [
  {
    name: "Users",
    headers: [
      "employee_id",
      "full_name",
      "official_email",
      "personal_email",
      "phone_number",
      "department",
      "designation",
      "role",
      "reporting_manager_email",
      "reviewer_email",
      "management_email",
      "partner_email",
      "date_of_joining",
      "employment_type",
      "status",
    ],
  },
  {
    name: "Login Access",
    headers: [
      "employee_id",
      "official_email",
      "role",
      "account_status",
      "google_login_allowed",
      "initial_password_required",
      "passkey_required",
      "force_passkey_setup",
    ],
  },
  {
    name: "Salary Details",
    headers: [
      "employee_id",
      "gross_annum",
      "ctc_annum",
      "basic",
      "hra",
      "conveyance",
      "transport",
      "travelling",
      "fixed_allowance",
      "stipend",
    ],
  },
  {
    name: "Salary Revisions",
    headers: [
      "employee_id",
      "status",
      "gross_annum",
      "ctc_annum",
      "revised_ctc",
      "is_ctc_changed_by_perc",
      "revision_percentage",
      "effective_from",
      "payout_month",
      "basic",
      "hra",
      "conveyance",
      "transport",
      "travelling",
      "fixed_allowance",
      "stipend",
    ],
  },
  {
    name: "Eligibility",
    headers: [
      "employee_id",
      "appraisal_type",
      "cycle_name",
      "cycle_start_date",
      "self_assessment_deadline",
      "reviewer_deadline",
      "management_review_deadline",
      "meeting_date",
      "cycle_status",
    ],
  },
  {
    name: "Reviewer Assignment",
    headers: [
      "employee_id",
      "reviewer_email",
      "reviewer_type",
      "reviewer_deadline",
      "status",
    ],
  },
  {
    name: "Criteria Questions",
    headers: [
      "criteria_id",
      "category",
      "question_text",
      "max_rating",
      "role_applicable",
      "is_active",
    ],
  },
  {
    name: "Increment Slabs",
    headers: [
      "label",
      "grade",
      "min_rating",
      "max_rating",
      "salary_tier",
      "hike_percent",
    ],
  },
  {
    name: "Arrear Data",
    headers: [
      "employee_id",
      "cycle_name",
      "arrear_days",
      "daily_rate",
      "arrear_amount",
      "period_from",
      "period_to",
      "payout_month",
      "arrear_status",
    ],
  },
  {
    name: "Reporting Structure",
    headers: [
      "employee_id",
      "reporting_manager_email",
      "primary_reviewer_email",
      "secondary_reviewer_email",
      "final_reviewer_email",
      "management_email",
      "partner_email",
    ],
  },
  {
    name: "Allowed Values",
    headers: ["field", "allowed_values", "notes"],
    sample: {
      field: "role",
      allowed_values: "ADMIN, HR, EMPLOYEE, REVIEWER, MANAGER, MANAGEMENT, PARTNER",
      notes: "Emails are imported lowercase.",
    },
  },
];

function emptyRows(headers: string[], count = 100) {
  return Array.from({ length: count }, () =>
    Object.fromEntries(headers.map((header) => [header, ""])),
  );
}

function buildAllowedValuesRows() {
  return [
    {
      field: "role",
      allowed_values: "ADMIN, HR, EMPLOYEE, REVIEWER, MANAGER, MANAGEMENT, PARTNER",
      notes: "Use uppercase values exactly.",
    },
    {
      field: "account_status",
      allowed_values: "Pending, Active, Disabled",
      notes: "Only Active users can login.",
    },
    {
      field: "yes_no_fields",
      allowed_values: "Yes, No",
      notes: "Used for google_login_allowed, passkey_required, force_passkey_setup, is_active.",
    },
    {
      field: "salary_revision_status",
      allowed_values: "Approved, Pending, Rejected",
      notes: "Matches salary revision workflow.",
    },
    {
      field: "appraisal_type",
      allowed_values: "INTERIM, ANNUAL, SPECIAL",
      notes: "These match the current app database enum.",
    },
    {
      field: "cycle_status",
      allowed_values: "PENDING_SELF, SELF_SUBMITTED, AWAITING_AVAILABILITY, RATING_IN_PROGRESS, RATINGS_COMPLETE, MANAGEMENT_REVIEW, DATE_VOTING, SCHEDULED, DECIDED, CLOSED",
      notes: "Usually leave active workflow statuses for the system to manage.",
    },
    {
      field: "reviewer_type",
      allowed_values: "HR, TL, MANAGER",
      notes: "Current reviewer roles in database.",
    },
    {
      field: "assignment_status",
      allowed_values: "Pending, Submitted, Reviewed",
      notes: "Used as import guidance.",
    },
    {
      field: "salary_tier",
      allowed_values: "ALL, UPTO_15K, BTW_15K_30K, ABOVE_30K",
      notes: "Used by increment slabs.",
    },
    {
      field: "arrear_status",
      allowed_values: "PENDING_APPROVAL, APPROVED, REJECTED, PAID",
      notes: "Usually generated by the system after MOM.",
    },
    {
      field: "date_format",
      allowed_values: "YYYY-MM-DD",
      notes: "Example: 2026-05-04.",
    },
  ];
}

function addSheet(wb: XLSX.WorkBook, spec: SheetSpec) {
  const rows = spec.name === "Allowed Values"
    ? buildAllowedValuesRows()
    : emptyRows(spec.headers);
  const ws = XLSX.utils.json_to_sheet(rows, { header: spec.headers });
  ws["!cols"] = spec.headers.map((header) => ({
    wch: Math.max(16, Math.min(36, header.length + 4)),
  }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, spec.name);
}

mkdirSync(dirname(output), { recursive: true });
const wb = XLSX.utils.book_new();
for (const spec of sheets) addSheet(wb, spec);
XLSX.writeFile(wb, output);
console.log(`Created ${output}`);
