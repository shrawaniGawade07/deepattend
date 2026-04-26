import { NextRequest, NextResponse } from 'next/server';

interface StudentPayload {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  department?: string;
  semester?: string;
  guardianEmail?: string;
}

interface RecordPayload {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent';
  method: 'face' | 'manual';
  confidence: number;
  timestamp: number;
}

function buildEmailHtml(student: StudentPayload, allRecords: RecordPayload[]): string {
  const studentRecords = allRecords.filter(r => r.studentId === student.id);
  const uniqueDates    = new Set(allRecords.map(r => r.date));
  const totalClasses   = uniqueDates.size;
  const presentClasses = studentRecords.filter(r => r.status === 'present').length;
  const absentClasses  = totalClasses - presentClasses;
  const pct            = totalClasses === 0 ? 100 : Math.round((presentClasses / totalClasses) * 100);
  const onTrack        = pct >= 75;

  const C = {
    main:   onTrack ? '#22c55e' : '#ef4444',
    bg:     onTrack ? 'rgba(34,197,94,0.06)'  : 'rgba(239,68,68,0.06)',
    border: onTrack ? 'rgba(34,197,94,0.18)'  : 'rgba(239,68,68,0.18)',
    badge:  onTrack ? 'rgba(34,197,94,0.12)'  : 'rgba(239,68,68,0.12)',
    badgeBorder: onTrack ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
  };

  const recentRecords = [...studentRecords]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 15);

  const recordRows = recentRecords.map((r, i) => {
    const isPresent = r.status === 'present';
    const bg        = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)';
    return `
      <tr style="background:${bg};border-top:1px solid rgba(255,255,255,0.04);">
        <td style="padding:9px 14px;color:#a1a1aa;font-size:12px;font-family:monospace;">${r.date}</td>
        <td style="padding:9px 14px;">
          <span style="background:${isPresent ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};color:${isPresent ? '#22c55e' : '#ef4444'};font-size:11px;font-weight:600;padding:2px 10px;border-radius:999px;border:1px solid ${isPresent ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'};">
            ${isPresent ? '● Present' : '○ Absent'}
          </span>
        </td>
        <td style="padding:9px 14px;color:#52525b;font-size:11px;text-transform:capitalize;">${r.method}</td>
        <td style="padding:9px 14px;color:#52525b;font-size:11px;">${r.confidence}%</td>
      </tr>`;
  }).join('');

  const generatedOn = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const pctWidth = Math.min(pct, 100);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Attendance Report — ${student.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- Logo pill -->
        <tr><td align="center" style="padding-bottom:22px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 18px;">
              <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:-0.2px;">⬛ DeepAttend</span>
            </td></tr>
          </table>
        </td></tr>

        <!-- Main card -->
        <tr><td style="background:#111113;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">

          <!-- Card header -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:linear-gradient(135deg,#161618 0%,#111113 100%);padding:28px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="color:#52525b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;margin:0 0 12px;">Attendance Report</p>
              <h1 style="color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.6px;margin:0 0 6px;line-height:1.2;">${student.name}</h1>
              <p style="color:#71717a;font-size:13px;margin:0 0 8px;">${student.rollNumber}${student.department ? ' &middot; ' + student.department : ''}${student.semester ? ' &middot; Sem ' + student.semester : ''}</p>
              <p style="color:#3f3f46;font-size:11px;margin:0;">Generated on ${generatedOn}</p>
            </td></tr>
          </table>

          <!-- Big percentage block -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:24px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border:1px solid ${C.border};border-radius:12px;">
                <tr><td style="padding:28px 24px;" align="center">
                  <p style="color:${C.main};font-size:64px;font-weight:800;letter-spacing:-4px;margin:0;line-height:1;">${pct}%</p>
                  <p style="color:#71717a;font-size:13px;margin:10px 0 10px;">Overall Attendance</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr><td style="background:${C.badge};border:1px solid ${C.badgeBorder};border-radius:999px;padding:5px 16px;">
                      <span style="color:${C.main};font-size:11px;font-weight:600;">${onTrack ? '✓ On Track' : '⚠ Below 75% Threshold — Action Required'}</span>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <!-- Stats grid -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32%" style="padding-right:6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:10px;">
                      <tr><td style="padding:18px 12px;" align="center">
                        <p style="color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-1px;margin:0;">${totalClasses}</p>
                        <p style="color:#52525b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:5px 0 0;">Total</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="32%" style="padding:0 3px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:10px;">
                      <tr><td style="padding:18px 12px;" align="center">
                        <p style="color:#22c55e;font-size:30px;font-weight:700;letter-spacing:-1px;margin:0;">${presentClasses}</p>
                        <p style="color:#52525b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:5px 0 0;">Present</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="32%" style="padding-left:6px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;">
                      <tr><td style="padding:18px 12px;" align="center">
                        <p style="color:#ef4444;font-size:30px;font-weight:700;letter-spacing:-1px;margin:0;">${absentClasses}</p>
                        <p style="color:#52525b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:5px 0 0;">Absent</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Progress bar -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;">
                <tr>
                  <td width="${pctWidth}%" style="height:7px;background:${C.main};border-radius:999px;line-height:7px;font-size:0;">&nbsp;</td>
                  <td style="height:7px;line-height:7px;font-size:0;">&nbsp;</td>
                </tr>
              </table>
              <p style="color:#3f3f46;font-size:11px;margin:7px 0 0;text-align:right;">${presentClasses} of ${totalClasses} classes attended</p>
            </td></tr>
          </table>

          ${recentRecords.length > 0 ? `
          <!-- Attendance log table -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 32px 28px;">
              <p style="color:#52525b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Recent Attendance Log</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.07);border-radius:10px;overflow:hidden;">
                <tr style="background:rgba(0,0,0,0.35);">
                  <th style="padding:9px 14px;text-align:left;color:#3f3f46;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Date</th>
                  <th style="padding:9px 14px;text-align:left;color:#3f3f46;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Status</th>
                  <th style="padding:9px 14px;text-align:left;color:#3f3f46;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Method</th>
                  <th style="padding:9px 14px;text-align:left;color:#3f3f46;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Conf.</th>
                </tr>
                ${recordRows}
              </table>
            </td></tr>
          </table>
          ` : ''}

          <!-- Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.05);padding:20px 32px;" align="center">
              <p style="color:#3f3f46;font-size:11px;margin:0;">This is an automated report from <strong style="color:#52525b;">DeepAttend</strong></p>
              <p style="color:#3f3f46;font-size:11px;margin:5px 0 0;">Keystone School of Engineering &middot; Dept. of Computer Engineering &middot; AY 2025–26</p>
              <p style="color:#27272a;font-size:10px;margin:8px 0 0;">Developed by Shrawani Gawade &middot; TE Computer Engineering</p>
            </td></tr>
          </table>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendOne(
  student: StudentPayload,
  records: RecordPayload[],
  apiKey: string,
  from: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!student.email) return { ok: false, reason: 'No email address' };

  const pct = (() => {
    const total   = new Set(records.map(r => r.date)).size;
    const present = records.filter(r => r.studentId === student.id && r.status === 'present').length;
    return total === 0 ? 100 : Math.round((present / total) * 100);
  })();

  const to: string[] = [student.email];
  if (student.guardianEmail && student.guardianEmail !== student.email) {
    to.push(student.guardianEmail);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Attendance Report — ${student.name} · ${pct}% ${pct >= 75 ? '✓' : '⚠'}`,
      html: buildEmailHtml(student, records),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, reason: body };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY is not configured on the server.' },
      { status: 500 },
    );
  }

  const from    = process.env.RESEND_FROM ?? 'DeepAttend <onboarding@resend.dev>';
  const payload = await req.json();
  const { mode, student, students, records } = payload as {
    mode: 'single' | 'all';
    student?: StudentPayload;
    students?: StudentPayload[];
    records: RecordPayload[];
  };

  if (mode === 'single') {
    if (!student) return NextResponse.json({ error: 'Missing student' }, { status: 400 });
    const result = await sendOne(student, records, apiKey, from);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 500 });
    return NextResponse.json({ sent: 1 });
  }

  if (mode === 'all') {
    if (!students?.length) return NextResponse.json({ error: 'No students provided' }, { status: 400 });
    let sent  = 0;
    const errors: string[] = [];
    for (const s of students) {
      const result = await sendOne(s, records, apiKey, from);
      if (result.ok) sent++;
      else errors.push(`${s.name}: ${result.reason}`);
      await new Promise(r => setTimeout(r, 120));
    }
    return NextResponse.json({ sent, failed: errors.length, errors });
  }

  return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
}
