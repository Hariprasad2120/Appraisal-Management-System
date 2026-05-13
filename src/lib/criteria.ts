export type CriteriaCategory = {
  name: string;
  maxPoints: number;
  items: string[];
  questions: string[];
  /** Reviewer-only criteria — employee does not self-rate or answer questions for these */
  reviewerOnly?: boolean;
};

export type SupplementarySection = {
  part: string;
  title: string;
  questions: { id: string; text: string; type: "text" | "choice"; choices?: string[]; numericOnly?: boolean }[];
};

export const CRITERIA_CATEGORIES: CriteriaCategory[] = [
  {
    name: "Core Performance & Efficiency",
    maxPoints: 25,
    items: ["Quality", "Speed", "Accuracy"],
    questions: [
      "List three major accomplishments in your role over the last appraisal period.",
      "Have you consistently met your targets? If not, what were the challenges?",
      "How do you ensure the accuracy and quality of your work?",
    ],
  },
  {
    name: "Accountability & Attendance",
    maxPoints: 10,
    items: ["Punctuality", "Reliability", "Adherence"],
    questions: [
      "How often have you taken unplanned leaves in the past 6 months?",
      "How do you manage workload when faced with tight deadlines?",
      "Give an example of when you took complete ownership of a critical task.",
    ],
  },
  {
    name: "Collaboration & Leadership",
    maxPoints: 15,
    items: ["Teamwork", "Leadership Abilities", "Conflict Resolution"],
    questions: [
      "Describe a situation where you successfully worked with a team to achieve a goal.",
      "Have you mentored or helped a colleague? How did it impact them?",
      "How do you handle workplace conflicts?",
    ],
  },
  {
    name: "Client & Stakeholder Satisfaction",
    maxPoints: 15,
    items: ["Responsiveness", "Relationship Management", "Feedback"],
    questions: [
      "Have you handled any difficult clients? How did you resolve the situation?",
      "What steps do you take to ensure client satisfaction in your role?",
    ],
  },
  {
    name: "Compliance & Risk Management",
    maxPoints: 10,
    items: ["Adherence to Policies", "Risk Mitigation", "Ethical Conduct"],
    questions: [
      "Have you ever identified a risk in your department? How did you handle it?",
      "How do you ensure adherence to company policies in your daily work?",
    ],
  },
  {
    name: "Problem-Solving & Crisis Management",
    maxPoints: 15,
    items: ["Decision-Making", "Problem Resolution", "Crisis Handling"],
    questions: [
      "Describe a time when you had to make a quick decision under pressure.",
      "What is your approach to solving unexpected challenges?",
    ],
  },
  {
    name: "Organisational Contribution & Engagement",
    maxPoints: 10,
    items: ["Initiative", "Participation", "Alignment with Goals"],
    questions: [
      "Apart from your core responsibilities, how have you contributed to company activities?",
      "Are you willing to take on additional responsibilities if needed?",
    ],
  },
  {
    name: "Professionalism & Communication",
    maxPoints: 10,
    items: ["Clarity", "Respect", "Responsiveness", "Effectiveness of Communication"],
    questions: [
      "How do you ensure effective communication with your team and managers?",
      "How do you handle feedback from seniors and colleagues?",
    ],
  },
  {
    name: "Innovation & Continuous Improvement",
    maxPoints: 10,
    items: ["Creativity", "Process Improvements", "Implementation of New Ideas"],
    questions: [
      "Have you suggested or implemented any improvements in your department?",
      "What was the last skill or knowledge area you proactively learned?",
    ],
  },
  {
    name: "Adaptability & Learning",
    maxPoints: 10,
    items: ["Willingness to Learn", "Flexibility", "Responsiveness to Change"],
    questions: [
      "Have you worked in a situation where you had to quickly adapt to changes? How did you manage?",
      "How do you stay updated with industry trends and new developments?",
    ],
  },
  {
    name: "Work Ethic & Attitude",
    maxPoints: 10,
    items: ["Dedication", "Integrity", "Enthusiasm", "Workplace Behaviour"],
    questions: [],
    reviewerOnly: true,
  },
  {
    name: "Results & Goal Achievement",
    maxPoints: 20,
    items: ["Target Completion", "Measurable Impact", "Overall Contribution"],
    questions: [],
    reviewerOnly: true,
  },
];

