const pptxgen = require("pptxgenjs");

let pres = new pptxgen();

pres.theme = { headFontFace: "Segoe UI", bodyFontFace: "Segoe UI" };
pres.layout = "LAYOUT_16x9";

// Define brand colors
const colors = {
  bg: "0F172A", // Dark Slate
  primary: "3B82F6", // Blue
  secondary: "06B6D4", // Cyan
  accent1: "10B981", // Emerald
  accent2: "8B5CF6", // Purple
  accent3: "EF4444", // Red
  text: "FFFFFF",
  textMuted: "94A3B8"
};

// Define standard master slide
pres.defineSlideMaster({
  title: "MASTER_SLIDE",
  background: { color: colors.bg },
  objects: [
    { rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: colors.primary } } },
    { rect: { x: 0, y: "98%", w: "100%", h: 0.15, fill: { color: colors.secondary } } },
    { text: { text: "Adarsh Shipping | Enterprise Showcase", options: { x: 0.5, y: "94%", w: 5, h: 0.3, color: colors.textMuted, fontSize: 10 } } },
    { text: { text: "Slide {current} of {total}", options: { x: "85%", y: "94%", w: 1, h: 0.3, color: colors.textMuted, fontSize: 10, align: "right" } } }
  ]
});

function addTitle(slide, text) {
  slide.addText(text, {
    x: 0.5, y: 0.4, w: "90%", h: 0.8, fontSize: 32, color: colors.secondary, bold: true
  });
}

// ---------------------------------------------------------
// 1. Title Slide
// ---------------------------------------------------------
let slide1 = pres.addSlide({ masterName: "MASTER_SLIDE" });
slide1.addText("Adarsh Shipping & Services", { x: 1, y: 1.8, w: "80%", h: 1, fontSize: 48, color: colors.text, bold: true });
slide1.addText("Appraisal Management System", { x: 1, y: 2.8, w: "80%", h: 0.6, fontSize: 28, color: colors.primary, bold: true });
slide1.addText("Streamlining performance reviews, automating compensation data,\nand empowering management decisions through a unified digital workflow.", { x: 1, y: 3.6, w: "80%", h: 1, fontSize: 16, color: colors.textMuted });

slide1.addShape(pres.ShapeType.rect, { x: 1, y: 4.8, w: 2, h: 0.6, fill: "1E293B", line: {color: colors.primary} });
slide1.addText("7 User Roles", { x: 1, y: 4.8, w: 2, h: 0.6, align: "center", color: colors.text, fontSize: 14, bold: true });

slide1.addShape(pres.ShapeType.rect, { x: 3.2, y: 4.8, w: 2, h: 0.6, fill: "1E293B", line: {color: colors.secondary} });
slide1.addText("10 Workflow Stages", { x: 3.2, y: 4.8, w: 2, h: 0.6, align: "center", color: colors.text, fontSize: 14, bold: true });

slide1.addShape(pres.ShapeType.rect, { x: 5.4, y: 4.8, w: 2, h: 0.6, fill: "1E293B", line: {color: colors.accent1} });
slide1.addText("3 Review Layers", { x: 5.4, y: 4.8, w: 2, h: 0.6, align: "center", color: colors.text, fontSize: 14, bold: true });

// ---------------------------------------------------------
// 2. Context & Overview
// ---------------------------------------------------------
let slide2 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide2, "1. Project Overview & Objectives");

slide2.addText("What AMS Does", { x: 0.5, y: 1.3, w: 4.5, h: 0.4, fontSize: 20, color: colors.primary, bold: true });
slide2.addText("Digitizes the full appraisal cycle from initiation and self-assessment through reviewer ratings, management decision, salary revision, meeting records, and closure.", { x: 0.5, y: 1.7, w: 4.5, h: 1, fontSize: 16, color: colors.text });

slide2.addText("Problems Solved", { x: 0.5, y: 3.0, w: 4.5, h: 0.4, fontSize: 20, color: colors.accent3, bold: true });
slide2.addText("Replaces paper forms, spreadsheets, and email chasing with a structured workflow. Fixes inconsistent ratings, un-auditable decisions, and missed deadlines.", { x: 0.5, y: 3.4, w: 4.5, h: 1, fontSize: 16, color: colors.text });

