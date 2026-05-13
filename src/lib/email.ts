type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
};

const DEV_INBOX = "no-reply@adarshshipping.in";

export async function sendEmail({ to, subject, html }: SendArgs) {
  const isDev = process.env.NODE_ENV !== "production";
  const originalTo = Array.isArray(to) ? to.join(", ") : to;
  const actualTo: string | string[] = isDev ? DEV_INBOX : to;
  const actualSubject = isDev ? `[DEV → ${originalTo}] ${subject}` : subject;

  if (isDev && process.env.EMAIL_ENABLED !== "true") {
    console.log("[email-dev] would send to:", actualTo);
    console.log("[email-dev] subject:", actualSubject);
    console.log(html);
    return { skipped: true, devRedirectedTo: actualTo };
  }
  console.log("[email]", { to: actualTo, subject: actualSubject });
  console.log(html);
  return { stubbed: true };
}

export function assignmentEmail(params: {
  reviewerName: string;
  employeeName: string;
  role: string;
  loginUrl: string;
}) {
  const { reviewerName, employeeName, role, loginUrl } = params;
  return {
    subject: `You have been assigned as ${role} reviewer for ${employeeName}`,
    html: `
      <p>Hi ${reviewerName},</p>
      <p>You have been assigned as the <b>${role}</b> reviewer for the appraisal of <b>${employeeName}</b>.</p>
      <p>Login to the appraisal portal to proceed:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p>— Appraisal Management System</p>
    `,
  };
}

export function cycleStartedEmail(params: {
  employeeName: string;
  loginUrl: string;
}) {
  const { employeeName, loginUrl } = params;
  return {
    subject: "Your appraisal cycle has started — best wishes!",
    html: `
      <p>Hi ${employeeName},</p>
      <p>Best wishes! Your appraisal cycle has begun. Please login and complete your self-assessment.</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
    `,
  };
}

export function appraisalDueEmail(params: {
  employeeName: string;
  cycleType: string;
  loginUrl: string;
}) {
  const { employeeName, cycleType, loginUrl } = params;
  return {
    subject: `${cycleType} appraisal month has arrived`,
    html: `
      <p>Hi ${employeeName},</p>
      <p>Your ${cycleType.toLowerCase()} appraisal month has arrived. Admin will assign reviewers soon.</p>
      <p>You can track the appraisal from your dashboard:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
    `,
  };
}

export function rateCompletedEmail(params: {
  otherReviewerName: string;
  employeeName: string;
  ratedByRole: string;
}) {
  const { otherReviewerName, employeeName, ratedByRole } = params;
  return {
    subject: `${ratedByRole} has rated ${employeeName}`,
    html: `<p>Hi ${otherReviewerName},</p><p>The <b>${ratedByRole}</b> reviewer has submitted their rating for <b>${employeeName}</b>.</p>`,
  };
}