/** Part B, C, D — standalone questions shown after the 10 criteria sections in the self-assessment form */
export const SUPPLEMENTARY_SECTIONS: SupplementarySection[] = [
  {
    part: "B",
    title: "Career Aspirations & Growth Perspective",
    questions: [
      {
        id: "b1",
        text: "Where do you see yourself in the next 3 years within this company?",
        type: "text",
      },
      {
        id: "b2",
        text: "If given an opportunity for a leadership role, what would you do differently from current managers?",
        type: "text",
      },
      {
        id: "b3",
        text: "What motivates you more: Growth opportunities or financial incentives? Explain why.",
        type: "text",
      },
      {
        id: "b4",
        text: "Would you be open to learning new roles outside your current job description?",
        type: "text",
      },
    ],
  },
  {
    part: "B",
    title: "Decision-Making & Managerial Capabilities",
    questions: [
      {
        id: "b_q1",
        text: "You are assigned to lead a team, but one of your team members consistently underperforms despite repeated guidance. What is your first step?\na) Report to higher management immediately\nb) Have a one-on-one conversation to understand the issue\nc) Assign their work to someone else to avoid delays\nd) Ignore and continue managing other tasks",
        type: "choice",
        choices: [
          "a) Report to higher management immediately",
          "b) Have a one-on-one conversation to understand the issue",
          "c) Assign their work to someone else to avoid delays",
          "d) Ignore and continue managing other tasks",
        ],
      },
      {
        id: "b_q1_reason",
        text: "Explain your choice for Q1.",
        type: "text",
      },
      {
        id: "b_q2",
        text: "If you are given a chance to implement a major change in your department, how would you convince your team to support it?\na) Enforce it as a rule and expect compliance\nb) Explain its benefits and take their feedback before implementing\nc) Wait for management approval before taking any steps\nd) Implement it immediately and justify later",
        type: "choice",
        choices: [
          "a) Enforce it as a rule and expect compliance",
          "b) Explain its benefits and take their feedback before implementing",
          "c) Wait for management approval before taking any steps",
          "d) Implement it immediately and justify later",
        ],
      },
      {
        id: "b_q2_reason",
        text: "Explain your choice for Q2.",
        type: "text",
      },
      {
        id: "b_q3",
        text: "A junior colleague makes a critical mistake that affects an ongoing project. How do you respond?\na) Blame them and report to management\nb) Identify the issue, guide them to fix it, and ensure it doesn't happen again\nc) Fix the problem yourself and inform them later\nd) Avoid involvement and let the manager handle it",
        type: "choice",
        choices: [
          "a) Blame them and report to management",
          "b) Identify the issue, guide them to fix it, and ensure it doesn't happen again",
          "c) Fix the problem yourself and inform them later",
          "d) Avoid involvement and let the manager handle it",
        ],
      },
      {
        id: "b_q3_reason",
        text: "Explain your choice for Q3.",
        type: "text",
      },
      {
        id: "b_q4",
        text: "During a crisis at work, where multiple urgent tasks arise, how do you prioritize?\na) Complete the easiest tasks first\nb) Focus on tasks that impact business operations most\nc) Delegate everything to other employees\nd) Wait for instructions from management",
        type: "choice",
        choices: [
          "a) Complete the easiest tasks first",
          "b) Focus on tasks that impact business operations most",
          "c) Delegate everything to other employees",
          "d) Wait for instructions from management",
        ],
      },
      {
        id: "b_q4_reason",
        text: "Explain your choice for Q4.",
        type: "text",
      },
      {
        id: "b_q5",
        text: "You have two job offers. Company A offers a higher salary but no growth opportunities. Company B offers a moderate salary but a clear growth path. Which one would you choose and why?",
        type: "text",
      },
    ],
  },
  {
    part: "C",
    title: "Retention & Commitment",
    questions: [
      {
        id: "c1",
        text: "How long do you see yourself working with this organization?",
        type: "choice",
        choices: [
          "a) Less than a year",
          "b) 1–3 years",
          "c) 3–5 years",
          "d) Long-term",
        ],
      },
      {
        id: "c2",
        text: "If you were offered a 20% salary hike to leave immediately for another company, what would you do?",
        type: "choice",
        choices: [
          "a) Accept without second thought",
          "b) Consider factors beyond salary before deciding",
          "c) Decline and discuss growth opportunities internally",
          "d) Negotiate a better offer with the current company",
        ],
      },
      {
        id: "c3",
        text: "If you had to choose between job stability and a 50% higher salary elsewhere but with risk, what would you prioritize?",
        type: "choice",
        choices: [
          "a) Stability",
          "b) Higher salary",
          "c) Depends on the role and responsibilities",
          "d) Would negotiate for a middle ground",
        ],
      },
      {
        id: "c4",
        text: "If your organization introduces a new role with greater responsibilities but no immediate salary hike, would you take it? Why or why not?",
        type: "text",
      },
    ],
  },
  {
    part: "D",
    title: "Compensation & Satisfaction",
    questions: [
      {
        id: "d1",
        text: "What is your current Annual CTC? (numbers only, e.g. 480000)",
        type: "text",
        numericOnly: true,
      },
      {
        id: "d2",
        text: "What is your expected Annual CTC for the next appraisal year? (numbers only)",
        type: "text",
        numericOnly: true,
      },
      {
        id: "d3",
        text: "Are you satisfied with your current salary? If No, please provide a reason.",
        type: "text",
      },
      {
        id: "d4",
        text: "What would make you feel more valued in this organization aside from salary increments?",
        type: "text",
      },
    ],
  },
];

