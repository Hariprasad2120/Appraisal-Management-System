export const KPI_MONTHLY_TARGET_SETTING = "kpi.monthlyTarget";
export const KPI_ANNUAL_TARGET_SETTING = "kpi.annualTarget";
export const KPI_RATING_SCALE_SETTING = "kpi.ratingScale";

export const DEFAULT_KPI_MONTHLY_TARGET = 20000;
export const DEFAULT_KPI_ANNUAL_TARGET = 240000;
export const DEFAULT_KPI_RATING_SCALE: Record<number, number> = {
  5: 110,
  4: 100,
  3: 80,
  2: 60,
  1: 40,
};

export type KpiSeedItem = {
  name: string;
  weightage: number;
  measurement: string;
  target: string;
};

export type KpiSeedDepartment = {
  name: string;
  children?: { name: string; items: KpiSeedItem[] }[];
  items?: KpiSeedItem[];
};

export const KPI_BUSINESS_DEPARTMENTS = [
  "Accounts",
  "Administration",
  "Freight Forwarding",
  "Custom Clearance",
  "HR",
] as const;

export const LEGACY_KPI_DEPARTMENT_REDIRECTS: Record<string, string> = {
  Sales: "Freight Forwarding",
  "Customer Support": "Freight Forwarding",
  Documentation: "Custom Clearance",
  "CFS Operations": "Custom Clearance",
  "Delivery Order": "Custom Clearance",
};

