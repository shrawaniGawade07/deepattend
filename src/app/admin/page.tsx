'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  fetchStudents, addStudent as dbAddStudent, deleteStudent as dbDeleteStudent, updateStudent as dbUpdateStudent,
  fetchRecords, addRecord as dbAddRecord, deleteRecord as dbDeleteRecord, clearAllRecords, clearAllStudents,
  getAdminPassword, saveAdminPassword,
  todayKey, uid, getStats,
  ATTENDANCE_THRESHOLD,
} from '@/lib/db';
import { extractFaceTemplate } from '@/lib/face';
import type { Student, AttendanceRecord } from '@/lib/types';

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Toast hook ────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: '', type: '', show: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((msg: string, type = '') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, type, show: true });
    timer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }, []);
  return { toast, showToast: show };
}

// ── Toast component ───────────────────────────────────────────
function Toast({ msg, type, show }: { msg: string; type: string; show: boolean }) {
  return (
    <div className={`fixed bottom-6 left-1/2 z-[999] max-w-sm -translate-x-1/2 rounded-xl border px-5 py-3 text-center text-sm font-medium shadow-xl backdrop-blur-xl transition-all duration-300 ${
      show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
    } ${
      type === 'success' ? 'border-green-500/40 bg-zinc-950/98 text-green-300' :
      type === 'error'   ? 'border-red-500/40 bg-zinc-950/98 text-red-300'     :
      'border-white/10 bg-zinc-950/98 text-zinc-200'
    }`}>
      {msg}
    </div>
  );
}

// ── Stat card with icon ───────────────────────────────────────
function StatCard({ label, value, accent, icon }: {
  label: string; value: number | string;
  accent?: 'white' | 'amber' | 'green'; icon: React.ReactNode;
}) {
  const colorMap: Record<string, { wrap: string, ico: string, val: string }> = {
    white: { wrap: 'border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent', ico: 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]', val: 'text-white' },
    amber:  { wrap: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent',  ico: 'bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]',  val: 'text-amber-100'  },
    green:  { wrap: 'border-green-500/20 bg-gradient-to-br from-green-500/[0.08] to-transparent',  ico: 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]',  val: 'text-green-100'  },
  };
  const C = colorMap[accent ?? ''] ?? { wrap: 'border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent', ico: 'bg-white/[0.08] text-zinc-400', val: 'text-white' };
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 transition-transform hover:-translate-y-1 ${C.wrap}`}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.02] blur-xl pointer-events-none" />
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${C.ico}`}>{icon}</div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
      <strong className={`mt-1 block text-4xl font-bold tracking-tight ${C.val}`}>{value}</strong>
    </div>
  );
}