export const TOTAL_MAX_POINTS = CRITERIA_CATEGORIES.reduce((s, c) => s + c.maxPoints, 0); // 160

/** Normalize raw score out of TOTAL_MAX_POINTS to 0-100 */
export function normalizeScore(raw: number): number {
  return (raw / TOTAL_MAX_POINTS) * 100;
}

export type GradeInfo = {
  grade: string;
  label: string;
  minNormalized: number;
  maxNormalized: number;
};

export const GRADE_BANDS: GradeInfo[] = [
  { grade: "A+", label: "Outstanding", minNormalized: 91, maxNormalized: 100 },
  { grade: "A",  label: "Excellent",   minNormalized: 81, maxNormalized: 90 },
  { grade: "B+", label: "Good",        minNormalized: 71, maxNormalized: 80 },
  { grade: "B",  label: "Satisfactory",minNormalized: 66, maxNormalized: 70 },
  { grade: "C+", label: "Average",     minNormalized: 61, maxNormalized: 65 },
  { grade: "C",  label: "Below Average",minNormalized: 51, maxNormalized: 60 },
  { grade: "D",  label: "Poor",        minNormalized: 0,  maxNormalized: 50 },
];

export function getGrade(normalizedScore: number): GradeInfo {
  const floored = Math.floor(normalizedScore);
  return GRADE_BANDS.find((b) => floored >= b.minNormalized && floored <= b.maxNormalized)
    ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

/** Increment % per grade per salary tier (monthly gross) */
export const HIKE_TABLE: Record<string, { upto15k: number; upto30k: number; above30k: number }> = {
  "A+": { upto15k: 50, upto30k: 30, above30k: 25 },
  "A":  { upto15k: 40, upto30k: 25, above30k: 20 },
  "B+": { upto15k: 25, upto30k: 20, above30k: 15 },
  "B":  { upto15k: 20, upto30k: 15, above30k: 5  },
  "C+": { upto15k: 10, upto30k: 5,  above30k: 0  },
  "C":  { upto15k: 5,  upto30k: 0,  above30k: 0  },
  "D":  { upto15k: 0,  upto30k: 0,  above30k: 0  },
};

export function getSalaryTier(monthlyGross: number): "upto15k" | "upto30k" | "above30k" {
  if (monthlyGross <= 15000) return "upto15k";
  if (monthlyGross <= 30000) return "upto30k";
  return "above30k";
}

export function getHikePercent(grade: string, monthlyGross: number): number {
  const row = HIKE_TABLE[grade];
  if (!row) return 0;
  const tier = getSalaryTier(monthlyGross);
  return row[tier];
}

/**
 * Criteria excluded per reviewer role based on the appraisal matrix.
 * MANAGEMENT: cannot rate Accountability & Attendance, Organisational Contribution & Engagement
 * HR: cannot rate Client & Stakeholder Satisfaction, Problem-Solving & Crisis Management, Results & Goal Achievement
 * TL and MANAGER: rate all criteria
 */
const ROLE_EXCLUDED_CRITERIA: Record<string, string[]> = {
  MANAGEMENT: [
    "Accountability & Attendance",
    "Organisational Contribution & Engagement",
  ],
  HR: [
    "Client & Stakeholder Satisfaction",
    "Problem-Solving & Crisis Management",
    "Results & Goal Achievement",
  ],
  TL: [],
  MANAGER: [],
};

export function getCriteriaForRole(
  categories: CriteriaCategory[],
  role: string,
): CriteriaCategory[] {
  const excluded = ROLE_EXCLUDED_CRITERIA[role] ?? [];
  if (excluded.length === 0) return categories;
  return categories.filter((c) => !excluded.includes(c.name));
}

export function getMaxPointsForRole(categories: CriteriaCategory[], role: string): number {
  return getCriteriaForRole(categories, role).reduce((s, c) => s + c.maxPoints, 0);
}