export const KPI_SEED_DEPARTMENTS: KpiSeedDepartment[] = [
  {
    name: "Accounts",
    items: [
      { name: "Invoice Accuracy", weightage: 15, measurement: "Correct customer invoice, GST, charges, job reference", target: "99% accuracy" },
      { name: "Invoice Turnaround Time", weightage: 15, measurement: "Time taken to raise invoice after job completion", target: "Within 24-48 hours" },
      { name: "Receivables Collection", weightage: 20, measurement: "Collection follow-up, overdue control, DSO reduction", target: "As per credit terms" },
      { name: "Vendor / Shipping Line Payment Accuracy", weightage: 10, measurement: "Correct payment to vendors, CFS, lines, transporters", target: "Zero avoidable error" },
      { name: "Job Costing and Profitability Check", weightage: 15, measurement: "Matching income vs cost per job", target: "100% checked" },
      { name: "Bank / Cash Reconciliation", weightage: 10, measurement: "Bank, cash, ledger reconciliation", target: "Daily/weekly as required" },
      { name: "Statutory Compliance", weightage: 10, measurement: "GST, TDS, PF/ESI support, tax filings", target: "No delay/penalty" },
      { name: "Financial Reporting", weightage: 5, measurement: "MIS, outstanding report, profitability report", target: "On time" },
    ],
  },
  {
    name: "Administration",
    items: [
      { name: "Office Facility Management", weightage: 15, measurement: "Office cleanliness, infrastructure, utilities, repairs", target: "Smooth operation" },
      { name: "Vendor Management", weightage: 15, measurement: "Vendor follow-up, AMC, service providers, rate comparison", target: "Timely and cost-effective" },
      { name: "Procurement Efficiency", weightage: 15, measurement: "Office supplies, equipment, stationery, assets", target: "No shortage, controlled cost" },
      { name: "Asset Management", weightage: 10, measurement: "Laptops, systems, furniture, SIM cards, ID cards, records", target: "100% updated" },
      { name: "Employee Support TAT", weightage: 15, measurement: "Time taken to resolve staff admin requests", target: "Within agreed TAT" },
      { name: "Cost Control", weightage: 10, measurement: "Reducing unnecessary expenses", target: "Monthly review" },
      { name: "Compliance and Records", weightage: 10, measurement: "Agreements, insurance, office records, renewals", target: "No missed renewal" },
      { name: "Safety and Security", weightage: 5, measurement: "CCTV, access, fire safety, emergency readiness", target: "No violation" },
      { name: "Reporting", weightage: 5, measurement: "Admin MIS, expense report, asset report", target: "On time" },
    ],
  },
  {
    name: "Freight Forwarding",
    items: [
      { name: "Gross Profit / Revenue Achievement", weightage: 20, measurement: "Monthly GP or revenue generated", target: "100% of target" },
      { name: "New Customer Acquisition", weightage: 10, measurement: "New active customers added", target: "Monthly target" },
      { name: "Quotation Conversion Ratio", weightage: 10, measurement: "Quotes converted into confirmed shipments", target: "Target % to be fixed" },
      { name: "Quotation / Rate Response Time", weightage: 10, measurement: "Time taken to send quote after request", target: "Within agreed TAT" },
      { name: "Booking Accuracy", weightage: 10, measurement: "Correct vessel, routing, carrier, consignee, shipper details", target: "98%+" },
      { name: "Shipment Tracking Updates", weightage: 15, measurement: "Timely milestone updates to customer", target: "100% key milestone update" },
      { name: "Customer Communication Quality", weightage: 10, measurement: "Clear, professional, proactive communication", target: "Reviewer/customer rating" },
      { name: "Exception Handling", weightage: 10, measurement: "Delay, rollover, transshipment, customs, damage, shortage", target: "Fast escalation" },
      { name: "Internal Coordination", weightage: 5, measurement: "Coordination with sales, accounts, customs, transport", target: "Reviewer rating" },
    ],
  },
  {
    name: "Custom Clearance",
    items: [
      { name: "Documentation Accuracy", weightage: 15, measurement: "Error-free BE, SB, invoice, packing list, BL/AWB details", target: "98%+ accuracy" },
      { name: "Filing Turnaround Time", weightage: 15, measurement: "Prepare and file after receiving complete documents", target: "Same day / within agreed TAT" },
      { name: "First-Time Clearance Support", weightage: 10, measurement: "Jobs cleared without avoidable document-related query", target: "95%+" },
      { name: "Clearance Coordination Speed", weightage: 15, measurement: "Coordination with CFS, customs, surveyor, transporter, client", target: "Within planned timeline" },
      { name: "Detention / Demurrage Prevention", weightage: 10, measurement: "Avoidable detention/demurrage cases", target: "Zero avoidable cases" },
      { name: "DO Release Turnaround Time", weightage: 10, measurement: "Time to obtain DO after complete documents/payment", target: "Same day / within TAT" },
      { name: "Compliance Knowledge", weightage: 10, measurement: "HS support, checklist, licence/restriction awareness", target: "No major compliance miss" },
      { name: "Shipment Status Updates", weightage: 10, measurement: "Updates to internal team/customer support", target: "Same-day updates" },
      { name: "Record Maintenance", weightage: 5, measurement: "Digital/physical file maintenance, DO copies, receipts, email trail", target: "100% maintained" },
    ],
  },
  {
    name: "HR",
    items: [
      { name: "Recruitment Turnaround Time", weightage: 15, measurement: "Time taken to close approved vacancies", target: "Within agreed days" },
      { name: "Quality of Hiring", weightage: 10, measurement: "New hire performance/retention after probation", target: "Good retention" },
      { name: "Onboarding Completion", weightage: 10, measurement: "Offer letter, joining forms, ID, access, induction", target: "100% complete" },
      { name: "Attendance and Leave Management", weightage: 10, measurement: "Attendance accuracy, leave records, late reports", target: "100% accuracy" },
      { name: "Payroll Input Accuracy", weightage: 10, measurement: "Salary inputs, deductions, incentives, arrears", target: "Zero payroll error" },
      { name: "Statutory / Employee Compliance", weightage: 15, measurement: "PF, ESI, employee files, policies, HR records", target: "100% compliance" },
      { name: "Appraisal Cycle Management", weightage: 15, measurement: "Self-assessment, reviewer rating, meeting, closure", target: "100% within timeline" },
      { name: "Employee Grievance Handling", weightage: 5, measurement: "Employee issues resolved professionally", target: "Within TAT" },
      { name: "Training and Development", weightage: 5, measurement: "Training programs and skill tracking", target: "Monthly/quarterly target" },
      { name: "HR Reporting", weightage: 5, measurement: "Monthly HR MIS, attrition, hiring, attendance, appraisal reports", target: "On time" },
    ],
  },
];

