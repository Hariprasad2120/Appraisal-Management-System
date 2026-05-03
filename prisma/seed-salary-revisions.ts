import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Parse "YYYY-MM" string to first day of that month as UTC Date
function ym(s: string): Date {
  const [y, m] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

const rows: {
  empNo: number;
  status: string;
  grossAnnum: number;
  isCTCChangedByPerc: boolean;
  revisionPercentage: number | null;
  ctcAnnum: number;
  revisedCtc: number;
  effectiveFrom: string;
  payoutMonth: string;
  basic: number;
  hra: number;
  conveyance: number;
  transport: number;
  travelling: number;
  fixedAllowance: number;
  stipend: number;
}[] = [
  // emp 116 PURUSHOTHAMAN V — row 1
  { empNo: 116, status: "Approved", grossAnnum: 240000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 240000, revisedCtc: 360000, effectiveFrom: "2023-12", payoutMonth: "2023-12", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 4500, fixedAllowance: 3000, stipend: 0 },
  // emp 116 row 2
  { empNo: 116, status: "Approved", grossAnnum: 360000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 360000, revisedCtc: 528400, effectiveFrom: "2025-06", payoutMonth: "2026-02", basic: 20000, hra: 10000, conveyance: 3000, transport: 0, travelling: 4500, fixedAllowance: 6533, stipend: 0 },
  // emp 105 SUJATHA SURESH
  { empNo: 105, status: "Approved", grossAnnum: 96000, isCTCChangedByPerc: true, revisionPercentage: 50.0, ctcAnnum: 96000, revisedCtc: 144000, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 12000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 106 PATIT PABAN GOSWAMI
  { empNo: 106, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 192000, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 1000, stipend: 0 },
  // emp 110 SOUMYAJIT BASAK
  { empNo: 110, status: "Approved", grossAnnum: 108000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 108000, revisedCtc: 144000, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 12000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 118 SURYA K row 1
  { empNo: 118, status: "Approved", grossAnnum: 150000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 150000, revisedCtc: 156000, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 13000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 118 row 2
  { empNo: 118, status: "Approved", grossAnnum: 156000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 156000, revisedCtc: 180000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 118 row 3
  { empNo: 118, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 216000, effectiveFrom: "2024-04", payoutMonth: "2024-12", basic: 15000, hra: 3000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 118 row 4
  { empNo: 118, status: "Approved", grossAnnum: 216000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 216000, revisedCtc: 259200, effectiveFrom: "2025-07", payoutMonth: "2026-02", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 1600, stipend: 0 },
  // emp 118 row 5
  { empNo: 118, status: "Approved", grossAnnum: 259200, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 259200, revisedCtc: 264000, effectiveFrom: "2026-03", payoutMonth: "2026-03", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 2000, stipend: 0 },
  // emp 120 KARAN M row 1
  { empNo: 120, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 216000, effectiveFrom: "2023-05", payoutMonth: "2023-05", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 3000, stipend: 0 },
  // emp 120 row 2
  { empNo: 120, status: "Approved", grossAnnum: 216000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 216000, revisedCtc: 264000, effectiveFrom: "2024-04", payoutMonth: "2024-07", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 2000, fixedAllowance: 0, stipend: 0 },
  // emp 120 row 3
  { empNo: 120, status: "Approved", grossAnnum: 264000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 264000, revisedCtc: 303600, effectiveFrom: "2024-12", payoutMonth: "2025-04", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 2000, fixedAllowance: 800, stipend: 0 },
  // emp 120 row 4
  { empNo: 120, status: "Approved", grossAnnum: 303600, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 303600, revisedCtc: 408000, effectiveFrom: "2026-01", payoutMonth: "2026-01", basic: 17000, hra: 8500, conveyance: 0, transport: 0, travelling: 2000, fixedAllowance: 6500, stipend: 0 },
  // emp 129 KIRUBAKARI S
  { empNo: 129, status: "Approved", grossAnnum: 300000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 300000, revisedCtc: 360000, effectiveFrom: "2024-04", payoutMonth: "2024-09", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 2500, fixedAllowance: 5000, stipend: 0 },
  // emp 108 SATHIYA MOORHTY DHANASEKARAN row 1
  { empNo: 108, status: "Approved", grossAnnum: 222000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 222000, revisedCtc: 300000, effectiveFrom: "2023-04", payoutMonth: "2023-04", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 10000, stipend: 0 },
  // emp 108 row 2
  { empNo: 108, status: "Approved", grossAnnum: 300000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 300000, revisedCtc: 360000, effectiveFrom: "2024-04", payoutMonth: "2024-09", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 2500, fixedAllowance: 5000, stipend: 0 },
  // emp 108 row 3
  { empNo: 108, status: "Approved", grossAnnum: 360000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 360000, revisedCtc: 414000, effectiveFrom: "2025-09", payoutMonth: "2026-02", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 5000, fixedAllowance: 7000, stipend: 0 },
  // emp 108 row 4 — Pending
  { empNo: 108, status: "Pending", grossAnnum: 414000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 414000, revisedCtc: 444000, effectiveFrom: "2026-02", payoutMonth: "2026-04", basic: 15000, hra: 7500, conveyance: 2000, transport: 0, travelling: 5000, fixedAllowance: 7500, stipend: 0 },
  // emp 131 Priyadharshiny K
  { empNo: 131, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: true, revisionPercentage: 15.33, ctcAnnum: 180000, revisedCtc: 207594, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 2300, stipend: 0 },
  // emp 134 Alan Anthony Raj row 1
  { empNo: 134, status: "Approved", grossAnnum: 144000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 144000, revisedCtc: 156000, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 13000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 134 row 2
  { empNo: 134, status: "Approved", grossAnnum: 156000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 156000, revisedCtc: 168000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 14000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 107 SAMSON PRAKASAM
  { empNo: 107, status: "Approved", grossAnnum: 300000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 300000, revisedCtc: 360000, effectiveFrom: "2024-04", payoutMonth: "2024-09", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 2500, fixedAllowance: 5000, stipend: 0 },
  // emp 111 BALAKRISHNAN COMPLA
  { empNo: 111, status: "Approved", grossAnnum: 144000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 144000, revisedCtc: 180000, effectiveFrom: "2024-04", payoutMonth: "2024-09", basic: 12000, hra: 3000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 123 HEMANTH D
  { empNo: 123, status: "Approved", grossAnnum: 132000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 132000, revisedCtc: 138000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 11498, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 2, stipend: 0 },
  // emp 128 ARUNKUMAR B row 1
  { empNo: 128, status: "Approved", grossAnnum: 192000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 192000, revisedCtc: 204000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 15000, hra: 2000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 128 row 2
  { empNo: 128, status: "Approved", grossAnnum: 204000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 204000, revisedCtc: 240000, effectiveFrom: "2024-04", payoutMonth: "2024-09", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 128 row 3
  { empNo: 128, status: "Approved", grossAnnum: 240000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 240000, revisedCtc: 288000, effectiveFrom: "2025-05", payoutMonth: "2025-07", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 1500, fixedAllowance: 0, stipend: 0 },
  // emp 125 RAVI R row 1
  { empNo: 125, status: "Approved", grossAnnum: 84000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 84000, revisedCtc: 396000, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 18000, stipend: 0 },
  // emp 125 row 2
  { empNo: 125, status: "Approved", grossAnnum: 396000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 396000, revisedCtc: 396001, effectiveFrom: "2023-09", payoutMonth: "2023-09", basic: 14000, hra: 13000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 6000, stipend: 0 },
  // emp 125 row 3
  { empNo: 125, status: "Approved", grossAnnum: 396000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 396001, revisedCtc: 432000, effectiveFrom: "2024-12", payoutMonth: "2024-12", basic: 15000, hra: 10000, conveyance: 0, transport: 0, travelling: 6000, fixedAllowance: 5000, stipend: 0 },
  // emp 109 DINESH B row 1
  { empNo: 109, status: "Approved", grossAnnum: 135600, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 135600, revisedCtc: 195600, effectiveFrom: "2023-10", payoutMonth: "2023-10", basic: 11300, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 109 row 2
  { empNo: 109, status: "Approved", grossAnnum: 195600, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 195600, revisedCtc: 228000, effectiveFrom: "2024-04", payoutMonth: "2024-09", basic: 15000, hra: 4000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 109 row 3
  { empNo: 109, status: "Approved", grossAnnum: 228000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 228000, revisedCtc: 240000, effectiveFrom: "2024-09", payoutMonth: "2024-11", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 136 Kishore K row 1
  { empNo: 136, status: "Approved", grossAnnum: 144000, isCTCChangedByPerc: true, revisionPercentage: 8.33, ctcAnnum: 144000, revisedCtc: 155995, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 12000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 1000, stipend: 0 },
  // emp 136 row 2
  { empNo: 136, status: "Approved", grossAnnum: 156000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 155995, revisedCtc: 168000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 14000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 127 SHYAM NARAYAN YADAV row 1
  { empNo: 127, status: "Approved", grossAnnum: 60000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 60000, revisedCtc: 153000, effectiveFrom: "2023-06", payoutMonth: "2023-06", basic: 12750, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 127 row 2
  { empNo: 127, status: "Approved", grossAnnum: 153000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 153000, revisedCtc: 201000, effectiveFrom: "2025-02", payoutMonth: "2025-02", basic: 12750, hra: 3000, conveyance: 0, transport: 0, travelling: 1000, fixedAllowance: 0, stipend: 0 },
  // emp 138 DINESH SATYANARAYAN GIRI
  { empNo: 138, status: "Approved", grossAnnum: 72000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 72000, revisedCtc: 129900, effectiveFrom: "2023-08", payoutMonth: "2023-08", basic: 6000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 4825, stipend: 0 },
  // emp 139 BALA HARIHARAN
  { empNo: 139, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 192000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 15000, hra: 1000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 140 SRIVATHSAN R row 1
  { empNo: 140, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 192000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 15000, hra: 999, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 1, stipend: 0 },
  // emp 140 row 2
  { empNo: 140, status: "Approved", grossAnnum: 192000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 192000, revisedCtc: 242400, effectiveFrom: "2024-04", payoutMonth: "2024-07", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 200, fixedAllowance: 0, stipend: 0 },
  // emp 141 ABIJITH SAMPATHKUMAR — Rejected
  { empNo: 141, status: "Rejected", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 216000, effectiveFrom: "2023-12", payoutMonth: "2023-12", basic: 15000, hra: 3000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 141 — Approved
  { empNo: 141, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 192000, effectiveFrom: "2023-12", payoutMonth: "2023-12", basic: 15000, hra: 1000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 142 POORNIMA V row 1
  { empNo: 142, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 216000, effectiveFrom: "2023-12", payoutMonth: "2023-12", basic: 15000, hra: 3000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 142 row 2
  { empNo: 142, status: "Approved", grossAnnum: 216000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 216000, revisedCtc: 259200, effectiveFrom: "2024-06", payoutMonth: "2024-07", basic: 15000, hra: 6000, conveyance: 0, transport: 0, travelling: 600, fixedAllowance: 0, stipend: 0 },
  // emp 142 row 3
  { empNo: 142, status: "Approved", grossAnnum: 259200, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 259200, revisedCtc: 324000, effectiveFrom: "2025-06", payoutMonth: "2025-07", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 3000, fixedAllowance: 1500, stipend: 0 },
  // emp 144 NAJEEB AHMED row 1
  { empNo: 144, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 198000, effectiveFrom: "2023-12", payoutMonth: "2023-12", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 1500, stipend: 0 },
  // emp 144 row 2
  { empNo: 144, status: "Approved", grossAnnum: 198000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 198000, revisedCtc: 264000, effectiveFrom: "2024-06", payoutMonth: "2024-07", basic: 15000, hra: 6000, conveyance: 0, transport: 0, travelling: 1000, fixedAllowance: 0, stipend: 0 },
  // emp 148 MOHAMED RAHIL row 1
  { empNo: 148, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 192000, effectiveFrom: "2023-11", payoutMonth: "2023-11", basic: 15000, hra: 1000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 148 row 2
  { empNo: 148, status: "Approved", grossAnnum: 192000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 192000, revisedCtc: 240000, effectiveFrom: "2024-06", payoutMonth: "2024-07", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 149 HAFEEZ AHMED row 1
  { empNo: 149, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: true, revisionPercentage: 20.0, ctcAnnum: 180000, revisedCtc: 216000, effectiveFrom: "2024-05", payoutMonth: "2024-05", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 3000, fixedAllowance: 0, stipend: 0 },
  // emp 149 row 2
  { empNo: 149, status: "Approved", grossAnnum: 216000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 216000, revisedCtc: 259200, effectiveFrom: "2024-08", payoutMonth: "2025-04", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 1600, fixedAllowance: 0, stipend: 0 },
  // emp 152 AJHEENA BENAZIR
  { empNo: 152, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: true, revisionPercentage: 10.0, ctcAnnum: 180000, revisedCtc: 198000, effectiveFrom: "2024-05", payoutMonth: "2024-05", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 1500, fixedAllowance: 0, stipend: 0 },
  // emp 153 MEIYARASI M
  { empNo: 153, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: true, revisionPercentage: 10.0, ctcAnnum: 180000, revisedCtc: 198000, effectiveFrom: "2024-05", payoutMonth: "2024-05", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 1500, fixedAllowance: 0, stipend: 0 },
  // emp 156 MADHAVAN M
  { empNo: 156, status: "Approved", grossAnnum: 144000, isCTCChangedByPerc: true, revisionPercentage: 12.5, ctcAnnum: 144000, revisedCtc: 162000, effectiveFrom: "2024-05", payoutMonth: "2024-05", basic: 12000, hra: 0, conveyance: 0, transport: 0, travelling: 1500, fixedAllowance: 0, stipend: 0 },
  // emp 150 Nandha Gopal J
  { empNo: 150, status: "Approved", grossAnnum: 264000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 264000, revisedCtc: 272400, effectiveFrom: "2025-02", payoutMonth: "2025-02", basic: 15000, hra: 6000, conveyance: 0, transport: 0, travelling: 1000, fixedAllowance: 700, stipend: 0 },
  // emp 157 Hemanth D
  { empNo: 157, status: "Approved", grossAnnum: 138000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 138000, revisedCtc: 144000, effectiveFrom: "2024-09", payoutMonth: "2024-09", basic: 12000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 158 karthik S
  { empNo: 158, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 192000, effectiveFrom: "2025-02", payoutMonth: "2025-04", basic: 15000, hra: 1000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 160 Babyshalini K row 1
  { empNo: 160, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 204000, effectiveFrom: "2025-02", payoutMonth: "2025-04", basic: 15000, hra: 2000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 160 row 2
  { empNo: 160, status: "Approved", grossAnnum: 204000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 204000, revisedCtc: 244800, effectiveFrom: "2025-07", payoutMonth: "2026-02", basic: 15000, hra: 5000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 400, stipend: 0 },
  // emp 161 Dravida Selvan
  { empNo: 161, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 198000, effectiveFrom: "2025-07", payoutMonth: "2025-07", basic: 15000, hra: 1500, conveyance: 0, transport: 0, travelling: 600, fixedAllowance: 0, stipend: 0 },
  // emp 162 Balasubramanian Mani
  { empNo: 162, status: "Approved", grossAnnum: 156000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 156000, revisedCtc: 187200, effectiveFrom: "2025-03", payoutMonth: "2025-07", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 168 Saran S
  { empNo: 168, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 216000, effectiveFrom: "2025-05", payoutMonth: "2025-07", basic: 15000, hra: 3000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 170 Priyanka A
  { empNo: 170, status: "Approved", grossAnnum: 156000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 156000, revisedCtc: 174000, effectiveFrom: "2025-06", payoutMonth: "2025-10", basic: 14500, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 171 BALA HARIHARAN K
  { empNo: 171, status: "Approved", grossAnnum: 216000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 216000, revisedCtc: 279600, effectiveFrom: "2025-08", payoutMonth: "2026-02", basic: 15000, hra: 6000, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 2300, stipend: 0 },
  // emp 174 Hari haran V
  { empNo: 174, status: "Approved", grossAnnum: 180000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 180000, revisedCtc: 202500, effectiveFrom: "2025-06", payoutMonth: "2025-07", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 1875, fixedAllowance: 0, stipend: 0 },
  // emp 175 Maansi B row 1
  { empNo: 175, status: "Approved", grossAnnum: 156000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 156000, revisedCtc: 175500, effectiveFrom: "2025-06", payoutMonth: "2025-07", basic: 14625, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 0, stipend: 0 },
  // emp 175 row 2
  { empNo: 175, status: "Approved", grossAnnum: 175500, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 175500, revisedCtc: 223500, effectiveFrom: "2026-01", payoutMonth: "2026-02", basic: 15000, hra: 0, conveyance: 0, transport: 0, travelling: 0, fixedAllowance: 3625, stipend: 0 },
  // emp 187 Dineshan Pm
  { empNo: 187, status: "Approved", grossAnnum: 60000, isCTCChangedByPerc: false, revisionPercentage: null, ctcAnnum: 60000, revisedCtc: 486000, effectiveFrom: "2026-01", payoutMonth: "2026-01", basic: 15000, hra: 7500, conveyance: 0, transport: 0, travelling: 6000, fixedAllowance: 12000, stipend: 0 },
];

function calcRevisionPct(ctc: number, revised: number): number {
  if (ctc <= 0) return 0;
  return Math.round(((revised - ctc) / ctc) * 10000) / 100;
}

export async function seedSalaryRevisions(prisma: PrismaClient) {
  // Get all users with employeeNumber
  const users = await prisma.user.findMany({
    where: { employeeNumber: { not: null } },
    select: { id: true, employeeNumber: true },
  });
  const empMap = new Map(users.map((u) => [u.employeeNumber!, u.id]));

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const userId = empMap.get(row.empNo);
    if (!userId) {
      console.log(`⚠ Emp #${row.empNo} not found in DB — skipping`);
      skipped++;
      continue;
    }
    const revisionPercentage = row.revisionPercentage ?? calcRevisionPct(row.ctcAnnum, row.revisedCtc);
    await prisma.salaryRevision.create({
      data: {
        userId,
        status: row.status,
        grossAnnum: row.grossAnnum,
        isCTCChangedByPerc: row.isCTCChangedByPerc,
        revisionPercentage,
        ctcAnnum: row.ctcAnnum,
        revisedCtc: row.revisedCtc,
        effectiveFrom: ym(row.effectiveFrom),
        payoutMonth: ym(row.payoutMonth),
        basic: row.basic,
        hra: row.hra,
        conveyance: row.conveyance,
        transport: row.transport,
        travelling: row.travelling,
        fixedAllowance: row.fixedAllowance,
        stipend: row.stipend,
      },
    });
    inserted++;
  }
  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    await seedSalaryRevisions(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed-salary-revisions.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