const IC = {
  users: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  scan:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>,
  check: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  alert: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ── Login screen ─────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw]           = useState('');
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw) return;
    setLoading(true);
    await delay(380);
    if (pw === getAdminPassword()) {
      sessionStorage.setItem('da-session', '1');
      onLogin();
    } else {
      setErr('Incorrect password.');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 p-6 overflow-hidden">
      {/* Background glows + grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[400px] -translate-x-1/2 translate-y-1/2 rounded-full bg-white/[0.012] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-white/[0.008] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Institution pill */}
        <div className="mb-7 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10.5px] font-semibold uppercase tracking-widest text-zinc-500">
              Keystone School of Engineering
            </span>
          </div>
        </div>

        {/* Logo + heading */}
        <div className="mb-8 text-center">
          <img src="/logo_full.webp" alt="DeepAttend"
            className="mx-auto mb-5 h-14 w-auto drop-shadow-[0_0_48px_rgba(255,255,255,0.18)]" />
          <h1 className="text-[26px] font-bold tracking-tight text-white">Admin Portal</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Dept. of Computer Engineering&nbsp;·&nbsp;AY 2025–26</p>
        </div>

        {/* Login card */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          {/* Card header */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-6 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-zinc-300">Secure Sign In</p>
              <p className="text-[10.5px] text-zinc-600">Enter your admin password to continue</p>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-5 p-6">
            <div>
              <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-widest text-zinc-600">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw} autoFocus autoComplete="current-password"
                  onChange={e => { setPw(e.target.value); setErr(''); }}
                  placeholder="Enter password"
                  className={`w-full rounded-xl border bg-white/[0.05] px-4 py-3 pr-11 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition ${
                    err ? 'border-red-500/50 focus:border-red-500/60' : 'border-white/[0.08] focus:border-white/25'
                  }`}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-700 transition hover:text-zinc-400">
                  {showPw
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {err && (
                <div className="mt-2 flex items-center gap-1.5">
                  <svg className="shrink-0 text-red-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-xs text-red-400">{err}</p>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || !pw}
              className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black shadow-[0_2px_20px_rgba(255,255,255,0.12)] transition hover:bg-zinc-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
              {loading
                ? <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Verifying...</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Sign In</>
              }
            </button>
          </form>

        </div>

        {/* Creator credit + GitHub */}
        <div className="mt-7 flex flex-col items-center gap-2.5">
          <p className="text-[11px] text-zinc-600">
            Developed by{' '}
            <span className="font-semibold text-zinc-400">Shrawani Gawade</span>
            {' '}·{' '}TE Computer Engineering
          </p>
          <a
            href="https://github.com/shrawaniGawade07"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium text-zinc-500 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            shrawaniGawade07
          </a>
          <p className="text-[10px] text-zinc-800">Keystone School of Engineering · 2025–26</p>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard tab ─────────────────────────────────────────────
function DashboardTab({ students, records }: { students: Student[]; records: AttendanceRecord[] }) {
  const today        = todayKey();
  const presentToday = new Set(records.filter(r => r.date === today && r.status === 'present').map(r => r.studentId));
  const riskCount    = students.filter(s => getStats(s.id, records).percentage < ATTENDANCE_THRESHOLD).length;
  const recentRecs   = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  const riskStudents = students.filter(s => getStats(s.id, records).percentage < ATTENDANCE_THRESHOLD);
  const enrolled     = students.filter(s => Array.isArray(s.faceTemplate)).length;

  const EmptyState = ({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent text-zinc-600 shadow-inner">{icon}</div>
      <div><p className="text-[15px] font-semibold text-zinc-300">{text}</p><p className="mt-1 text-xs text-zinc-500">{sub}</p></div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-4 xl:grid-cols-2 sm:grid-cols-1">
        <StatCard label="Total Students" value={students.length} icon={IC.users} />
        <StatCard label="Faces Enrolled" value={enrolled}        icon={IC.scan} />
        <StatCard label="Present Today"  value={presentToday.size} accent="white" icon={IC.check} />
        <StatCard label="Below 75%"      value={riskCount}        accent="amber"  icon={IC.alert} />
      </div>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-1">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/50 shadow-lg">
          <div className="border-b border-white/[0.07] px-4 py-3.5">
            <h3 className="text-sm font-semibold">Recent Activity</h3>
            <p className="mt-0.5 text-[11px] text-zinc-600">Latest attendance records</p>
          </div>
          <div className="flex flex-col gap-1 p-2.5">
            {recentRecs.length === 0
              ? <EmptyState icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} text="No records yet" sub="Attendance will appear here once marked" />
              : recentRecs.map(r => {
                  const s = students.find(st => st.id === r.studentId);
                  const t = new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  const ini = s?.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
                  return (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 transition hover:bg-white/[0.04]">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-zinc-400">{ini}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-200">{s?.name ?? 'Unknown'}</p>
                        <p className="text-[11px] text-zinc-600">{r.date} · {t}</p>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${r.method === 'face' ? 'bg-white/10 text-zinc-400' : 'bg-white/[0.06] text-zinc-500'}`}>{r.method}</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/50 shadow-lg">
          <div className="border-b border-white/[0.07] px-4 py-3.5">
            <h3 className="text-sm font-semibold">Attendance Risk</h3>
            <p className="mt-0.5 text-[11px] text-zinc-600">Students below {ATTENDANCE_THRESHOLD}% threshold</p>
          </div>
          <div className="flex flex-col gap-1.5 p-2.5">
            {riskStudents.length === 0
              ? <EmptyState icon={IC.check} text="All students are on track" sub={`Everyone is above ${ATTENDANCE_THRESHOLD}%`} />
              : riskStudents.map(s => {
                  const stats = getStats(s.id, records);
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 rounded-[9px] border border-red-500/12 bg-red-500/[0.04] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-200">{s.name}</p>
                        <p className="text-[11px] text-zinc-600">{s.rollNumber} · {s.department || 'N/A'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-400">{stats.percentage}%</span>
                        <p className="mt-0.5 text-[10px] text-zinc-700">{stats.presentClasses}/{stats.totalClasses}</p>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Students tab ──────────────────────────────────────────────
function StudentsTab({
  students, records, onUpdate, onRecordsUpdate, showToast,
}: {
  students: Student[];
  records: AttendanceRecord[];
  onUpdate: (s: Student[]) => void;
  onRecordsUpdate: (r: AttendanceRecord[]) => void;
  showToast: (m: string, t?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const empty = { name: '', email: '', rollNumber: '', department: '', semester: '', guardianEmail: '', phone: '' };
  const [form, setForm]   = useState(empty);

  const [enrollModal, setEnrollModal] = useState<{show: boolean, studentId: string, name: string}>({show: false, studentId: '', name: ''});
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function openEnrollModal(studentId: string, name: string) {
    setEnrollModal({ show: true, studentId, name });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { showToast('Camera access denied.', 'error'); }
  }

  function closeEnrollModal() {
    setEnrollModal({ show: false, studentId: '', name: '' });
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  async function captureFace() {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const template = await extractFaceTemplate(videoRef.current);
      await dbUpdateStudent(enrollModal.studentId, { faceTemplate: template });
      const updated = students.map(s => s.id === enrollModal.studentId ? { ...s, faceTemplate: template } : s);
      onUpdate(updated);
      showToast(`Face enrolled for ${enrollModal.name}.`, 'success');
      closeEnrollModal();
    } catch { showToast('Face capture failed. Ensure face is visible.', 'error'); }
    setIsCapturing(false);
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.rollNumber.trim()) {
      showToast('Name, email, and roll number are required.', 'error'); return;
    }
    const s: Student = { id: uid('stu'), ...form };
    await dbAddStudent(s);
    onUpdate([s, ...students]);
    setForm(empty);
    showToast(`${s.name} added.`, 'success');
  }

  async function removeStudent(id: string) {
    const s = students.find(x => x.id === id);
    await dbDeleteStudent(id);
    onUpdate(students.filter(x => x.id !== id));
    showToast(`${s?.name ?? 'Student'} removed.`);
  }

  async function markManual(studentId: string) {
    const date   = todayKey();
    const newRec: AttendanceRecord = { id: uid('att'), studentId, date, status: 'present', method: 'manual', confidence: 100, timestamp: Date.now() };
    await dbAddRecord(newRec);
    onRecordsUpdate([newRec, ...records.filter(r => !(r.studentId === studentId && r.date === date))]);
    const s = students.find(x => x.id === studentId);
    showToast(`${s?.name} marked present`, 'success');
  }

  const filtered = query.trim()
    ? students.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(query.toLowerCase()) ||
        (s.department || '').toLowerCase().includes(query.toLowerCase()))
    : students;

  const F = (id: keyof typeof empty, label: string, req = false, type = 'text', ph = '', wide = false) => (
    <div className={wide ? 'col-span-2 sm:col-span-1' : ''}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
        {label}{req && <span className="ml-0.5 text-zinc-200">*</span>}
      </label>
      <input type={type} value={form[id]} placeholder={ph}
        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        className="w-full rounded-[10px] border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition focus:border-white/30" />
    </div>
  );

  return (
    <div className="grid grid-cols-[320px_1fr] gap-5 items-start lg:grid-cols-1">
      {/* Add form */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div className="border-b border-white/[0.07] px-4 py-3.5">
          <h3 className="text-sm font-semibold">Add New Student</h3>
          <p className="mt-0.5 text-[11px] text-zinc-600">Fields marked <span className="text-zinc-200">*</span> are required</p>
        </div>
        <form onSubmit={handleAddStudent} className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            {F('name',         'Full Name',      true,  'text',  'Aarav Sharma')}
            {F('email',        'Email',          true,  'email', 'student@example.com')}
            {F('rollNumber',   'Roll Number',    true,  'text',  'CS-2024-001')}
            {F('department',   'Department',     false, 'text',  'Computer Science')}
            {F('semester',     'Semester',       false, 'text',  '5')}
            {F('guardianEmail','Guardian Email', false, 'email', 'guardian@example.com')}
            {F('phone',        'Phone',          false, 'tel',   '+91 98765 00000', true)}
          </div>
          <button type="submit" className="mt-4 w-full rounded-[10px] bg-white py-2.5 text-sm font-semibold text-black shadow-[0_2px_14px_rgba(255,255,255,0.08)] transition hover:bg-zinc-200">
            Add Student
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Student Records</h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">{students.length}</span>
          </div>
          <input type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search name, roll, dept..."
            className="w-52 rounded-[9px] border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 outline-none focus:border-white/30" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-black/20">
                {['Student', 'Contact', 'Attendance', 'Face', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-widest text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">
                  {query ? 'No students match your search.' : 'No students yet — add one using the form.'}
                </td></tr>
              ) : filtered.map(s => {
                const stats = getStats(s.id, records);
                const risk  = stats.percentage < ATTENDANCE_THRESHOLD;
                return (
                  <tr key={s.id} className="transition hover:bg-white/[0.025]">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-zinc-200">{s.name}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{s.rollNumber}{s.department ? ` · ${s.department}` : ''}{s.semester ? ` · Sem ${s.semester}` : ''}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="truncate max-w-[160px] text-sm text-zinc-300">{s.email}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{s.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${risk ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{stats.percentage}%</span>
                      <div className="mt-1.5 h-1 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${stats.percentage}%`, background: risk ? '#ef4444' : '#22c55e' }} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-600">{stats.presentClasses}/{stats.totalClasses} classes</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-semibold ${s.faceTemplate ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.06] text-zinc-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.faceTemplate ? 'bg-green-400' : 'bg-zinc-600'}`} />
                        {s.faceTemplate ? 'Enrolled' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => markManual(s.id)}
                          className="rounded-[8px] border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.1]">
                          Mark Present
                        </button>
                        <button onClick={() => openEnrollModal(s.id, s.name)}
                          className={`rounded-[8px] border px-2.5 py-1 text-xs font-semibold transition ${s.faceTemplate ? 'border-white/[0.08] bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]' : 'border-white/25 bg-white/10 text-zinc-400 hover:bg-white/20'}`}>
                          {s.faceTemplate ? 'Re-enroll' : 'Enroll Face'}
                        </button>
                        <button onClick={() => removeStudent(s.id)}
                          className="rounded-[8px] border border-red-500/25 bg-red-500/[0.07] px-2.5 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/15">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {enrollModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Enroll Face</h3>
                <p className="text-xs text-zinc-400">{enrollModal.name}</p>
              </div>
              <button onClick={closeEnrollModal} className="text-zinc-500 hover:text-white transition">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" style={{transform: 'scaleX(-1)'}} />
                {isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 bg-white text-black text-white px-4 py-2 rounded-full text-sm font-semibold">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Capturing...
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-[25%] top-[10%] right-[25%] bottom-[10%] border-2 border-dashed border-white/30 rounded-full" />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-zinc-500">Position the student&apos;s face inside the oval and click Capture.</p>
              <div className="mt-5 flex gap-3">
                <button onClick={closeEnrollModal} className="flex-1 rounded-[10px] border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10">
                  Cancel
                </button>
                <button onClick={captureFace} disabled={isCapturing} className="flex-1 rounded-[10px] bg-white py-2.5 text-sm font-semibold text-black shadow-[0_2px_14px_rgba(255,255,255,0.08)] transition hover:bg-zinc-200 disabled:opacity-50">
                  Capture Face
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Attendance tab ────────────────────────────────────────────
function AttendanceTab({
  students, records, onRecordsUpdate, showToast,
}: {
  students: Student[];
  records: AttendanceRecord[];
  onRecordsUpdate: (r: AttendanceRecord[]) => void;
  showToast: (m: string, t?: string) => void;
}) {
  const [filterDate, setFilterDate] = useState('');
  const [filterStu,  setFilterStu]  = useState('');

  async function deleteRecord(id: string) {
    await dbDeleteRecord(id);
    const updated = records.filter(r => r.id !== id);
    onRecordsUpdate(updated);
    showToast('Record deleted.');
  }

  const filtered = records.filter(r => {
    if (filterDate && r.date !== filterDate) return false;
    if (filterStu  && r.studentId !== filterStu) return false;
    return true;
  }).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Attendance Log</h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">{filtered.length} records</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="rounded-[9px] border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/30" />
          <select value={filterStu} onChange={e => setFilterStu(e.target.value)}
            className="rounded-[9px] border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-white/30">
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {(filterDate || filterStu) && (
            <button onClick={() => { setFilterDate(''); setFilterStu(''); }}
              className="rounded-[9px] border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.1]">
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-black/20">
              {['Student', 'Date', 'Time', 'Method', 'Confidence', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-widest text-zinc-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600">
                {filterDate || filterStu ? 'No records match the selected filters.' : 'No attendance records yet.'}
              </td></tr>
            ) : filtered.map(r => {
              const s = students.find(x => x.id === r.studentId);
              const t = new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              return (
                <tr key={r.id} className="transition hover:bg-white/[0.025]">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-sm text-zinc-200">{s?.name ?? 'Unknown'}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{s?.rollNumber ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-zinc-400">{r.date}</td>
                  <td className="px-4 py-3.5 text-sm text-zinc-500">{t}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${r.method === 'face' ? 'bg-white/10 text-zinc-400' : 'bg-white/[0.06] text-zinc-400'}`}>{r.method}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-14 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-white text-black" style={{ width: `${r.confidence}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500">{r.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => deleteRecord(r.id)}
                      className="rounded-[8px] border border-red-500/25 bg-red-500/[0.07] px-2.5 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/15">
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Settings tab ──────────────────────────────────────────────
function SettingsTab({
  students, records, showToast, onLogout,
}: {
  students: Student[];
  records: AttendanceRecord[];
  showToast: (m: string, t?: string) => void;
  onLogout: () => void;
}) {
  const [cur, setCur]   = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');

  function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (cur !== getAdminPassword()) { showToast('Current password is incorrect.', 'error'); return; }
    if (next.length < 6)            { showToast('New password must be at least 6 characters.', 'error'); return; }
    if (next !== conf)              { showToast('Passwords do not match.', 'error'); return; }
    saveAdminPassword(next);
    setCur(''); setNext(''); setConf('');
    showToast('Password updated successfully.', 'success');
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ students, records }, null, 2)], { type: 'application/json' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `deepattend-backup-${todayKey()}.json`;
    a.click();
    showToast('Data exported.', 'success');
  }

  async function clearAttendance() {
    if (!confirm('Delete ALL attendance records? This cannot be undone.')) return;
    await clearAllRecords();
    showToast('All attendance records cleared.');
    window.location.reload();
  }

  async function clearAll() {
    if (!confirm('Delete ALL students and attendance data? This cannot be undone.')) return;
    await clearAllRecords();
    await clearAllStudents();
    localStorage.clear();
    onLogout();
  }

  const PwField = ({ label, val, set }: { label: string; val: string; set: (v: string) => void }) => (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">{label}</label>
      <input type="password" value={val} onChange={e => set(e.target.value)} placeholder="••••••••"
        className="w-full rounded-[10px] border border-white/[0.08] bg-white/[0.06] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-700 outline-none transition focus:border-white/40" />
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-5 items-start lg:grid-cols-1">
      {/* Password */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <div className="border-b border-white/[0.07] px-4 py-3.5">
          <h3 className="text-sm font-semibold">Change Admin Password</h3>
          <p className="mt-0.5 text-[11px] text-zinc-600">Minimum 6 characters</p>
        </div>
        <form onSubmit={changePassword} className="flex flex-col gap-4 p-4">
          <PwField label="Current Password"   val={cur}  set={setCur} />
          <PwField label="New Password"        val={next} set={setNext} />
          <PwField label="Confirm New Password" val={conf} set={setConf} />
          <button type="submit" className="rounded-[10px] bg-white py-2.5 text-sm font-semibold text-black shadow-[0_2px_14px_rgba(255,255,255,0.08)] transition hover:bg-zinc-200">
            Update Password
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {/* Export */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <div className="border-b border-white/[0.07] px-4 py-3.5">
            <h3 className="text-sm font-semibold">Export Data</h3>
            <p className="mt-0.5 text-[11px] text-zinc-600">Download a full JSON backup</p>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm text-zinc-300">{students.length} students · {records.length} records</p>
              <p className="mt-0.5 text-xs text-zinc-600">Includes all student data and attendance history</p>
            </div>
            <button onClick={exportData}
              className="shrink-0 rounded-[10px] border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.1]">
              Export JSON
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-white/[0.02]">
          <div className="border-b border-red-500/15 bg-red-500/[0.04] px-4 py-3.5">
            <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
            <p className="mt-0.5 text-[11px] text-red-400/60">These actions are permanent and cannot be undone</p>
          </div>
          <div className="flex flex-col gap-2.5 p-4">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-200">Clear Attendance Records</p>
                <p className="mt-0.5 text-xs text-zinc-600">Removes all attendance history, keeps students</p>
              </div>
              <button onClick={clearAttendance}
                className="shrink-0 rounded-[9px] border border-amber-500/30 bg-amber-500/[0.08] px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/15">
                Clear Records
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-red-300">Clear All Data</p>
                <p className="mt-0.5 text-xs text-zinc-600">Removes students, records, and resets settings</p>
              </div>
              <button onClick={clearAll}
                className="shrink-0 rounded-[9px] border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20">
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin page ────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',  label: 'Dashboard',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { id: 'students',   label: 'Students',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'attendance', label: 'Attendance', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id: 'settings',   label: 'Settings',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
] as const;
type TabId = typeof TABS[number]['id'];

export default function AdminPage() {
  const [authed,   setAuthed]   = useState(false);
  const [checked,  setChecked]  = useState(false);
  const [tab,      setTab]      = useState<TabId>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [records,  setRecords]  = useState<AttendanceRecord[]>([]);
  const { toast, showToast }    = useToast();

  useEffect(() => {
    const ok = sessionStorage.getItem('da-session') === '1';
    setAuthed(ok);
    setChecked(true);
    if (ok) { 
      Promise.all([fetchStudents(), fetchRecords()]).then(([s, r]) => {
        setStudents(s);
        setRecords(r);
      });
    }
  }, []);

  function logout() { sessionStorage.removeItem('da-session'); setAuthed(false); }

  if (!checked) return null;
  if (!authed)  return <LoginScreen onLogin={() => { 
    setAuthed(true); 
    Promise.all([fetchStudents(), fetchRecords()]).then(([s, r]) => {
      setStudents(s);
      setRecords(r);
    });
  }} />;

  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex min-h-screen bg-[#09090b]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-white/[0.06] bg-zinc-950/95 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
          <img src="/logo_full.webp" alt="DeepAttend Logo" className="h-6 w-auto" />
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-3 pt-4">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-700">Navigation</p>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-white/15 text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}>
              <span className={tab === t.id ? 'text-zinc-400' : 'text-zinc-600'}>{t.icon}</span>
              {t.label}
              {tab === t.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white"/>}
            </button>
          ))}

          <div className="my-3 border-t border-white/[0.06]"/>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-700">Tools</p>
          <Link href="/enroll"
            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300">
            <span className="text-zinc-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            </span>
            Face Enrollment
          </Link>
          <Link href="/scanner"
            className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300">
            <span className="text-zinc-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </span>
            Face Scanner
            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Live</span>
          </Link>
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[11px] font-semibold text-zinc-400">Administrator</p>
            <p className="text-[10px] text-zinc-700">{dateStr}</p>
          </div>
          <button onClick={logout}
            className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-red-500/[0.08] hover:text-red-400">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
          <div className="mt-2 border-t border-white/[0.04] pt-2 px-1">
            <a
              href="https://github.com/shrawaniGawade07"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[9.5px] text-zinc-700 transition hover:text-zinc-400"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span className="font-semibold text-zinc-600">Shrawani Gawade</span>
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.06] bg-zinc-950/90 px-8 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-200">{TABS.find(t => t.id === tab)?.label}</p>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {tab==='dashboard'?'System Overview':tab==='students'?'Manage Students':tab==='attendance'?'Attendance Log':'Account Settings'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/scanner" className="flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-xs font-semibold text-black shadow-[0_2px_16px_rgba(255,255,255,0.1)] transition hover:bg-zinc-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>
              Open Scanner
            </Link>
          </div>
        </header>

        <main className="flex-1 px-8 py-7">
          {tab === 'dashboard'  && <DashboardTab  students={students} records={records} />}
          {tab === 'students'   && <StudentsTab   students={students} records={records} onUpdate={setStudents} onRecordsUpdate={setRecords} showToast={showToast} />}
          {tab === 'attendance' && <AttendanceTab students={students} records={records} onRecordsUpdate={setRecords} showToast={showToast} />}
          {tab === 'settings'   && <SettingsTab   students={students} records={records} showToast={showToast} onLogout={logout} />}
        </main>
      </div>

      <Toast {...toast} />
    </div>
  );
}
