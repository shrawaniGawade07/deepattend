/**
 * Database abstraction layer.
 * Uses Supabase when configured, falls back to localStorage.
 */
import { supabase, isSupabaseReady } from './supabase';
import type { Student, AttendanceRecord, AttendanceStats } from './types';

// ── Constants ─────────────────────────────
export const ATTENDANCE_THRESHOLD = 75;
export const MATCH_THRESHOLD      = 0.88;

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

// ── LocalStorage keys (fallback) ──────────
const STUDENT_KEY  = 'deepattend-students';
const RECORD_KEY   = 'deepattend-records';
const ADMIN_KEY    = 'deepattend-admin-pass';
const DEFAULT_PASS = 'DeepAttend@Admin';

// ═══════════════════════════════════════════
// ── Students ──────────────────────────────
// ═══════════════════════════════════════════

export async function fetchStudents(): Promise<Student[]> {
  if (isSupabaseReady()) {
    const { data, error } = await supabase!
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.warn('Supabase fallback (fetchStudents):', error.message || error); }
    else {
    return (data ?? []).map(row => ({
      id:            row.id,
      name:          row.name,
      email:         row.email,
      rollNumber:    row.roll_number,
      department:    row.department ?? '',
      semester:      row.semester ?? '',
      guardianEmail: row.guardian_email ?? '',
      phone:         row.phone ?? '',
      faceTemplate:  row.face_template ?? undefined,
    }));
    }
  }
  // Fallback
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STUDENT_KEY) || '[]'); }
  catch { return []; }
}

export async function addStudent(s: Student): Promise<void> {
  if (isSupabaseReady()) {
    const { error } = await supabase!.from('students').insert({
      id:             s.id,
      name:           s.name,
      email:          s.email,
      roll_number:    s.rollNumber,
      department:     s.department || null,
      semester:       s.semester   || null,
      guardian_email: s.guardianEmail || null,
      phone:          s.phone      || null,
      face_template:  s.faceTemplate || null,
    });
    if (error) { console.warn('Supabase fallback (addStudent):', error.message || error); } else return;
  }
  const list = await fetchStudents();
  list.unshift(s);
  localStorage.setItem(STUDENT_KEY, JSON.stringify(list));
}

export async function updateStudent(id: string, fields: Partial<Student>): Promise<void> {
  if (isSupabaseReady()) {
    // Map camelCase -> snake_case for Supabase columns
    const mapped: Record<string, unknown> = {};
    if (fields.name          !== undefined) mapped.name           = fields.name;
    if (fields.email         !== undefined) mapped.email          = fields.email;
    if (fields.rollNumber    !== undefined) mapped.roll_number    = fields.rollNumber;
    if (fields.department    !== undefined) mapped.department     = fields.department;
    if (fields.semester      !== undefined) mapped.semester       = fields.semester;
    if (fields.guardianEmail !== undefined) mapped.guardian_email = fields.guardianEmail;
    if (fields.phone         !== undefined) mapped.phone          = fields.phone;
    if (fields.faceTemplate  !== undefined) mapped.face_template  = fields.faceTemplate;
    const { error } = await supabase!.from('students').update(mapped).eq('id', id);
    if (error) { console.warn('Supabase fallback (updateStudent):', error.message || error); } else return;
  }
  const list = await fetchStudents();
  const updated = list.map(s => s.id === id ? { ...s, ...fields } : s);
  localStorage.setItem(STUDENT_KEY, JSON.stringify(updated));
}

export async function deleteStudent(id: string): Promise<void> {
  if (isSupabaseReady()) {
    const { error } = await supabase!.from('students').delete().eq('id', id);
    if (error) { console.warn('Supabase fallback (deleteStudent):', error.message || error); } else return;
  }
  const list = await fetchStudents();
  localStorage.setItem(STUDENT_KEY, JSON.stringify(list.filter(s => s.id !== id)));
}

// ═══════════════════════════════════════════
// ── Attendance Records ────────────────────
// ═══════════════════════════════════════════

export async function fetchRecords(): Promise<AttendanceRecord[]> {
  if (isSupabaseReady()) {
    const { data, error } = await supabase!
      .from('attendance_records')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) { console.warn('Supabase fallback (fetchRecords):', error.message || error); }
    else {
    return (data ?? []).map(row => ({
      id:         row.id,
      studentId:  row.student_id,
      date:       row.date,
      status:     row.status,
      method:     row.method,
      confidence: row.confidence,
      timestamp:  row.timestamp,
    }));
    }
  }
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECORD_KEY) || '[]'); }
  catch { return []; }
}

export async function addRecord(r: AttendanceRecord): Promise<void> {
  if (isSupabaseReady()) {
    // Upsert: delete existing record for same student+date first
    await supabase!.from('attendance_records')
      .delete()
      .eq('student_id', r.studentId)
      .eq('date', r.date);
    const { error } = await supabase!.from('attendance_records').insert({
      id:          r.id,
      student_id:  r.studentId,
      date:        r.date,
      status:      r.status,
      method:      r.method,
      confidence:  r.confidence,
      timestamp:   r.timestamp,
    });
    if (error) { console.warn('Supabase fallback (addRecord):', error.message || error); } else return;
  }
  const list = await fetchRecords();
  const updated = [r, ...list.filter(x => !(x.studentId === r.studentId && x.date === r.date))];
  localStorage.setItem(RECORD_KEY, JSON.stringify(updated));
}

export async function deleteRecord(id: string): Promise<void> {
  if (isSupabaseReady()) {
    const { error } = await supabase!.from('attendance_records').delete().eq('id', id);
    if (error) { console.warn('Supabase fallback (deleteRecord):', error.message || error); } else return;
  }
  const list = await fetchRecords();
  localStorage.setItem(RECORD_KEY, JSON.stringify(list.filter(r => r.id !== id)));
}

export async function clearAllRecords(): Promise<void> {
  if (isSupabaseReady()) {
    const { error } = await supabase!.from('attendance_records').delete().neq('id', '');
    if (error) { console.warn('Supabase fallback (clearAllRecords):', error.message || error); } else return;
  }
  localStorage.setItem(RECORD_KEY, '[]');
}

// ═══════════════════════════════════════════
// ── Admin Password ────────────────────────
// ═══════════════════════════════════════════

export function getAdminPassword(): string {
  if (typeof window === 'undefined') return DEFAULT_PASS;
  return localStorage.getItem(ADMIN_KEY) || DEFAULT_PASS;
}

export function saveAdminPassword(p: string): void {
  localStorage.setItem(ADMIN_KEY, p);
}

// ═══════════════════════════════════════════
// ── Backward compat re-exports (sync) ─────
// For pages that still use sync versions we
// keep thin wrappers reading from localStorage.
// ═══════════════════════════════════════════

export function getStudentsSync(): Student[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STUDENT_KEY) || '[]'); }
  catch { return []; }
}

export function getRecordsSync(): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECORD_KEY) || '[]'); }
  catch { return []; }
}

export function saveStudentsSync(s: Student[]): void {
  localStorage.setItem(STUDENT_KEY, JSON.stringify(s));
}

export function saveRecordsSync(r: AttendanceRecord[]): void {
  localStorage.setItem(RECORD_KEY, JSON.stringify(r));
}
