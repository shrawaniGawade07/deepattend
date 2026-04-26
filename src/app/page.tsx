'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getStudents, getRecords, saveStudents, saveRecords,
  todayKey, uid, MATCH_THRESHOLD, ATTENDANCE_THRESHOLD,
} from '@/lib/storage';
import { extractFaceTemplate, cosineSimilarity } from '@/lib/face';
import type { Student, AttendanceRecord } from '@/lib/types';

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

export default function Home() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [matching,    setMatching]    = useState(false);
  const [matchPct,    setMatchPct]    = useState(0);
  const [matchOk,     setMatchOk]     = useState(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [records,  setRecords]  = useState<AttendanceRecord[]>([]);
  const [enrollId, setEnrollId] = useState('');

  const [statusMsg,   setStatusMsg]   = useState('Click Start Camera to begin.');
  const [statusState, setStatusState] = useState('');

  const { toast, showToast } = useToast();

  useEffect(() => {
    setStudents(getStudents());
    setRecords(getRecords());
  }, []);

  function setStatus(msg: string, state = '') { setStatusMsg(msg); setStatusState(state); }

  async function startCamera() {
    if (cameraReady) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraReady(true);
      setStatus('Camera active. Keep face centered and well lit.', 'active');
    } catch {
      setStatus('Camera access denied or unavailable.', 'error');
      showToast('Camera access denied.', 'error');
    }
  }

  async function enrollFace() {
    if (!enrollId) { showToast('Select a student first.', 'error'); return; }
    if (!cameraReady || !videoRef.current) { showToast('Start the camera first.', 'error'); return; }
    setScanning(true);
    setStatus('Capturing facial profile...', 'active');
    await delay(1800);
    try {
      const template = await extractFaceTemplate(videoRef.current);
      const updated  = students.map(s => s.id === enrollId ? { ...s, faceTemplate: template } : s);
      saveStudents(updated);
      setStudents(updated);
      setScanning(false);
      const s = updated.find(x => x.id === enrollId);
      setStatus(`Face enrolled for ${s?.name}.`, 'success');
      showToast(`Face enrolled for ${s?.name}.`, 'success');
    } catch {
      setScanning(false);
      setStatus('Face capture failed. Please try again.', 'error');
    }
  }

  async function scanAttendance() {
    if (!cameraReady || !videoRef.current) { showToast('Start the camera first.', 'error'); return; }
    setScanning(true);
    setStatus('Analyzing face...', 'active');
    await delay(600);
    try {
      const template   = await extractFaceTemplate(videoRef.current);
      const candidates = students
        .filter(s => Array.isArray(s.faceTemplate))
        .map(s => ({ student: s, score: cosineSimilarity(template, s.faceTemplate!) }))
        .sort((a, b) => b.score - a.score);
      setScanning(false);

      const best = candidates[0];
      if (!best || best.score < MATCH_THRESHOLD) {
        setStatus('No confident face match. Re-enroll or mark manually via admin.', 'error');
        showToast('No face match found.', 'error');
        return;
      }

      const pct = Math.round(best.score * 100);
      setMatching(true);
      setMatchOk(pct >= ATTENDANCE_THRESHOLD);
      setMatchPct(0);

      let curr = 0;
      const step = () => {
        curr = Math.min(curr + 2, pct);
        setMatchPct(curr);
        if (curr < pct) { requestAnimationFrame(step); return; }
        setTimeout(() => {
          setMatching(false);
          const date   = todayKey();
          const newRec: AttendanceRecord = {
            id: uid('att'), studentId: best.student.id, date,
            status: 'present', method: 'face', confidence: pct, timestamp: Date.now(),
          };
          const updated = [newRec, ...records.filter(r => !(r.studentId === best.student.id && r.date === date))];
          saveRecords(updated);
          setRecords(updated);
          setStatus(`${best.student.name} marked present — ${pct}% confidence.`, 'success');
          showToast(`${best.student.name} marked present`, 'success');
        }, 900);
      };
      requestAnimationFrame(step);
    } catch {
      setScanning(false);
      setStatus('Scan failed. Please try again.', 'error');
    }
  }

  const today         = todayKey();
  const todayRecs     = records.filter(r => r.date === today && r.status === 'present');
  const todayIds      = new Set(todayRecs.map(r => r.studentId));
  const pctToday      = students.length ? Math.round((todayIds.size / students.length) * 100) : 0;
  const circumference = 276.46;
  const dashOffset    = circumference - (circumference * matchPct) / 100;
  const ringColor     = matchOk ? '#22c55e' : '#ef4444';
  const dateLabel     = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const enrolledStudent = students.find(s => s.id === enrollId);

  return (
    <>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1340px] items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-indigo-500 shadow-[0_0_18px_rgba(99,102,241,0.45)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white">DeepAttend</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-600 sm:block">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <Link href="/admin" className="flex items-center gap-1.5 rounded-[9px] border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Admin Panel
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1340px] px-5 py-8">

        {/* Page header */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-indigo-500">Attendance System</p>
            <h1 className="text-[22px] font-bold tracking-tight text-white">Face Recognition Console</h1>
          </div>
          <div className="flex items-center gap-4">
            {cameraReady && (
              <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/[0.07] px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                <span className="text-xs font-semibold text-green-400">Camera Live</span>
              </div>
            )}
            {students.length > 0 && (
              <div className="text-right">
                <p className="text-base font-bold leading-tight text-white">
                  {todayIds.size}<span className="text-sm font-normal text-zinc-600">/{students.length}</span>
                </p>
                <p className="text-[11px] text-zinc-600">present today</p>
              </div>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-[1fr_360px] gap-5 items-start xl:grid-cols-1">

          {/* Left: Camera + Enrollment (single unified card) */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">

            {/* Card header */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <svg className="text-zinc-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                <span className="text-sm font-semibold text-zinc-300">Camera Feed</span>
              </div>
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                cameraReady ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.06] text-zinc-600'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cameraReady ? 'animate-pulse bg-green-400' : 'bg-zinc-600'}`} />
                {cameraReady ? 'Live' : 'Offline'}
              </div>
            </div>

            {/* Video */}
            <div className="relative aspect-video max-h-[440px] overflow-hidden bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />

              {/* Idle overlay */}
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                    <svg className="text-zinc-700" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-zinc-500">Camera is offline</p>
                    <p className="mt-0.5 text-xs text-zinc-700">Click <span className="text-zinc-500 font-medium">Start Camera</span> below</p>
                  </div>
                </div>
              )}

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-zinc-950/60">
                  <div className="relative h-52 w-52">
                    <span className="absolute left-0 top-0 h-7 w-7 border-l-[2.5px] border-t-[2.5px] border-indigo-500 rounded-tl" />
                    <span className="absolute right-0 top-0 h-7 w-7 border-r-[2.5px] border-t-[2.5px] border-indigo-500 rounded-tr" />
                    <span className="absolute bottom-0 left-0 h-7 w-7 border-b-[2.5px] border-l-[2.5px] border-indigo-500 rounded-bl" />
                    <span className="absolute bottom-0 right-0 h-7 w-7 border-b-[2.5px] border-r-[2.5px] border-indigo-500 rounded-br" />
                    <div className="scan-bar" />
                  </div>
                  <div className="flex items-center gap-2.5 rounded-full border border-indigo-500/20 bg-black/70 px-4 py-2 backdrop-blur-sm">
                    <div className="flex gap-1">
                      {[0, 120, 240].map(d => (
                        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Analyzing</span>
                  </div>
                </div>
              )}

              {/* Match ring overlay */}
              {matching && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/78 backdrop-blur-[2px]">
                  <div className="relative h-36 w-36">
                    <svg style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 100 100" width="144" height="144">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                      <circle cx="50" cy="50" r="44" fill="none"
                        stroke={ringColor} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray="276.46" strokeDashoffset={dashOffset}
                        className="ring-prog"
                        style={{ filter: `drop-shadow(0 0 7px ${ringColor})` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <strong className="text-2xl font-bold tabular-nums text-white">{matchPct}%</strong>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">confidence</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2.5 px-5 pt-4 pb-2.5">
              <button onClick={startCamera} disabled={cameraReady}
                className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-[0_2px_16px_rgba(99,102,241,0.35)] transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">
                {cameraReady
                  ? <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />Camera Active</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>Start Camera</>
                }
              </button>
              <button onClick={scanAttendance} disabled={!cameraReady || scanning || matching}
                className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-indigo-500/25 bg-indigo-500/10 py-2.5 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/[0.17] disabled:cursor-not-allowed disabled:opacity-40">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Scan &amp; Mark
              </button>
            </div>

            {/* Status strip */}
            <div className="flex min-h-[36px] items-center gap-2.5 px-5 pb-3">
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all ${
                statusState === 'active'  ? 'bg-indigo-500 shadow-[0_0_6px_#6366f1]' :
                statusState === 'success' ? 'bg-green-500 shadow-[0_0_6px_#22c55e]'  :
                statusState === 'error'   ? 'bg-red-500 shadow-[0_0_6px_#ef4444]'    :
                'bg-zinc-700'
              }`} />
              <p className="text-xs text-zinc-500">{statusMsg}</p>
            </div>

            {/* Enrollment section */}
            <div className="border-t border-white/[0.06] px-5 py-4">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Face Enrollment</p>
                {enrolledStudent?.faceTemplate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />Already enrolled
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <select value={enrollId} onChange={e => setEnrollId(e.target.value)}
                  className="flex-1 rounded-[10px] border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500/55 focus:outline-none">
                  <option value="">{students.length === 0 ? 'No students — add via Admin Panel' : 'Select student to enroll...'}</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {s.rollNumber}{s.faceTemplate ? ' ✓' : ''}</option>
                  ))}
                </select>
                <button onClick={enrollFace} disabled={!cameraReady || scanning || !enrollId}
                  className="rounded-[10px] border border-white/[0.08] bg-white/[0.06] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40">
                  Enroll
                </button>
              </div>
            </div>
          </div>

          {/* Right: Today's attendance */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <div className="border-b border-white/[0.07] px-4 pb-4 pt-3.5">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200">Today&apos;s Attendance</h3>
                <span className="text-sm font-bold text-indigo-400">
                  {todayIds.size}<span className="text-xs font-normal text-zinc-600">/{students.length}</span>
                </span>
              </div>
              <p className="mb-3 text-xs text-zinc-600">{dateLabel}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pctToday}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-600">{pctToday}% attendance rate</p>
            </div>
            <div className="flex max-h-[520px] flex-col gap-1.5 overflow-y-auto p-3">
              {todayIds.size === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                    <svg className="text-zinc-700" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-500">No attendance yet</p>
                    <p className="mt-0.5 text-xs text-zinc-700">Scan a face or mark manually from admin</p>
                  </div>
                </div>
              ) : (
                [...todayIds].map(id => {
                  const s   = students.find(st => st.id === id);
                  if (!s) return null;
                  const rec = todayRecs.find(r => r.studentId === id);
                  const ini = s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                  const t   = rec ? new Date(rec.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <div key={id} className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.06] bg-white/[0.04] p-2.5 transition hover:bg-white/[0.07]">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10 text-xs font-bold text-indigo-400">
                        {ini}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-200">{s.name}</p>
                        <p className="text-[11px] text-zinc-600">{s.rollNumber}{t ? ` · ${t}` : ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-400">
                          {rec?.method ?? 'manual'}
                        </span>
                        {rec?.confidence && rec.method === 'face' && (
                          <span className="text-[10px] text-zinc-700">{rec.confidence}%</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 z-[999] max-w-sm -translate-x-1/2 rounded-xl border px-5 py-3 text-center text-sm font-medium shadow-xl backdrop-blur-xl transition-all duration-300 ${
        toast.show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      } ${
        toast.type === 'success' ? 'border-green-500/40 bg-zinc-950/98 text-green-300' :
        toast.type === 'error'   ? 'border-red-500/40 bg-zinc-950/98 text-red-300'     :
        'border-white/10 bg-zinc-950/98 text-zinc-200'
      }`}>
        {toast.msg}
      </div>
    </>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
