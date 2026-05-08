import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function exportAllData() {
  console.log('🚀 Starting Data Extraction for Migration...');

  try {
    // 1. Basic Employee & Organizational Details
    console.log('📦 Fetching Employee & Organizational Details...');
    const users = await prisma.user.findMany({
      include: {
        reportingManager: { select: { id: true, name: true, employeeNumber: true } },
        salary: true,
        salaryRevisions: { orderBy: { effectiveFrom: 'desc' } },
        kpiDepartment: true,
      }
    });

    // 2. Appraisal & Performance History
    console.log('📈 Fetching Appraisal & Performance History...');
    const appraisals = await prisma.appraisalCycle.findMany({
      include: {
        self: true,
        assignments: { include: { reviewer: { select: { id: true, name: true, employeeNumber: true } } } },
        ratings: { include: { reviewer: { select: { id: true, name: true, employeeNumber: true } } } },
        decision: { include: { slab: true, decidedBy: { select: { name: true } } } },
        moms: { include: { author: { select: { name: true } } } },
        ratingReviews: true,
        ratingDisagreements: true,
        arrear: true,
        reschedules: true,
      }
    });

    const incrementSlabs = await prisma.incrementSlab.findMany();

    // 3. KPI Data
    console.log('🎯 Fetching KPI Data...');
    const kpiReviews = await prisma.kpiReview.findMany({
      include: {
        items: { include: { approvedBy: { select: { name: true } } } },
        kpiTasks: { include: { events: { include: { actor: { select: { name: true } } } } } },
        user: { select: { name: true, employeeNumber: true } },
        department: true,
        template: true,
      }
    });

    const kpiTemplates = await prisma.kpiTemplate.findMany({
      include: { items: true, department: true }
    });

    const kpiDepartments = await prisma.kpiDepartment.findMany();

    const kpiCriteria = await prisma.kpiCriterion.findMany({
      include: { createdBy: { select: { name: true } }, approvedBy: { select: { name: true } } }
    });

    // 4. HR, Attendance, OT & LOP Records
    console.log('📅 Fetching Attendance, OT & LOP Records...');
    const attendanceLogs = await prisma.attendanceLog.findMany({
      include: { employee: { select: { name: true, employeeNumber: true } } }
    });
    const otRecords = await prisma.employeeOt.findMany({
      include: { employee: { select: { name: true, employeeNumber: true } }, approvedBy: { select: { name: true } } }
    });
    const lopRecords = await prisma.employeeLop.findMany({
      include: { employee: { select: { name: true, employeeNumber: true } } }
    });
    const holidays = await prisma.holiday.findMany();
    const workingCalendars = await prisma.workingCalendar.findMany();
    const otSettings = await prisma.otSettings.findFirst();

    // 5. Operational & System Data
    console.log('🛠️ Fetching Operational & System Data...');
    const tickets = await prisma.ticket.findMany({
      include: { 
        raisedBy: { select: { name: true } }, 
        assignee: { select: { name: true } },
        comments: { include: { author: { select: { name: true } } } } 
      }
    });
    const auditLogs = await prisma.auditLog.findMany({
      include: { actor: { select: { name: true } } }
    });
    const securityEvents = await prisma.securityEvent.findMany();
    const systemSettings = await prisma.systemSetting.findMany();
    const criteriaOverrides = await prisma.criteriaOverride.findMany({
      include: { updatedBy: { select: { name: true } } }
    });

    // Mapping and Formatting Data
    const migrationPackage = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      metadata: {
        totalEmployees: users.length,
        totalAppraisalCycles: appraisals.length,
        totalAttendanceRecords: attendanceLogs.length,
        totalKpiReviews: kpiReviews.length,
      },
      employeeModule: {
        employees: users.map(u => ({
          id: u.id,
          employeeNumber: u.employeeNumber,
          fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          personalEmail: u.personalEmail,
          phone: u.personalPhone,
          workPhone: u.workPhone,
          gender: u.gender,
          dob: u.dob,
          maritalStatus: u.maritalStatus,
          joiningDate: u.joiningDate,
          active: u.active,
          employmentStatus: u.employeeStatus,
          employmentType: u.employmentType,
          designation: u.designation,
          department: u.department,
          kpiDepartment: u.kpiDepartment?.name,
          location: u.location,
          reportingManager: u.reportingManager ? {
            id: u.reportingManagerId,
            name: u.reportingManager.name,
            employeeNumber: u.reportingManager.employeeNumber
          } : null,
          fatherName: u.fatherName,
          address: {
            present: u.presentAddress,
            permanent: u.permanentAddress
          },
          identity: {
            aadhaar: u.aadhaar,
            pan: u.pan,
            uan: u.uan
          },
          bankDetails: {
            bankName: u.bankName,
            accountNumber: u.bankAccount,
            ifsc: u.ifsc,
            accountType: u.accountType
          },
          payroll: {
            currentSalary: u.currentSalary ? Number(u.currentSalary) : 0,
            structure: u.salary ? {
              grossAnnum: Number(u.salary.grossAnnum),
              ctcAnnum: Number(u.salary.ctcAnnum),
              basic: Number(u.salary.basic),
              hra: Number(u.salary.hra),
              conveyance: Number(u.salary.conveyance),
              fixedAllowance: Number(u.salary.fixedAllowance),
              stipend: Number(u.salary.stipend)
            } : null,
            history: u.salaryRevisions.map(rev => ({
              effectiveFrom: rev.effectiveFrom,
              revisedCtc: Number(rev.revisedCtc),
              grossAnnum: Number(rev.grossAnnum),
              ctcAnnum: Number(rev.ctcAnnum),
              percentageChange: Number(rev.revisionPercentage),
              status: rev.status,
              payoutMonth: rev.payoutMonth
            }))
          },
          auth: {
            passwordHash: u.passwordHash,
            passkeyHash: u.passkeyHash,
            googleLoginAllowed: u.googleLoginAllowed,
            role: u.role,
            secondaryRole: u.secondaryRole
          }
        }))
      },
      appraisalModule: {
        slabs: incrementSlabs,
        cycles: appraisals.map(a => ({
          cycleId: a.id,
          employeeId: a.userId,
          type: a.type,
          startDate: a.startDate,
          status: a.status,
          selfAssessment: a.self ? {
            answers: a.self.answers,
            submittedAt: a.self.submittedAt,
            status: a.self.status
          } : null,
          assignments: a.assignments.map(ass => ({
            reviewer: ass.reviewer.name,
            empNo: ass.reviewer.employeeNumber,
            role: ass.role,
            availability: ass.availability
          })),
          ratings: a.ratings.map(r => ({
            reviewer: r.reviewer.name,
            empNo: r.reviewer.employeeNumber,
            role: r.role,
            averageScore: r.averageScore,
            comments: r.comments,
            submittedAt: r.submittedAt
          })),
          decision: a.decision ? {
            finalRating: a.decision.finalRating,
            finalAmount: Number(a.decision.finalAmount),
            suggestedAmount: Number(a.decision.suggestedAmount),
            comments: a.decision.comments,
            decidedBy: a.decision.decidedBy.name,
            decidedAt: a.decision.decidedAt
          } : null,
          moms: a.moms.map(m => ({
            role: m.role,
            content: m.content,
            author: m.author.name,
            createdAt: m.createdAt
          })),
          ratingReviews: a.ratingReviews,
          disagreements: a.ratingDisagreements,
          arrears: a.arrear,
          reschedules: a.reschedules
        }))
      },
      kpiModule: {
        departments: kpiDepartments,
        templates: kpiTemplates,
        criteria: kpiCriteria,
        reviews: kpiReviews.map(rev => ({
          id: rev.id,
          employeeId: rev.userId,
          employeeName: rev.user.name,
          employeeNumber: rev.user.employeeNumber,
          department: rev.department.name,
          template: rev.template.name,
          month: rev.month,
          status: rev.status,
          pointScore: rev.monthlyPointScore,
          averageRating: rev.averageRating,
          performanceCategory: rev.performanceCategory,
          overallRemarks: rev.overallRemarks,
          items: rev.items,
          tasks: rev.kpiTasks
        }))
      },
      hrAttendanceModule: {
        otSettings: otSettings,
        logs: attendanceLogs.map(l => ({
          employeeId: l.employeeId,
          employeeName: l.employee.name,
          empNo: l.employee.employeeNumber,
          date: l.attendanceDate,
          checkIn: l.checkIn,
          checkOut: l.checkOut,
          totalHours: Number(l.totalHours || 0),
          status: l.approvalStatus,
          remarks: l.remarks
        })),
        otRecords: otRecords.map(ot => ({
          employeeId: ot.employeeId,
          employeeName: ot.employee.name,
          empNo: ot.employee.employeeNumber,
          date: ot.attendanceDate,
          hoursWorked: Number(ot.hoursWorked),
          otHours: Number(ot.otHours),
          otAmount: Number(ot.otAmount),
          compOffDays: Number(ot.compOffDays),
          status: ot.approvalStatus,
          approvedBy: ot.approvedBy?.name,
          approvedAt: ot.approvedAt
        })),
        lopRecords: lopRecords.map(lop => ({
          employeeId: lop.employeeId,
          employeeName: lop.employee.name,
          empNo: lop.employee.employeeNumber,
          month: lop.payrollMonth,
          lopDays: Number(lop.lopDays),
          remarks: lop.remarks
        })),
        holidays: holidays,
        shiftConfig: workingCalendars
      },
      systemModule: {
        tickets: tickets.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          category: t.category,
          raisedBy: t.raisedBy.name,
          assignee: t.assignee?.name,
          createdAt: t.createdAt,
          comments: t.comments.map(c => ({
            author: c.author.name,
            message: c.message,
            createdAt: c.createdAt
          }))
        })),
        auditLogs: auditLogs.slice(-5000).map(l => ({
          actor: l.actor.name,
          action: l.action,
          before: l.before,
          after: l.after,
          createdAt: l.createdAt
        })),
        securityEvents: securityEvents.slice(-2000),
        settings: systemSettings,
        criteriaOverrides: criteriaOverrides
      }
    };

    // Save to file
    const outputPath = path.join(process.cwd(), 'migration_package_full.json');
    fs.writeFileSync(outputPath, JSON.stringify(migrationPackage, null, 2));
    
    console.log(`✅ Extraction Complete! Data saved to: ${outputPath}`);
    console.log(`📊 Summary: ${users.length} Employees, ${appraisals.length} Appraisals, ${attendanceLogs.length} Attendance Records.`);

  } catch (error) {
    console.error('❌ Extraction Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllData();
