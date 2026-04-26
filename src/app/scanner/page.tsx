'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchStudents, fetchRecords, addRecord, todayKey, uid, MATCH_THRESHOLD } from '@/lib/db';
import { extractFaceTemplate, cosineSimilarity } from '@/lib/face';
import type { Student, AttendanceRecord } from '@/lib/types';

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export default function ScannerPage() {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [matchResult, setMatchResult] = useState<{ student: Student, confidence: number } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [records,  setRecords]  = useState<AttendanceRecord[]>([]);

  // Simple beep sound using Web Audio API
  const playSuccessSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Slide up to A6
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.error('Audio play failed', e); }
  }, []);

  useEffect(() => { 
    Promise.all([fetchStudents(), fetchRecords()]).then(([s, r]) => {
      setStudents(s);
      setRecords(r);
    });
    // Auto-start camera
    startCamera();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function startCamera() {
    if (cameraReady) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 1280, height: 720 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraReady(true);
    } catch (e) { console.error("Camera error:", e); }
  }

  async function scanAttendance() {
    if (!cameraReady || !videoRef.current || scanning) return;
    setScanning(true); 
    setMatchResult(null);
    
    try {
      const template   = await extractFaceTemplate(videoRef.current);
      const candidates = students.filter(s => Array.isArray(s.faceTemplate))
        .map(s => ({ student: s, score: cosineSimilarity(template, s.faceTemplate!) }))
        .sort((a, b) => b.score - a.score);
      
      const best = candidates[0];
      if (!best || best.score < MATCH_THRESHOLD) {
        setScanning(false);
        // Show error briefly
        const errDiv = document.createElement('div');
        errDiv.className = 'fixed top-10 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full font-bold shadow-lg z-50 transition-opacity duration-300';
        errDiv.innerText = 'Face not recognized. Try again.';
        document.body.appendChild(errDiv);
        setTimeout(() => { errDiv.style.opacity = '0'; setTimeout(() => errDiv.remove(), 300); }, 2000);
        return;
      }
      
      const pct = Math.round(best.score * 100);
      
      // Mark present
      const newRec: AttendanceRecord = { id: uid('att'), studentId: best.student.id, date: todayKey(), status: 'present', method: 'face', confidence: pct, timestamp: Date.now() };
      await addRecord(newRec);
      setRecords([newRec, ...records.filter(r => !(r.studentId === best.student.id && r.date === todayKey()))]);
      
      // Show success
      setScanning(false);
      setMatchResult({ student: best.student, confidence: pct });
      playSuccessSound();
      
      // Clear success after 3 seconds
      setTimeout(() => {
        setMatchResult(null);
      }, 3000);
      
    } catch (e) { 
      setScanning(false); 
      console.error(e);
    }
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Background Video */}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: 'scaleX(-1)' }} // Mirror effect
      />
      
      {/* Dark Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Top Header */}
      <div className="absolute top-0 left-0 w-full z-50 flex items-center justify-between p-6">
        <Link href="/admin" className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/70">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to Admin
        </Link>
        <img src="/logo_full.webp" alt="DeepAttend Logo" className="h-6 w-auto drop-shadow-md mr-4" />
      </div>

      {/* Center Scanning Frame */}
      <div className="relative z-10 w-[400px] h-[400px] flex flex-col items-center justify-center pointer-events-none">
        
        {/* The Frame Lines */}
        <div className="absolute inset-0">
          <span className="absolute left-0 top-0 h-16 w-16 border-l-4 border-t-4 border-white/80 rounded-tl-2xl shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          <span className="absolute right-0 top-0 h-16 w-16 border-r-4 border-t-4 border-white/80 rounded-tr-2xl shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          <span className="absolute bottom-0 left-0 h-16 w-16 border-b-4 border-l-4 border-white/80 rounded-bl-2xl shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
          <span className="absolute bottom-0 right-0 h-16 w-16 border-b-4 border-r-4 border-white/80 rounded-br-2xl shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
        </div>

        {/* Scanning Animation */}
        {scanning && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="scan-bar" />
          </div>
        )}

        {/* Idle Text */}
        {!scanning && !matchResult && cameraReady && (
          <div className="absolute bottom-[-60px] text-center w-full">
            <p className="text-white/80 text-lg font-medium drop-shadow-md">Position your face in the frame</p>
          </div>
        )}

        {/* Success Popup */}
        {matchResult && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/20 backdrop-blur-sm rounded-2xl success-pop border border-green-400/50">
            <div className="bg-green-500 text-white p-4 rounded-full mb-4 shadow-[0_0_30px_rgba(34,197,94,0.8)]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-3xl font-bold text-white drop-shadow-lg text-center px-4">{matchResult.student.name}</h2>
            <p className="text-green-300 font-semibold mt-1 text-lg drop-shadow-md">{matchResult.student.rollNumber}</p>
            <div className="mt-4 px-3 py-1 bg-black/50 rounded-full text-green-400 text-sm font-bold border border-green-500/30">
              Attendance Marked
            </div>
          </div>
        )}
      </div>

      {/* Manual Scan Button (Optional, usually auto-scans but good to have) */}
      <div className="absolute bottom-10 z-50">
        <button 
          onClick={scanAttendance} 
          disabled={!cameraReady || scanning || matchResult !== null}
          className="group relative flex items-center justify-center h-20 w-20 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 transition hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <div className="absolute inset-2 rounded-full bg-white/80 group-hover:bg-white transition" />
          <svg className="relative z-10 text-black ml-1" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <p className="text-center text-white/60 text-xs mt-3 font-medium tracking-widest uppercase">Tap to Scan</p>
      </div>

    </div>
  );
}