slide2.addShape(pres.ShapeType.rect, { x: 5.5, y: 1.3, w: 4.2, h: 3.5, fill: "1E293B", line: {color: colors.secondary} });
slide2.addText("Core Objectives", { x: 5.7, y: 1.5, w: 3.8, h: 0.4, fontSize: 20, color: colors.secondary, bold: true });
slide2.addText(
  "• Streamline workflow: Define a strict digital appraisal lifecycle.\n" +
  "• Fair Scoring: Ensure scores via three independent reviewers.\n" +
  "• Automate Triggers: Deadlines, reminders, and arrear calculations.\n" +
  "• Protect Data: Role-based access and complete audit history.\n" +
  "• Centralize Records: Ratings, salary revisions, MOMs, and KPIs.", 
  { x: 5.7, y: 2.0, w: 3.8, h: 2.5, fontSize: 15, color: colors.text }
);

// ---------------------------------------------------------
// 3. 10-Stage Workflow
// ---------------------------------------------------------
let slide3 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide3, "2. Complete 10-Stage Appraisal Workflow");

const stages = [
  { n: "1", title: "Cycle Created", desc: "Admin assigns reviewers" },
  { n: "2", title: "Confirmations", desc: "HR, TL, Manager confirm" },
  { n: "3", title: "Self-Assessment", desc: "Employee submits (3 days)" },
  { n: "4", title: "Peer Ratings", desc: "3 reviewers score 9 criteria" },
  { n: "5", title: "Rating Review", desc: "Disagreements revised" },
  { n: "6", title: "Mgmt Review", desc: "Scores reviewed by mgmt" },
  { n: "7", title: "Decision Made", desc: "Rating, slab, & hike set" },
  { n: "8", title: "Meeting Scheduled", desc: "Date voted and held" },
  { n: "9", title: "MOM Created", desc: "Discussion documented" },
  { n: "10", title: "Cycle Closed", desc: "Permanently archived" }
];

for(let i=0; i<5; i++) {
  // Top row (1-5)
  slide3.addShape(pres.ShapeType.rect, { x: 0.5 + (i*1.8), y: 1.5, w: 1.6, h: 1.2, fill: "1E293B", line: {color: colors.primary} });
  slide3.addText(stages[i].n + ". " + stages[i].title, { x: 0.5 + (i*1.8), y: 1.6, w: 1.6, h: 0.4, align: "center", color: colors.text, bold: true, fontSize: 14 });
  slide3.addText(stages[i].desc, { x: 0.5 + (i*1.8), y: 2.0, w: 1.6, h: 0.6, align: "center", color: colors.textMuted, fontSize: 11 });
  
  // Bottom row (6-10)
  slide3.addShape(pres.ShapeType.rect, { x: 0.5 + (i*1.8), y: 3.2, w: 1.6, h: 1.2, fill: "1E293B", line: {color: colors.secondary} });
  slide3.addText(stages[i+5].n + ". " + stages[i+5].title, { x: 0.5 + (i*1.8), y: 3.3, w: 1.6, h: 0.4, align: "center", color: colors.text, bold: true, fontSize: 14 });
  slide3.addText(stages[i+5].desc, { x: 0.5 + (i*1.8), y: 3.7, w: 1.6, h: 0.6, align: "center", color: colors.textMuted, fontSize: 11 });
}

slide3.addText("STATUS PIPELINE: PENDING → SELF SUBMITTED → RATING IN PROGRESS → RATINGS COMPLETE → MANAGEMENT REVIEW → DECIDED → CLOSED", { x: 0.5, y: 4.8, w: "90%", h: 0.5, align: "center", color: colors.textMuted, fontSize: 12, bold: true });

// ---------------------------------------------------------
// 4. System Capabilities
// ---------------------------------------------------------
let slide4 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide4, "3. Core System Capabilities");

slide4.addText("Digital Assessments", { x: 0.5, y: 1.5, w: 4.5, h: 0.4, fontSize: 20, color: colors.primary, bold: true });
slide4.addText("Employees complete a 9-category self-assessment. Three reviewers then score independently before scores are revealed to each other.", { x: 0.5, y: 1.9, w: 4.2, h: 1, fontSize: 16, color: colors.text });