/**
 * Maps a rating (1–5) to a multiplier.
 * rating <= 4: multiplier = rating / 4  (so rating 4 = 1.0, rating 1 = 0.25)
 * rating >  4: multiplier = 1 + (rating - 4) * 0.1  (so rating 5 = 1.10)
 */
export function calculateRatingMultiplier(rating: number): number {
  const bounded = Math.min(5, Math.max(1, rating));
  if (bounded <= 4) return bounded / 4;
  return 1 + (bounded - 4) * 0.1;
}

/**
 * Points earned for a single criterion/task.
 * criterionPoints = monthlyBasePoints × (weightagePercent / 100) × ratingMultiplier
 *
 * Examples at monthlyBasePoints=20000:
 *   100% weight, rating 1 → 5000
 *   100% weight, rating 4 → 20000
 *   100% weight, rating 5 → 22000
 */
export function calculateCriterionPoints(
  weightagePercent: number,
  rating: number,
  monthlyBasePoints = DEFAULT_KPI_MONTHLY_TARGET,
): number {
  if (!rating || !Number.isFinite(rating)) return 0;
  return monthlyBasePoints * (weightagePercent / 100) * calculateRatingMultiplier(rating);
}

export function monthStart(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(`${value}-01T00:00:00`) : value;
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function achievementForRating(
  rating: number | null | undefined,
  scale: Record<number, number> = DEFAULT_KPI_RATING_SCALE,
): number {
  if (!rating || !Number.isFinite(rating)) return 0;
  const boundedRating = Math.min(5, Math.max(1, rating));
  if (scale[boundedRating]) return scale[boundedRating];

  const lower = Math.floor(boundedRating);
  const upper = Math.ceil(boundedRating);
  if (lower === upper) return scale[lower] ?? 0;

  const lowerAchievement = scale[lower] ?? 0;
  const upperAchievement = scale[upper] ?? lowerAchievement;
  return lowerAchievement + (upperAchievement - lowerAchievement) * (boundedRating - lower);
}

export function calculateWeightedAchievement(weightage: number, achievementPercent: number): number {
  return (weightage * achievementPercent) / 100;
}

export function calculateMonthlyPointScore(
  totalAchievementPercent: number,
  monthlyTarget = DEFAULT_KPI_MONTHLY_TARGET,
): number {
  return Math.round((monthlyTarget * totalAchievementPercent) / 100);
}

export function calculateAverageRating(ratings: Array<number | null | undefined>): number {
  const validRatings = ratings.filter((rating): rating is number => typeof rating === "number" && Number.isFinite(rating));
  if (validRatings.length === 0) return 0;
  return Math.round((validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length) * 100) / 100;
}

export function getKpiPerformanceCategory(monthlyPointScore: number): string {
  if (monthlyPointScore >= 25000) return "Outstanding Performer";
  if (monthlyPointScore >= 22000) return "High Performer";
  if (monthlyPointScore >= 20000) return "Good Performer";
  if (monthlyPointScore >= 16000) return "Average Performer";
  if (monthlyPointScore >= 12000) return "Minimum Performer";
  return "Poor Performer";
}

export function parseKpiRatingScale(value: string | null | undefined): Record<number, number> {
  if (!value) return DEFAULT_KPI_RATING_SCALE;
  try {
    const parsed = JSON.parse(value) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed).map(([rating, achievement]) => [Number(rating), Number(achievement)]),
    );
  } catch {
    return DEFAULT_KPI_RATING_SCALE;
  }
}
