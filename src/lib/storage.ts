import type { Student, AttendanceRecord, AttendanceStats } from './types';

const STUDENT_KEY  = 'deepattend-students';
const RECORD_KEY   = 'deepattend-records';
const ADMIN_KEY    = 'deepattend-admin-pass';
const DEFAULT_PASS = 'admin123';

export const ATTENDANCE_THRESHOLD = 75;
export const MATCH_THRESHOLD      = 0.88;

// ── Students ──────────────────────────────
export function getStudents(): Student[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STUDENT_KEY) || '[]'); }
  catch { return []; }
}

export function saveStudents(s: Student[]): void {
  localStorage.setItem(STUDENT_KEY, JSON.stringify(s));
}

// ── Records ───────────────────────────────
export function getRecords(): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECORD_KEY) || '[]'); }
  catch { return []; }
}

export function saveRecords(r: AttendanceRecord[]): void {
  localStorage.setItem(RECORD_KEY, JSON.stringify(r));
}

// ── Admin password ────────────────────────
export function getAdminPassword(): string {
  if (typeof window === 'undefined') return DEFAULT_PASS;
  return localStorage.getItem(ADMIN_KEY) || DEFAULT_PASS;
}

export function saveAdminPassword(p: string): void {
  localStorage.setItem(ADMIN_KEY, p);
}

// ── Helpers ───────────────────────────────
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getStats(studentId: string, records: AttendanceRecord[]): AttendanceStats {
  const uniqueDates = new Set(records.map(r => r.date));
  const total = uniqueDates.size;
  const present = records.filter(r => r.studentId === studentId && r.status === 'present').length;
  return {
    totalClasses:   total,
    presentClasses: present,
    percentage:     total === 0 ? 100 : Math.round((present / total) * 100),
  };
}