slide4.addText("KPI Tracking", { x: 5.2, y: 1.5, w: 4.5, h: 0.4, fontSize: 20, color: colors.primary, bold: true });
slide4.addText("Monthly KPI history connects day-to-day employee performance directly with year-end appraisal decisions in a centralized view.", { x: 5.2, y: 1.9, w: 4.2, h: 1, fontSize: 16, color: colors.text });

slide4.addText("Salary & Arrears Automation", { x: 0.5, y: 3.2, w: 4.5, h: 0.4, fontSize: 20, color: colors.primary, bold: true });
slide4.addText("Management selects increment slabs. Late meetings trigger automatic daily-rate arrear calculation for approval and tracking.", { x: 0.5, y: 3.6, w: 4.2, h: 1, fontSize: 16, color: colors.text });

slide4.addText("Meeting Minutes (MOM)", { x: 5.2, y: 3.2, w: 4.5, h: 0.4, fontSize: 20, color: colors.primary, bold: true });
slide4.addText("HR, Admin, and Management can record and securely store separate meeting notes against each individual appraisal cycle.", { x: 5.2, y: 3.6, w: 4.2, h: 1, fontSize: 16, color: colors.text });


// ---------------------------------------------------------
// 5. User Roles
// ---------------------------------------------------------
let slide5 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide5, "4. User Roles & Access Control");

const roles = [
  { name: "Admin", access: "Full system control, cycle creation, salary slabs, extensions, and data tools.", color: colors.accent3 },
  { name: "Management", access: "Reviews aggregate ratings, decides salary hikes, approves arrears.", color: colors.accent2 },
  { name: "HR", access: "Reviewer role, confirms availability, writes MOM, handles notifications.", color: colors.secondary },
  { name: "Team Lead", access: "Rates reports, confirms availability, views team KPI data, votes on dates.", color: colors.accent1 },
  { name: "Manager", access: "Independent reviewer for assigned employees with rating responsibilities.", color: "F59E0B" }, // Amber
  { name: "Employee", access: "Self-assessment, cycle status view, KPI records, and salary history.", color: colors.primary },
  { name: "Partner / Director", access: "Read-only oversight across all employee records and appraisal info.", color: "6366F1" } // Indigo
];

for(let i=0; i<4; i++) {
  slide5.addShape(pres.ShapeType.rect, { x: 0.5 + (i*2.3), y: 1.5, w: 2.1, h: 1.4, fill: "1E293B", line: {color: roles[i].color} });
  slide5.addText(roles[i].name, { x: 0.5 + (i*2.3), y: 1.6, w: 2.1, h: 0.3, align: "center", color: roles[i].color, bold: true, fontSize: 16 });
  slide5.addText(roles[i].access, { x: 0.6 + (i*2.3), y: 1.9, w: 1.9, h: 0.9, align: "center", color: colors.text, fontSize: 12 });
}

for(let i=0; i<3; i++) {
  slide5.addShape(pres.ShapeType.rect, { x: 1.65 + (i*2.3), y: 3.2, w: 2.1, h: 1.4, fill: "1E293B", line: {color: roles[i+4].color} });
  slide5.addText(roles[i+4].name, { x: 1.65 + (i*2.3), y: 3.3, w: 2.1, h: 0.3, align: "center", color: roles[i+4].color, bold: true, fontSize: 16 });
  slide5.addText(roles[i+4].access, { x: 1.75 + (i*2.3), y: 3.6, w: 1.9, h: 0.9, align: "center", color: colors.text, fontSize: 12 });
}

slide5.addText("Users can hold dual roles (e.g. HR + Employee) to submit their own appraisal while reviewing others.", { x: 0.5, y: 5.0, w: "90%", h: 0.4, align: "center", color: colors.textMuted, fontSize: 14, italic: true });

// ---------------------------------------------------------
// 6. Dashboards
// ---------------------------------------------------------
let slide6 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide6, "5. Role-Based Dashboards");

