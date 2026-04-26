'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchStudents, updateStudent } from '@/lib/db';
import { extractFaceTemplate } from '@/lib/face';
import type { Student } from '@/lib/types';

type Step = 'select' | 'capture' | 'success';

export default function EnrollPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [students, setStudents]       = useState<Student[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState<Student | null>(null);
  const [step, setStep]               = useState<Step>('select');
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [search, setSearch]           = useState('');
  const [toast, setToast]             = useState({ msg: '', type: '', show: false });

  const showToast = useCallback((msg: string, type = '') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  }, []);

  useEffect(() => {
    fetchStudents().then(s => { setStudents(s); setLoading(false); });
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraReady(true);
    } catch {
      showToast('Camera access denied.', 'error');
    }
  }

  function selectStudent(s: Student) {
    setSelected(s);
    setStep('capture');
    startCamera();
  }

  function goBack() {
    setStep('select');
    setSelected(null);
    setCameraReady(false);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }

  async function captureFace() {
    if (!videoRef.current || !selected || isCapturing) return;
    setIsCapturing(true);
    try {
      const template = await extractFaceTemplate(videoRef.current);
      await updateStudent(selected.id, { faceTemplate: template });
      // Also update local state
      setStudents(prev => prev.map(s => s.id === selected.id ? { ...s, faceTemplate: template } : s));
      setStep('success');
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      setCameraReady(false);
    } catch {
      showToast('Face capture failed. Please keep your face clearly visible and try again.', 'error');
    }
    setIsCapturing(false);
  }

  function enrollAnother() {
    setSelected(null);
    setStep('select');
  }

  const filtered = search.trim()
    ? students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(search.toLowerCase()))
    : students;

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 rounded-[8px] border border-white/[0.08] px-2.5 py-1.5 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Admin
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <img src="/logo_full.webp" alt="DeepAttend Logo" className="h-5 w-auto" />
            <div className="flex items-center gap-2 ml-1">
              <span className="text-[15px] font-bold tracking-tight text-white">Face Enrollment</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400">
              {students.filter(s => s.faceTemplate).length}/{students.length} enrolled
            </span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-5 py-10">

        {/* ──── Step 1: Select Student ──── */}
        {step === 'select' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Register Face ID</h1>
              <p className="mt-2 text-sm text-zinc-500">Select a student below to register their face for attendance scanning</p>
            </div>

            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                type="search"
                placeholder="Search by name or roll number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <svg className="text-zinc-700" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <p className="text-sm font-medium text-zinc-500">{search ? 'No students match your search' : 'No students added yet'}</p>
                <p className="text-xs text-zinc-600">{!search && 'Add students from the Admin Panel first.'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(s => {
                  const ini = s.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const enrolled = !!s.faceTemplate;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectStudent(s)}
                      className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left transition hover:border-emerald-500/20 hover:bg-emerald-500/[0.04]"
                    >
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${enrolled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.06] text-zinc-500 border border-white/[0.08]'}`}>
                        {ini}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-200 group-hover:text-white transition">{s.name}</p>
                        <p className="text-[12px] text-zinc-600">{s.rollNumber}{s.department ? ` · ${s.department}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {enrolled ? (
                          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Enrolled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                            Pending
                          </span>
                        )}
                        <svg className="text-zinc-700 group-hover:text-emerald-400 transition" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ──── Step 2: Capture Face ──── */}
        {step === 'capture' && selected && (
          <div className="space-y-6">
            <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to list
            </button>

            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Enrolling: {selected.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{selected.rollNumber}{selected.department ? ` · ${selected.department}` : ''}</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <div className="relative aspect-video w-full bg-black">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" style={{ transform: 'scaleX(-1)' }} />

                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-zinc-500">Starting camera...</p>
                  </div>
                )}

                {/* Face guide overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-48 h-60">
                    <div className="absolute inset-0 border-2 border-dashed border-white/25 rounded-[50%]" />
                    {/* Corner indicators */}
                    <span className="absolute -left-3 -top-3 h-6 w-6 border-l-[3px] border-t-[3px] border-emerald-400 rounded-tl-xl" />
                    <span className="absolute -right-3 -top-3 h-6 w-6 border-r-[3px] border-t-[3px] border-emerald-400 rounded-tr-xl" />
                    <span className="absolute -bottom-3 -left-3 h-6 w-6 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-xl" />
                    <span className="absolute -bottom-3 -right-3 h-6 w-6 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-xl" />
                  </div>
                </div>

                {isCapturing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex items-center gap-3 bg-emerald-500 text-white px-5 py-3 rounded-full text-sm font-semibold shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Analyzing face...
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 p-3">
                  <svg className="mt-0.5 flex-shrink-0 text-emerald-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                  <div className="text-xs text-zinc-400 leading-relaxed">
                    <strong className="text-emerald-300">Tips for best results:</strong> Look directly at the camera. Ensure your face is well-lit and fully visible. Remove glasses or hats if possible.
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={goBack} className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10">
                    Cancel
                  </button>
                  <button
                    onClick={captureFace}
                    disabled={!cameraReady || isCapturing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-[0_2px_20px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Capture &amp; Enroll
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──── Step 3: Success ──── */}
        {step === 'success' && selected && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
            <div className="success-pop">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Face Enrolled Successfully!</h2>
              <p className="mt-2 text-zinc-400">{selected.name} &middot; {selected.rollNumber}</p>
              <p className="mt-1 text-sm text-zinc-600">Their face can now be used for attendance scanning.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={enrollAnother} className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10">
                Enroll Another
              </button>
              <Link href="/scanner" className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_20px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>
                Go to Scanner
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 z-[999] max-w-sm -translate-x-1/2 rounded-xl border px-5 py-3 text-center text-sm font-medium shadow-xl backdrop-blur-xl transition-all duration-300 ${toast.show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'} ${toast.type === 'error' ? 'border-red-500/40 bg-zinc-950/98 text-red-300' : toast.type === 'success' ? 'border-green-500/40 bg-zinc-950/98 text-green-300' : 'border-white/10 bg-zinc-950/98 text-zinc-200'}`}>
        {toast.msg}
      </div>
    </div>
  );
}
