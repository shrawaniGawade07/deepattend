'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function Home() {
  const tunnelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Fade in hero elements
    const badge = document.getElementById('hero-badge');
    const subtitle = document.getElementById('hero-subtitle');
    const actions = document.getElementById('hero-actions');
    setTimeout(() => { if (badge) badge.style.opacity = '1'; }, 300);
    setTimeout(() => { if (subtitle) { subtitle.style.opacity = '1'; subtitle.style.transform = 'translateY(0)'; } }, 700);
    setTimeout(() => { if (actions) { actions.style.opacity = '1'; actions.style.transform = 'translateY(0)'; } }, 950);

    // Scroll reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // 3D tunnel
    const tunnel = tunnelRef.current;
    if (!tunnel) return;
    const panels: { el: HTMLDivElement; x: number; y: number; z: number }[] = [];
    const contents = [
      `<div class="text-[10px] text-neutral-400 mb-1">Attendance Rate</div><div class="text-xl font-mono text-white">97.3%</div><div class="mt-1 text-[9px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded w-fit">+2.1%</div>`,
      `<div class="text-[10px] text-neutral-400 mb-2">Students Present</div><div class="flex items-end gap-1 h-10">${Array.from({length:5}).map(()=>`<div class="flex-1 bg-white/20 rounded-t" style="height:${30+Math.random()*70}%"></div>`).join('')}</div>`,
      `<div class="text-[10px] text-neutral-300 mb-2">Face Scan Active</div><div class="h-1 w-full bg-white/5 rounded overflow-hidden"><div class="h-full bg-white/60 w-4/5 rounded"></div></div>`,
      `<div class="text-[10px] text-neutral-400 mb-1">Enrolled Students</div><div class="text-xl font-mono text-white">72</div>`,
      `<div class="text-[10px] text-neutral-400 mb-1">Recognition</div><div class="text-xl font-mono text-emerald-400">99.1%</div>`,
    ];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'absolute top-1/2 left-1/2 w-44 p-4 rounded-xl border border-white/10 flex flex-col will-change-transform';
      el.style.cssText = 'background:rgba(8,8,8,0.85);backdrop-filter:blur(12px);';
      el.innerHTML = contents[i % contents.length];
      tunnel.appendChild(el);
      panels.push({ el, x: (Math.random()-0.5)*700, y: (Math.random()-0.5)*500, z: -Math.random()*3000 });
    }
    let raf: number;
    function animate() {
      panels.forEach(p => {
        p.z += 1.8;
        if (p.z > 200) p.z = -3000;
        const opacity = p.z > -200 ? Math.max(0,(200-p.z)/400) : p.z < -2500 ? (p.z+3000)/500 : 1;
        const blur = p.z < -1500 ? Math.min(8,(Math.abs(p.z)-1500)/200) : 0;
        p.el.style.transform = `translate(-50%,-50%) translate3d(${p.x}px,${p.y}px,${p.z}px)`;
        p.el.style.opacity = String(Math.max(0,opacity));
        p.el.style.filter = `blur(${blur}px)`;
      });
      raf = requestAnimationFrame(animate);
    }
    animate();
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);

  return (
    <>
      <style>{`
        body { background:#000; }
        .bg-grid {
          background-size:40px 40px;
          background-image:linear-gradient(to right,rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.05) 1px,transparent 1px);
          mask-image:linear-gradient(to bottom,black 40%,transparent 100%);
          -webkit-mask-image:linear-gradient(to bottom,black 40%,transparent 100%);
          animation:gridMove 20s linear infinite;
        }
        @keyframes gridMove { 0%{transform:translateY(0)} 100%{transform:translateY(40px)} }
        .fade-up { opacity:0; transform:translateY(28px); transition:opacity 0.9s cubic-bezier(0.16,1,0.3,1),transform 0.9s cubic-bezier(0.16,1,0.3,1); }
        .fade-up.visible { opacity:1; transform:translateY(0); }
        .card-3d { perspective:1200px; }
        .card-3d-inner { transition:transform 0.6s cubic-bezier(0.23,1,0.32,1); transform-style:preserve-3d; }
        .card-3d:hover .card-3d-inner { transform:rotateX(8deg) rotateY(-8deg) translateZ(10px); }
        .anim-bar-1 { animation:bp1 2s ease-in-out infinite alternate; }
        .anim-bar-2 { animation:bp2 2.5s ease-in-out infinite alternate; }
        .anim-bar-3 { animation:bp3 1.8s ease-in-out infinite alternate; }
        .anim-bar-4 { animation:bp4 2.2s ease-in-out infinite alternate; }
        .anim-bar-5 { animation:bp5 2.7s ease-in-out infinite alternate; }
        @keyframes bp1 { 0%{height:30%} 100%{height:70%} }
        @keyframes bp2 { 0%{height:60%} 100%{height:95%} }
        @keyframes bp3 { 0%{height:40%} 100%{height:80%} }
        @keyframes bp4 { 0%{height:75%} 100%{height:45%} }
        @keyframes bp5 { 0%{height:50%} 100%{height:85%} }
        @keyframes scanMove { 0%{top:0%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        .scan-line { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent); animation:scanMove 3s ease-in-out infinite; }
        @keyframes type { 0%,10%{width:0} 40%,90%{width:18ch} 100%{width:0} }
        @keyframes blink { 0%,100%{border-color:transparent} 50%{border-color:#fff} }
        .typewriter { display:inline-block; overflow:hidden; white-space:nowrap; border-right:2px solid #fff; width:18ch; animation:type 5s steps(18,end) infinite,blink 0.8s step-end infinite; }
        @keyframes shimmer { to{background-position:200% center} }
        .text-shimmer { background:linear-gradient(to right,#64748b 20%,#fff 40%,#fff 60%,#64748b 80%); background-size:200% auto; color:transparent; -webkit-background-clip:text; background-clip:text; animation:shimmer 4s linear infinite; }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(255,255,255,0.1)} 50%{box-shadow:0 0 40px rgba(255,255,255,0.3)} }
        .pulse-glow { animation:pulseGlow 3s ease-in-out infinite; }
      `}</style>

      {/* Background grid */}
      <div className="fixed top-0 w-full h-screen -z-10" style={{maskImage:'linear-gradient(to bottom,transparent,black 10%,black 80%,transparent)',WebkitMaskImage:'linear-gradient(to bottom,transparent,black 10%,black 80%,transparent)'}}>
        <div className="absolute inset-0 bg-grid opacity-[0.15]"></div>
      </div>
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{background:'radial-gradient(circle at 15% 0%,rgba(255,255,255,0.04),transparent 40%),radial-gradient(circle at 85% 100%,rgba(255,255,255,0.03),transparent 40%)',filter:'blur(80px)'}}></div>

      {/* Vertical data-stream lines */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center px-12 select-none">
        <div className="w-full max-w-7xl h-full border-x border-white/[0.04] grid grid-cols-4 relative">
          <div className="border-r border-white/[0.04] h-full hidden md:block relative">
            <div className="absolute top-0 right-0 w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent" style={{animation:'dataStream 3s linear infinite'}}></div>
          </div>
          <div className="border-r border-white/[0.04] h-full hidden md:block relative">
            <div className="absolute top-[20%] right-0 w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent" style={{animation:'dataStream 4s linear infinite 1s'}}></div>
          </div>
          <div className="border-r border-white/[0.04] h-full hidden md:block relative">
            <div className="absolute top-[60%] right-0 w-px h-32 bg-gradient-to-b from-transparent via-white/20 to-transparent" style={{animation:'dataStream 2.5s linear infinite 0.5s'}}></div>
          </div>
        </div>
      </div>
      <style>{`@keyframes dataStream{0%{transform:translateY(-100%)}100%{transform:translateY(500%)}}`}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 w-full flex justify-between items-center px-6 md:px-12 h-20 z-50 border-b border-white/[0.05] bg-black/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <span className="text-white font-semibold tracking-tight text-sm">DeepAttend</span>
          <span className="hidden md:block text-[10px] font-mono text-neutral-500 border border-white/10 px-2 py-0.5 rounded">v2.0</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs font-mono text-neutral-400">
          {['DASHBOARD','SCANNER','ENROLL'].map(label => (
            <a key={label} href={label==='DASHBOARD'?'/admin':label==='SCANNER'?'/scanner':'/enroll'} className="hover:text-white transition-colors flex items-center gap-1.5 group">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 group-hover:bg-white transition-colors"></span>
              {label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-[9px] font-mono text-neutral-500 text-right">
            <span>System: Online</span>
            <span className="text-neutral-300">Face AI: Ready</span>
          </div>
          <Link href="/admin" className="px-5 py-2 text-xs font-semibold text-neutral-900 bg-white rounded-full hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2">
            Launch
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* 3D Tunnel */}
        <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden opacity-70" style={{perspective:'900px'}}>
          <div ref={tunnelRef} className="relative w-full h-full" style={{transformStyle:'preserve-3d'}}></div>
        </div>
        {/* Atmospheric glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-[60vw] max-w-[500px] aspect-square rounded-full blur-[120px] mix-blend-screen opacity-60" style={{background:'radial-gradient(circle,rgba(255,255,255,0.08),transparent)'}}></div>
        </div>
        {/* Scan line */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="scan-line"></div>
        </div>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none"></div>

        {/* Content */}
        <main className="relative z-40 flex flex-col items-center text-center px-6 w-full max-w-5xl mx-auto">
          <div id="hero-badge" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs text-gray-300 mb-8 transition-all duration-700" style={{opacity:0,background:'linear-gradient(#111,#111) padding-box,linear-gradient(90deg,rgba(255,255,255,0.12) 0%,rgba(255,255,255,0.02) 100%) border-box',border:'1px solid transparent',backdropFilter:'blur(12px)'}}>
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            AI Attendance System — Keystone School of Engineering
          </div>

          <h1 ref={titleRef} className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.05] text-shimmer">
            Attendance,<br />Reimagined.
          </h1>

          <p id="hero-subtitle" className="text-sm md:text-base text-neutral-400 mb-10 max-w-xl leading-relaxed transition-all duration-700" style={{opacity:0,transform:'translateY(16px)'}}>
            Deep face recognition powers real-time attendance tracking for TE Computer Engineering. Zero manual entry. Absolute precision.
          </p>

          <div id="hero-actions" className="flex flex-col sm:flex-row items-center gap-4 transition-all duration-700" style={{opacity:0,transform:'translateY(16px)'}}>
            <Link href="/admin" className="group w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2.5 pulse-glow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="3" height="11" x="13" y="2" rx="2"/><rect width="3" height="5" x="18" y="8" rx="2"/><rect width="3" height="7" x="3" y="9" rx="2"/><rect width="3" height="11" x="8" y="2" rx="2"/></svg>
              Admin Dashboard
            </Link>
            <Link href="/scanner" className="group w-full sm:w-auto px-8 py-4 rounded-xl text-white font-normal text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2.5" style={{background:'linear-gradient(rgba(20,20,20,0.4),rgba(20,20,20,0.4)) padding-box,linear-gradient(180deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.02) 100%) border-box',border:'1px solid transparent',backdropFilter:'blur(12px)'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>
              Face Scanner
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-8 mt-14 pt-8 border-t border-white/10">
            {[{val:'72',label:'Students'},{val:'TE-A',label:'Division'},{val:'99.1%',label:'Accuracy'},{val:'Real-time',label:'Processing'}].map(s => (
              <div key={s.label} className="text-center hidden sm:block">
                <div className="text-lg font-mono text-white font-semibold">{s.val}</div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </main>
      </section>

      {/* FEATURE CARDS */}
      <section className="relative z-10 py-32 px-6 bg-black">
        <div className="max-w-7xl mx-auto border-t border-white/10 pt-20">
          <div className="flex items-center gap-6 mb-20 fade-up">
            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-white">Core Modules</h2>
            <div className="h-px bg-white/20 flex-1"></div>
            <span className="text-[10px] font-mono text-neutral-500">SYS_MODULES</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="3" height="11" x="13" y="2" rx="2"/><rect width="3" height="5" x="18" y="8" rx="2"/><rect width="3" height="7" x="3" y="9" rx="2"/><rect width="3" height="11" x="8" y="2" rx="2"/></svg>,
                tag:'MOD_01', title:'Admin Dashboard',
                desc:'Full attendance analytics, student records management, and real-time overview for TE Computer Engineering Division A.',
                foot:<div className="flex items-end gap-1 h-8 mt-auto"><div className="w-2 bg-white/30 rounded-t anim-bar-1"/><div className="w-2 bg-white/30 rounded-t anim-bar-2"/><div className="w-2 bg-white rounded-t anim-bar-3 shadow-[0_0_8px_rgba(255,255,255,0.5)]"/><div className="w-2 bg-white/30 rounded-t anim-bar-4"/><div className="w-2 bg-white/30 rounded-t anim-bar-5"/><span className="text-[10px] font-mono text-neutral-500 ml-2 uppercase">Live</span></div>,
                href:'/admin', delay:0, mt:''
              },
              {
                icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 3"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/></svg>,
                tag:'MOD_02', title:'Face Scanner',
                desc:'Live camera feed with real-time face detection and recognition. Mark attendance instantly with sub-second latency.',
                foot:<div className="flex items-center gap-2 mt-auto"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"/><span className="text-[10px] font-mono text-emerald-400">RECOGNITION ACTIVE</span></div>,
                href:'/scanner', delay:100, mt:'md:mt-12'
              },
              {
                icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                tag:'MOD_03', title:'Student Enrollment',
                desc:'Capture and register student face embeddings. 72 students enrolled across TE-A with multi-angle face data.',
                foot:<div className="font-mono text-[10px] text-neutral-500 flex flex-col gap-1 mt-auto"><span className="group-hover:text-white transition-colors">&gt; capture_face()</span><span className="opacity-50 group-hover:opacity-100 transition-opacity">&gt; encode_embedding()</span><span className="opacity-25 group-hover:opacity-100 transition-opacity">&gt; OK</span></div>,
                href:'/enroll', delay:200, mt:'md:mt-24'
              }
            ].map(card => (
              <Link href={card.href} key={card.title} className={`relative group card-3d h-full ${card.mt} fade-up block`} style={{transitionDelay:`${card.delay}ms`}}>
                <div className="card-3d-inner w-full h-full">
                  <div className="relative p-10 rounded-3xl bg-black border border-white/[0.05] overflow-hidden transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[-20px_20px_40px_rgba(0,0,0,0.8)] group-hover:bg-white/[0.03] h-full flex flex-col">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-white/10 transition-colors"></div>
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 text-neutral-300 group-hover:text-white">
                        {card.icon}
                      </div>
                      <div className="text-[9px] font-mono text-neutral-500 border border-white/10 px-2 py-1 rounded bg-black/50">{card.tag}</div>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">{card.title}</h3>
                    <p className="text-sm text-neutral-400 font-light leading-relaxed mb-8 flex-1">{card.desc}</p>
                    {card.foot}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO STATS */}
      <section className="relative z-10 py-32 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-start mb-16 fade-up">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-white">System Telemetry</h2>
            <p className="text-base text-neutral-400 max-w-xl font-light leading-relaxed">Real-time intelligence across all 72 enrolled students. Instant recognition, zero latency.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[280px] fade-up">
            {/* Big chart */}
            <div className="col-span-1 md:col-span-2 row-span-2 p-8 rounded-[2rem] border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-500" style={{background:'#050505'}}>
              <div className="absolute inset-0 pointer-events-none group-hover:opacity-20 transition-opacity" style={{backgroundSize:'40px 40px',backgroundImage:'linear-gradient(to right,rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.05) 1px,transparent 1px)',opacity:0.05}}></div>
              <div className="h-full flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-start">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                    <span className="text-[10px] font-mono text-white uppercase tracking-widest">Live Feed</span>
                  </div>
                  <span className="text-neutral-500 text-sm group-hover:text-white transition-colors">⊞</span>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[260px] h-32 flex items-end justify-between gap-1">
                  {['anim-bar-1','anim-bar-2','anim-bar-3','anim-bar-4','anim-bar-5','anim-bar-1','anim-bar-2'].map((cls,i)=>(
                    <div key={i} className={`w-full border border-white/10 relative overflow-hidden ${cls} ${i===2?'bg-white border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]':'bg-white/5'}`}>
                      {i!==2 && <div className="absolute top-0 inset-x-0 h-px bg-white shadow-[0_0_8px_#fff]"></div>}
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-white group-hover:translate-x-1 transition-transform">Attendance Analytics</h3>
                  <div className="flex gap-8 pt-4 border-t border-white/10">
                    <div><div className="text-[10px] text-neutral-500 font-mono mb-1">PRESENT TODAY</div><div className="text-sm font-mono text-white">68 / 72</div></div>
                    <div><div className="text-[10px] text-neutral-500 font-mono mb-1">RATE</div><div className="text-sm font-mono text-white">94.4%</div></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Recognition */}
            <div className="col-span-1 row-span-1 p-7 rounded-[2rem] border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-500 flex flex-col justify-between" style={{background:'#050505'}}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Face Recognition</span>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
              </div>
              <div>
                <div className="text-4xl font-mono text-white font-semibold">99.1<span className="text-xl text-neutral-500">%</span></div>
                <div className="text-xs text-neutral-500 mt-1">Accuracy across all enrolled</div>
              </div>
              <div className="w-full h-1 bg-white/5 rounded overflow-hidden"><div className="h-full bg-white rounded" style={{width:'99.1%'}}></div></div>
            </div>
            {/* Enrolled */}
            <div className="col-span-1 row-span-1 p-7 rounded-[2rem] border border-white/10 relative overflow-hidden group hover:border-white/20 transition-all duration-500 flex flex-col justify-between" style={{background:'#050505'}}>
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Students</div>
              <div>
                <div className="text-4xl font-mono text-white font-semibold">72</div>
                <div className="text-xs text-neutral-500 mt-1">TE Division A enrolled</div>
              </div>
              <div className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded w-fit">IDs: TE-A-1 → TE-A-72</div>
            </div>
            {/* Quick links */}
            <div className="col-span-1 md:col-span-2 row-span-1 p-7 rounded-[2rem] border border-white/10 relative overflow-hidden hover:border-white/20 transition-all duration-500 flex items-center justify-between gap-4" style={{background:'#050505'}}>
              <div>
                <div className="text-[10px] font-mono text-neutral-500 uppercase mb-2 tracking-widest">Quick Access</div>
                <div className="text-lg font-semibold text-white">Jump to any module</div>
              </div>
              <div className="flex gap-3">
                <Link href="/admin" className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]">Dashboard</Link>
                <Link href="/scanner" className="px-5 py-2.5 rounded-xl text-white text-xs font-semibold hover:bg-white/10 transition-all" style={{border:'1px solid rgba(255,255,255,0.1)'}}>Scanner</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / FOOTER */}
      <footer className="flex flex-col w-full bg-black">
        <div className="w-full border-t border-white/10 pt-32 pb-32 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/[0.03] blur-[100px] rounded-full pointer-events-none"></div>
          <div className="max-w-3xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-[10px] font-mono uppercase tracking-widest mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              <span>System Ready</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-mono text-white tracking-tight mb-6 typewriter">&gt; init_attendance()</h2>
            <p className="text-neutral-400 max-w-lg font-light leading-relaxed mb-10">Connect to the DeepAttend engine. Mark attendance with a single face scan across all 72 registered students.</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/admin" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-black bg-white rounded-full hover:scale-105 hover:bg-neutral-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Open Dashboard
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
              <Link href="/scanner" className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-neutral-300 rounded-full hover:bg-white/10 transition-all" style={{border:'1px solid rgba(255,255,255,0.1)'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Start Scanner
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-[#050505] w-full border-t border-white/5 py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-col gap-6">
            {/* Top row */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                </div>
                <span className="text-white text-xs font-semibold">DeepAttend</span>
                <span className="text-neutral-600 text-[10px] font-mono">Keystone School of Engineering · TE Comp A · AY 25-26 SEM-I</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-3 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]"></div>
                  <span className="text-[10px] font-mono text-neutral-300 uppercase tracking-widest">All systems nominal</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-600 border border-white/10 px-2 py-0.5 rounded">v2.0.0</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.04]"></div>

            {/* Bottom row — copyright + developer + github */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[11px] text-neutral-600">
                © {new Date().getFullYear()} DeepAttend · All rights reserved · Dept. of Computer Engineering, AY 2025–26
              </p>
              <div className="flex items-center gap-4">
                <span className="text-[11px] text-neutral-600">
                  Developed by <span className="text-neutral-400 font-semibold">Shrawani Gawade</span> · TE Computer Engineering
                </span>
                <a
                  href="https://github.com/shrawaniGawade07"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-neutral-500 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-neutral-300"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  shrawaniGawade07
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