slide6.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.5, w: 4.2, h: 1.8, fill: "1E293B", line: {color: colors.accent3} });
slide6.addText("Admin Dashboard", { x: 0.6, y: 1.6, w: 4, h: 0.4, fontSize: 18, color: colors.text, bold: true });
slide6.addText("• Alerts for cycles due this month\n• Overview of all active cycles & confirmations\n• Extension request management\n• Global support ticket overview", { x: 0.6, y: 2.0, w: 4, h: 1.2, fontSize: 14, color: colors.textMuted });

slide6.addShape(pres.ShapeType.rect, { x: 5.2, y: 1.5, w: 4.2, h: 1.8, fill: "1E293B", line: {color: colors.accent2} });
slide6.addText("Management Dashboard", { x: 5.3, y: 1.6, w: 4, h: 0.4, fontSize: 18, color: colors.text, bold: true });
slide6.addText("• Queues awaiting final salary decisions\n• Arrear payment approvals\n• Top performers & performance charts\n• Real-time financial metrics", { x: 5.3, y: 2.0, w: 4, h: 1.2, fontSize: 14, color: colors.textMuted });

slide6.addShape(pres.ShapeType.rect, { x: 0.5, y: 3.5, w: 4.2, h: 1.8, fill: "1E293B", line: {color: colors.accent1} });
slide6.addText("Reviewer / HR / TL Dashboard", { x: 0.6, y: 3.6, w: 4, h: 0.4, fontSize: 18, color: colors.text, bold: true });
slide6.addText("• Assigned cycles & availability status\n• Pending rating submissions queue\n• MOM entry interface & Meeting date votes\n• Team KPI overviews for Leaders", { x: 0.6, y: 4.0, w: 4, h: 1.2, fontSize: 14, color: colors.textMuted });

slide6.addShape(pres.ShapeType.rect, { x: 5.2, y: 3.5, w: 4.2, h: 1.8, fill: "1E293B", line: {color: colors.primary} });
slide6.addText("Employee Dashboard", { x: 5.3, y: 3.6, w: 4, h: 0.4, fontSize: 18, color: colors.text, bold: true });
slide6.addText("• Personal cycle progress & status timeline\n• Self-assessment submission forms\n• Monthly KPI records & Salary history\n• Personal notifications & support tickets", { x: 5.3, y: 4.0, w: 4, h: 1.2, fontSize: 14, color: colors.textMuted });


// ---------------------------------------------------------
// 7. Automation & Triggers
// ---------------------------------------------------------
let slide7 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide7, "6. Automation & Triggers");
slide7.addText("The system keeps users moving without manual email chasing.", { x: 0.5, y: 1.0, w: "90%", h: 0.4, fontSize: 16, color: colors.textMuted, italic: true });

slide7.addText("Automated Triggers", { x: 0.5, y: 1.6, w: 4.5, h: 0.4, fontSize: 20, color: colors.text, bold: true });
slide7.addText(
  "• Anniversary Detection: Detects appraisal month and notifies Admin to create a cycle.\n\n" +
  "• Smart Unlocking: Self-assessment is unlocked automatically as soon as reviewers confirm availability.\n\n" +
  "• Deadline Reminders: Sent automatically before self-assessment and rating deadlines close.\n\n" +
  "• Arrear Auto-Calculation: Late meetings automatically create daily-rate arrears for payout approval.", 
  { x: 0.5, y: 2.1, w: 5, h: 3, fontSize: 16, color: colors.text, bullet: { type: "bullet" } }
);

slide7.addShape(pres.ShapeType.rect, { x: 6.0, y: 1.6, w: 3.5, h: 3.0, fill: "1E293B", line: {color: colors.primary} });
slide7.addText("In-App Notifications", { x: 6.2, y: 1.8, w: 3.1, h: 0.4, fontSize: 20, color: colors.primary, bold: true, align: "center" });
slide7.addShape(pres.ShapeType.rect, { x: 6.2, y: 2.4, w: 3.1, h: 0.4, fill: "0F172A", line: {color: colors.accent1} });
slide7.addText("✅ Cycle Started", { x: 6.2, y: 2.4, w: 3.1, h: 0.4, color: colors.text, fontSize: 14, align: "center" });

slide7.addShape(pres.ShapeType.rect, { x: 6.2, y: 2.9, w: 3.1, h: 0.4, fill: "0F172A", line: {color: colors.secondary} });
slide7.addText("🔓 Self-assessment unlocked", { x: 6.2, y: 2.9, w: 3.1, h: 0.4, color: colors.text, fontSize: 14, align: "center" });

slide7.addShape(pres.ShapeType.rect, { x: 6.2, y: 3.4, w: 3.1, h: 0.4, fill: "0F172A", line: {color: "F59E0B"} });
slide7.addText("⚠️ Deadline approaching", { x: 6.2, y: 3.4, w: 3.1, h: 0.4, color: colors.text, fontSize: 14, align: "center" });

slide7.addShape(pres.ShapeType.rect, { x: 6.2, y: 3.9, w: 3.1, h: 0.4, fill: "0F172A", line: {color: colors.accent3} });
slide7.addText("🚨 Urgent action needed", { x: 6.2, y: 3.9, w: 3.1, h: 0.4, color: colors.text, fontSize: 14, align: "center" });


// ---------------------------------------------------------
// 8. Governance & Security
// ---------------------------------------------------------
let slide8 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide8, "7. Governance & Security");

slide8.addText("Security Controls", { x: 0.5, y: 1.5, w: 4.5, h: 0.4, fontSize: 20, color: colors.secondary, bold: true, border: [null, null, {pt: 1, color: "FFFFFF"}, null] });
slide8.addText(
  "• Authentication: Challenge-based passkey login, reset approval, and bcrypt hashing.\n\n" +
  "• Role-Based Access: Every page enforces permissions; salary data is strictly protected.\n\n" +
  "• Session Management: Timeout controls, active session monitoring, and admin forced logout.\n\n" +
  "• Privacy Controls: Employees cannot view others' data; partner access is strictly read-only.", 
  { x: 0.5, y: 2.1, w: 4.5, h: 3, fontSize: 15, color: colors.text, bullet: { type: "bullet" } }
);

slide8.addText("Reports & Audit Trails", { x: 5.5, y: 1.5, w: 4.0, h: 0.4, fontSize: 20, color: colors.secondary, bold: true, border: [null, null, {pt: 1, color: "FFFFFF"}, null] });
slide8.addText(
  "• Complete Audit Trail: Actions, ratings, decisions, state changes, and timestamps are permanently logged.\n\n" +
  "• Appraisal History: Ratings, reviewers, meeting dates, and MOM records stored securely per employee.\n\n" +
  "• Salary Sheet: Tracks components, approved revisions, effective dates, and payout months.\n\n" +
  "• Security Logs: All login attempts and reset requests are available for admin review.", 
  { x: 5.5, y: 2.1, w: 4.0, h: 3, fontSize: 15, color: colors.text, bullet: { type: "bullet" } }
);

// ---------------------------------------------------------
// 9. Market Comparison
// ---------------------------------------------------------
let slide9 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide9, "8. Market Comparison");
slide9.addText("Off-the-shelf SaaS vs. Our Tailor-Made Solution", { x: 0.5, y: 1.0, w: "90%", h: 0.4, fontSize: 16, color: colors.textMuted, italic: true });

slide9.addTable([
  [ 
    { text: "Feature Category", options: { bold: true, color: "FFFFFF", fill: "1E293B" } }, 
    { text: "Generic SaaS (e.g., Workday, Zoho)", options: { bold: true, color: "FFFFFF", fill: "1E293B" } }, 
    { text: "Our Custom Solution", options: { bold: true, color: colors.primary, fill: "1E293B" } } 
  ],
  [ "Customization", "Rigid. Forces you to change your workflows to match the software.", "Flexible. Molds perfectly to your exact business processes." ],
  [ "Data Ownership", "Stored on 3rd-party shared servers with thousands of other clients.", "You own 100% of the codebase and the database." ],
  [ "Pricing Model", "Expensive recurring per-user, per-month licensing fees.", "One-time development cost + nominal standard hosting." ],
  [ "Feature Bloat", "Bloated with hundreds of unused tools that clutter the interface.", "Lean, intuitive, and contains exactly what you need." ],
  [ "Future Integrations", "Relies on whatever APIs the provider decides to support.", "Open architecture. We can integrate anything at any time." ]
], { 
  x: 0.5, y: 1.6, w: "90%", rowH: 0.7, 
  fill: colors.bg, color: colors.text, fontSize: 14, 
  border: { type: "solid", color: "334155", pt: 1 },
  valign: "middle"
});


// ---------------------------------------------------------
// 10. Price Comparison
// ---------------------------------------------------------
let slide10 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide10, "9. Cost Effectiveness & Pricing");

slide10.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.5, w: 4.2, h: 2.8, fill: "1E293B", line: {color: colors.accent3} });
slide10.addText("Generic Enterprise SaaS", { x: 0.5, y: 1.7, w: 4.2, h: 0.4, align: "center", fontSize: 22, color: colors.text, bold: true });
slide10.addText("Recurring Annual Cost (Licensing based)", { x: 0.5, y: 2.2, w: 4.2, h: 0.3, align: "center", fontSize: 14, color: colors.textMuted });
slide10.addText("$ _____________", { x: 0.5, y: 2.7, w: 4.2, h: 0.8, align: "center", fontSize: 44, color: colors.accent3, bold: true });
slide10.addText("Cost compounds every year. Adds up significantly.", { x: 0.5, y: 3.8, w: 4.2, h: 0.3, align: "center", fontSize: 12, color: colors.textMuted });

slide10.addShape(pres.ShapeType.rect, { x: 5.3, y: 1.5, w: 4.2, h: 2.8, fill: "1E293B", line: {color: colors.primary, pt: 2} });
slide10.addText("Our Custom Solution", { x: 5.3, y: 1.7, w: 4.2, h: 0.4, align: "center", fontSize: 22, color: colors.text, bold: true });
slide10.addText("One-Time Development Cost", { x: 5.3, y: 2.2, w: 4.2, h: 0.3, align: "center", fontSize: 14, color: colors.textMuted });
slide10.addText("$ _____________", { x: 5.3, y: 2.7, w: 4.2, h: 0.8, align: "center", fontSize: 44, color: colors.primary, bold: true });
slide10.addText("Zero recurring license fees. You own the code.", { x: 5.3, y: 3.8, w: 4.2, h: 0.3, align: "center", fontSize: 12, color: colors.textMuted });

slide10.addText("Estimated ROI Timeline:      ______ Months", { x: 0.5, y: 4.8, w: "90%", h: 0.6, align: "center", fontSize: 24, color: colors.accent1, bold: true });


// ---------------------------------------------------------
// 11. Roadmap
// ---------------------------------------------------------
let slide11 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide11, "10. Future Expansion Roadmap");

slide11.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.5, w: 4.2, h: 1.5, fill: "1E293B", line: {color: colors.accent3} });
slide11.addText("Advanced Analytics Dashboard [HIGH]", { x: 0.7, y: 1.7, w: 3.8, h: 0.3, fontSize: 16, color: colors.text, bold: true });
slide11.addText("Deep-dive BI tools for management to analyze long-term trends, departmental performance, and budget utilization.", { x: 0.7, y: 2.1, w: 3.8, h: 0.8, fontSize: 14, color: colors.textMuted });

slide11.addShape(pres.ShapeType.rect, { x: 5.2, y: 1.5, w: 4.2, h: 1.5, fill: "1E293B", line: {color: colors.accent3} });
slide11.addText("Mobile App (iOS/Android) [HIGH]", { x: 5.4, y: 1.7, w: 3.8, h: 0.3, fontSize: 16, color: colors.text, bold: true });
slide11.addText("Native applications allowing employees to complete appraisals and managers to approve hikes on the go.", { x: 5.4, y: 2.1, w: 3.8, h: 0.8, fontSize: 14, color: colors.textMuted });

slide11.addShape(pres.ShapeType.rect, { x: 0.5, y: 3.3, w: 4.2, h: 1.5, fill: "1E293B", line: {color: "F59E0B"} });
slide11.addText("AI Performance Insights [MEDIUM]", { x: 0.7, y: 3.5, w: 3.8, h: 0.3, fontSize: 16, color: colors.text, bold: true });
slide11.addText("Automated AI-driven insights identifying flight risks, top talent retention strategies, and skill gap analysis.", { x: 0.7, y: 3.9, w: 3.8, h: 0.8, fontSize: 14, color: colors.textMuted });

slide11.addShape(pres.ShapeType.rect, { x: 5.2, y: 3.3, w: 4.2, h: 1.5, fill: "1E293B", line: {color: "F59E0B"} });
slide11.addText("HRMS & Payroll Integration [MEDIUM]", { x: 5.4, y: 3.5, w: 3.8, h: 0.3, fontSize: 16, color: colors.text, bold: true });
slide11.addText("Seamless data transfer of decided salary hikes and arrear payouts directly into existing financial systems.", { x: 5.4, y: 3.9, w: 3.8, h: 0.8, fontSize: 14, color: colors.textMuted });

// ---------------------------------------------------------
// 12. Tech Stack
// ---------------------------------------------------------
let slide12 = pres.addSlide({ masterName: "MASTER_SLIDE" });
addTitle(slide12, "11. Technology Stack & Architecture");

slide12.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.8, w: 2.7, h: 2, fill: "1E293B", line: {color: "61DAFB"} });
slide12.addText("Next.js 16 & React", { x: 0.6, y: 2.1, w: 2.5, h: 0.4, align: "center", fontSize: 18, color: colors.text, bold: true });
slide12.addText("Lightning-fast server-side rendering, seamless routing, and an incredibly responsive user interface.", { x: 0.6, y: 2.5, w: 2.5, h: 1, align: "center", fontSize: 13, color: colors.textMuted });

slide12.addShape(pres.ShapeType.rect, { x: 3.6, y: 1.8, w: 2.7, h: 2, fill: "1E293B", line: {color: "336791"} });
slide12.addText("PostgreSQL & Prisma", { x: 3.7, y: 2.1, w: 2.5, h: 0.4, align: "center", fontSize: 18, color: colors.text, bold: true });
slide12.addText("Robust, relational enterprise database managed through modern type-safe ORM for flawless data integrity.", { x: 3.7, y: 2.5, w: 2.5, h: 1, align: "center", fontSize: 13, color: colors.textMuted });

slide12.addShape(pres.ShapeType.rect, { x: 6.7, y: 1.8, w: 2.7, h: 2, fill: "1E293B", line: {color: "38B2AC"} });
slide12.addText("Tailwind CSS", { x: 6.8, y: 2.1, w: 2.5, h: 0.4, align: "center", fontSize: 18, color: colors.text, bold: true });
slide12.addText("A scalable, highly customized design system ensuring visual consistency across every module.", { x: 6.8, y: 2.5, w: 2.5, h: 1, align: "center", fontSize: 13, color: colors.textMuted });

slide12.addShape(pres.ShapeType.rect, { x: 0.5, y: 4.2, w: 8.9, h: 1, fill: "0F172A", line: {color: colors.accent1} });
slide12.addText("Enterprise Security & Deployment Ready", { x: 0.7, y: 4.4, w: 8.5, h: 0.3, fontSize: 16, color: colors.text, bold: true });
slide12.addText("Features NextAuth v5 passkey integration, server-side validations, and is 100% compatible with Vercel, AWS, or custom secure VPS deployments.", { x: 0.7, y: 4.7, w: 8.5, h: 0.4, fontSize: 14, color: colors.textMuted });

// ---------------------------------------------------------
// 13. Thank You
// ---------------------------------------------------------
let slide13 = pres.addSlide({ masterName: "MASTER_SLIDE" });
slide13.addText("Thank You", { x: "10%", y: "40%", w: "80%", h: 1, fontSize: 64, color: colors.primary, bold: true, align: "center" });
slide13.addText("Ready to revolutionize your human resources and operational workflows.", { x: "10%", y: "55%", w: "80%", h: 0.5, fontSize: 20, color: colors.textMuted, align: "center" });

pres.writeFile({ fileName: "Adarsh_Shipping_Complete_Showcase.pptx" }).then(fileName => {
  console.log(`Created presentation: ${fileName}`);
});
