import React, { useEffect, useRef, useState } from "react";
import {
  Lock, GraduationCap, Menu, X, MessageCircle, ClipboardList,
  Activity, EyeOff, BookOpen, HeadphonesIcon, CheckCircle2,
  ArrowRight, ShieldCheck, Users, ChevronDown,
} from "lucide-react";
import { Link, useLocation, useSearchParams, useNavigate } from "../compat/router";
import WalkthroughModal from "../components/WalkthroughModal";

function useInView(options: IntersectionObserverInit = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { setInView(true); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.unobserve(el); }
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px", ...options });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ref, inView };
}

const Landing = () => {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughInitialView, setWalkthroughInitialView] = useState<
    "choose" | "login" | "signup-email" | undefined
  >(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigateTo = useNavigate();

  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (authParam === "login" || authParam === "signup") {
      setWalkthroughInitialView(authParam === "login" ? "login" : "signup-email");
      setShowWalkthrough(true);
      searchParams.delete("auth");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const hasSeen = localStorage.getItem("speakup_walkthrough_seen");
    const authParam = searchParams.get("auth");
    if (!hasSeen && !authParam) {
      const timer = setTimeout(() => {
        setWalkthroughInitialView(undefined);
        setShowWalkthrough(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  const featuresRef = useInView();
  const stepsRef    = useInView();
  const missionRef  = useInView();
  const ctaRef      = useInView();

  // ── Inline Header ────────────────────────────────────────────────
  const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
      <header className="fixed top-0 z-50 w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex h-14 items-center justify-between bg-white border border-gray-300 rounded-2xl px-5 shadow-lg">
            <Link to="/" className="flex items-center gap-3">
              <img src="/LOGO.png" alt="GC Logo" className="w-10 h-10 object-contain" />
              <span className="text-lg font-bold text-gray-900 tracking-tight">SpeakUp GC</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              <Link to="#" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="px-3 py-1.5 text-sm font-medium text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors">Home</Link>
              <Link to="/#features" className="px-3 py-1.5 text-sm font-medium text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors">Features</Link>
              <Link to="/#about"    className="px-3 py-1.5 text-sm font-medium text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors">About</Link>
            </nav>
            <div className="hidden lg:flex items-center gap-2">
              <button
                className="text-sm font-medium text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={() => { setWalkthroughInitialView("login"); setShowWalkthrough(true); }}
              >Log in</button>
              <button
                className="text-sm font-semibold bg-[#1D9E75] hover:bg-[#178F65] text-white rounded-xl px-4 py-2 transition-colors"
                onClick={() => { setWalkthroughInitialView(undefined); setShowWalkthrough(true); }}
                title="Sign up to file a complaint"
              >Get Started</button>
            </div>
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {isMenuOpen && (
            <div className="lg:hidden mt-2 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
              <nav className="flex flex-col p-3 gap-1">
                <Link to="/#features" className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>Features</Link>
                <Link to="/#about"    className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>About</Link>
                <div className="border-t border-gray-100 mt-1 pt-2 flex flex-col gap-2">
                  <button className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                    onClick={() => { setIsMenuOpen(false); setWalkthroughInitialView("login"); setShowWalkthrough(true); }}>Log in</button>
                  <button className="w-full py-2.5 text-sm font-semibold bg-[#1D9E75] text-white rounded-xl hover:bg-[#178F65]"
                    onClick={() => { setIsMenuOpen(false); setWalkthroughInitialView(undefined); setShowWalkthrough(true); }}>Get Started</button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col justify-center pt-32 pb-20 overflow-hidden bg-gradient-to-br from-white via-green-50/30 to-white">
        {/* Enhanced dot grid with animation */}
        <div
          className="absolute inset-0 opacity-40 animate-pulse"
          style={{ 
            backgroundImage: "radial-gradient(circle, #1D9E75 1px, transparent 1px)", 
            backgroundSize: "32px 32px",
            animationDuration: "4s"
          }}
        />
        {/* Multiple green glows for depth */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#1D9E75]/10 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/8 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "8s", animationDelay: "1s" }} />
        
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="max-w-xl">
              {/* Headline with staggered animation */}
              <h1 className="text-[clamp(3rem,8vw,5rem)] font-black leading-[0.9] tracking-tight text-gray-900 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <span className="inline-block animate-in fade-in slide-in-from-left-4 duration-700">Speak up.</span><br />
                <span className="text-[#1D9E75] inline-block animate-in fade-in slide-in-from-left-4 duration-700 delay-150">Be heard.</span><br />
                <span className="text-gray-600 inline-block animate-in fade-in slide-in-from-left-4 duration-700 delay-300">Be safe.</span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                A confidential platform for Gordon College students to file complaints, track cases, and communicate directly with DEIU — anonymously if you choose. Protected under Philippine law.
              </p>
              <a href="#about" className="inline-flex items-center gap-1 text-sm font-medium text-[#1D9E75] hover:text-[#178F65] mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-600">
                Learn more about your rights
                <ArrowRight className="w-4 h-4" />
              </a>

              {/* CTAs with hover effects */}
              <div className="flex flex-col sm:flex-row gap-3 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
                <button
                  onClick={() => setShowWalkthrough(true)}
                  className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#1D9E75] to-emerald-600 hover:from-[#178F65] hover:to-emerald-700 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  Get Started 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                <button
                  onClick={() => { setWalkthroughInitialView("login"); setShowWalkthrough(true); }}
                  className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-green-50 border-2 border-gray-300 hover:border-[#1D9E75] text-gray-700 hover:text-[#1D9E75] font-medium text-base px-8 py-4 rounded-2xl transition-all duration-300"
                >
                  Log In
                </button>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-900">
                {[
                  { icon: <ShieldCheck className="w-4 h-4" />, label: "End-to-end encrypted" },
                  { icon: <EyeOff className="w-4 h-4" />,      label: "Anonymous filing" },
                  { icon: <Users className="w-4 h-4" />,        label: "DEIU managed" },
                ].map((t) => (
                  <span key={t.label} className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <span className="text-[#1D9E75]">{t.icon}</span>
                    {t.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Dashboard Illustration */}
            <div className="relative hidden lg:block animate-in fade-in slide-in-from-right-8 duration-700 delay-300">
              <div className="relative">
                {/* Main dashboard card with elevated shadow */}
                <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-200 p-8 space-y-6">
                  {/* Success notification - attached to card */}
                  <div className="-mt-8 -mx-8 mb-4 bg-green-50 border-2 border-green-200 rounded-t-3xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Complaint Filed!</p>
                      <p className="text-xs text-gray-600">CASE-002 is now active</p>
                    </div>
                  </div>

                  {/* Active case card */}
                  <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold text-[#1D9E75] uppercase tracking-wide">Active Case</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">CASE-002</p>
                        <p className="text-xs text-gray-500 mt-1">Sexual harassment in classroom</p>
                      </div>
                      <div className="bg-[#1D9E75] rounded-xl px-4 py-2">
                        <p className="text-xs text-white font-bold">Anonymous Mode</p>
                      </div>
                    </div>

                    {/* Timeline - Matching actual system workflow */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">Complaint Filed</p>
                          <p className="text-xs text-gray-500">Jan 14, 2026</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">Under Review</p>
                          <p className="text-xs text-gray-500">Jan 15, 2026</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-[#1D9E75] rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#1D9E75]">Investigation Ongoing</p>
                          <p className="text-xs text-green-600 font-medium">In progress</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 opacity-40">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-400">Decision Pending</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-30">
          <span className="text-xs text-gray-500 tracking-widest uppercase">Scroll</span>
          <ChevronDown className="w-4 h-4 text-gray-500 animate-bounce" />
        </div>
      </section>

      {/* ── Features Bento ───────────────────────────────────────────── */}
      <section id="features" className="relative bg-white py-28 lg:py-36 border-t border-gray-100 overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{ 
            backgroundImage: "radial-gradient(circle, #1D9E75 1px, transparent 1px)", 
            backgroundSize: "32px 32px"
          }}
        />
        <div
          ref={featuresRef.ref as React.RefObject<HTMLDivElement>}
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          {/* Section label */}
          <div className={`mb-16 transition-all duration-700 ${featuresRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold text-[#1D9E75] uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight max-w-lg">
              Built for the community.<br />Backed by law &amp; trust.
            </h2>
          </div>

          {/* Bento grid — uniform card styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* File a Complaint card - same size as others */}
            <div className={`bg-white border-2 border-[#1D9E75]/30 hover:border-[#1D9E75] rounded-3xl p-8 flex flex-col h-full transition-all duration-700 delay-100 hover:shadow-xl hover:scale-[1.02] ${featuresRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <div className="w-12 h-12 bg-green-50 border-2 border-[#1D9E75]/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <ClipboardList className="w-6 h-6 text-[#1D9E75]" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3">File a Complaint</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">Submit securely and confidentially under <span className="font-semibold text-gray-700">RA 11313 (Safe Spaces Act)</span> or <span className="font-semibold text-gray-700">RA 7877 (Anti-Sexual Harassment Act)</span>. Stay anonymous or identify yourself — the choice is always yours.</p>
              <ul className="mt-auto space-y-2.5">
                {["Anonymous or identified", "Secure document upload", "Evidence attachment"].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-[#1D9E75] flex-shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Standard cards — uniform height and styling */}
            {[
              {
                icon: <Activity className="w-6 h-6 text-[#1D9E75]" />,
                title: "Real-Time Tracker",
                desc: "Monitor your case status live. Get notified at every milestone.",
                delay: "delay-150",
              },
              {
                icon: <MessageCircle className="w-6 h-6 text-[#1D9E75]" />,
                title: "Direct Messaging",
                desc: "Communicate securely with DEIU administrators — encrypted and private.",
                delay: "delay-200",
              },
              {
                icon: <Lock className="w-6 h-6 text-[#1D9E75]" />,
                title: "Privacy First",
                desc: "End-to-end encryption. Your data is yours alone.",
                delay: "delay-250",
              },
              {
                icon: <BookOpen className="w-6 h-6 text-[#1D9E75]" />,
                title: "Resources Hub",
                desc: "Policy guides on RA 11313 and RA 7877, FAQs, and support articles to help you navigate your rights and the complaint process.",
                delay: "delay-300",
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`bg-white border-2 border-[#1D9E75]/30 hover:border-[#1D9E75] rounded-3xl p-8 flex flex-col h-full transition-all duration-700 hover:shadow-xl hover:scale-[1.02] ${card.delay} ${featuresRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <div className="w-12 h-12 bg-green-50 border-2 border-[#1D9E75]/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  {card.icon}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{card.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="relative bg-white py-28 lg:py-36 border-t border-gray-100 overflow-hidden">
        {/* Dot grid background - reduced opacity for mobile */}
        <div
          className="absolute inset-0 opacity-20 md:opacity-30"
          style={{ 
            backgroundImage: "radial-gradient(circle, #1D9E75 1px, transparent 1px)", 
            backgroundSize: "32px 32px"
          }}
        />
        <div
          ref={stepsRef.ref as React.RefObject<HTMLDivElement>}
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className={`mb-20 transition-all duration-700 ${stepsRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold text-[#1D9E75] uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight">
              Three steps<br />to resolution.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: "01", title: "Submit",  desc: "Fill out the secure complaint form. Choose to stay anonymous or identify yourself." },
              { n: "02", title: "Track",   desc: "Get real-time status updates and notifications at each stage of your case." },
              { n: "03", title: "Resolve", desc: "Communicate with DEIU administrators directly through secure, encrypted messaging." },
            ].map((s, i) => (
              <div
                key={i}
                className={`group relative bg-gradient-to-br from-white via-green-50/30 to-white border-2 border-[#1D9E75]/20 hover:border-[#1D9E75]/50 rounded-3xl px-8 py-10 overflow-hidden transition-all duration-700 hover:shadow-2xl hover:shadow-[#1D9E75]/10 hover:-translate-y-2 ${stepsRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <p className="relative text-7xl font-black text-[#1D9E75] mb-6 leading-none select-none group-hover:scale-110 transition-transform duration-500">
                  {s.n}
                </p>
                <h3 className="relative text-xl font-black text-gray-900 mb-3 group-hover:text-[#1D9E75] transition-colors duration-300">{s.title}</h3>
                <p className="relative text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#1D9E75]/30 to-transparent group-hover:via-[#1D9E75]/60 transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About & Mission ──────────────────────────────────────────── */}
      <section id="about" className="relative bg-white py-28 lg:py-36 border-t border-gray-100 overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{ 
            backgroundImage: "radial-gradient(circle, #1D9E75 1px, transparent 1px)", 
            backgroundSize: "32px 32px"
          }}
        />
        <div
          ref={missionRef.ref as React.RefObject<HTMLDivElement>}
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <div className={`transition-all duration-700 ${missionRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className="text-xs font-bold text-[#1D9E75] uppercase tracking-widest mb-4">About & Mission</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight mb-8">
                Every student<br />deserves to be<br /><span className="text-[#1D9E75]">heard.</span>
              </h2>
              <p className="text-gray-500 text-base leading-relaxed mb-5">
                SpeakUp GC empowers Gordon College students with a safe, confidential channel to raise concerns under the <span className="font-semibold text-gray-700">Safe Spaces Act (RA 11313)</span> and the <span className="font-semibold text-gray-700">Anti-Sexual Harassment Act (RA 7877)</span>. We bridge the gap between students and DEIU — ensuring every complaint is heard, tracked, and resolved with care.
              </p>
              <p className="text-gray-500 text-base leading-relaxed">
                Our mission is to promote accountability, transparency, and well-being across the Gordon College community — grounded in Philippine law and guided by respect for every student's rights.
              </p>
            </div>

            <div className={`grid grid-cols-1 gap-3 transition-all duration-700 delay-200 ${missionRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              {[
                { icon: <Lock className="w-5 h-5 text-[#1D9E75]" />, title: "Secure & Private", desc: "End-to-end encryption with anonymous filing options. Your identity is always protected." },
                { icon: <HeadphonesIcon className="w-5 h-5 text-[#1D9E75]" />, title: "DEIU-Backed Support", desc: "Direct access to trained DEIU administrators who guide you through every step." },
                { icon: <GraduationCap className="w-5 h-5 text-[#1D9E75]" />, title: "Know Your Rights", desc: "Educational resources on RA 11313 and RA 7877, policies, and guides to help you understand the complaint process and your legal protections." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-6">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">{item.icon}</div>
                  <div>
                    <p className="font-bold text-gray-900 mb-1">{item.title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section id="mission" className="relative bg-gradient-to-br from-gray-50 to-white py-28 lg:py-36 border-t border-gray-100 overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{ 
            backgroundImage: "radial-gradient(circle, #1D9E75 1px, transparent 1px)", 
            backgroundSize: "32px 32px"
          }}
        />
        <div
          ref={ctaRef.ref as React.RefObject<HTMLDivElement>}
          className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className={`max-w-4xl mx-auto text-center transition-all duration-700 ${ctaRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-6">
              Your privacy is our priority.
            </h2>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-12 max-w-3xl mx-auto">
              All complaints and communications are handled with strict confidentiality by the DEIU office. Your identity is never disclosed to respondents without your explicit consent.
            </p>
            
            {/* Privacy features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">Identity Protected</h3>
                <p className="text-sm text-gray-600">Anonymous filing available</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">Admin-Only Access</h3>
                <p className="text-sm text-gray-600">Only DEIU staff can view reports</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">No Public Disclosure</h3>
                <p className="text-sm text-gray-600">Your name stays confidential</p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setShowWalkthrough(true)}
                className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#1D9E75] to-emerald-600 hover:from-[#178F65] hover:to-emerald-700 text-white font-bold text-lg px-10 py-5 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-[#1D9E75]/30 hover:scale-105 active:scale-95"
              >
                Get Started
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Did You Know Section ─────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-b from-white via-green-50/30 to-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Did You Know?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Important facts about your rights and protections under Philippine law
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Safe Spaces Act */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-green-200">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Safe Spaces Act (RA 11313)
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Protects you from gender-based sexual harassment in streets, public spaces, online, and workplaces</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Covers catcalling, wolf-whistling, unwanted sexual remarks, and cyber harassment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Educational institutions must establish mechanisms to address complaints</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Penalties include fines and imprisonment for violators</span>
                </li>
              </ul>
            </div>

            {/* Gender-Based Violence */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-purple-200">
              <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Gender-Based Violence
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Includes physical, sexual, psychological, and economic abuse based on gender</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Affects people of all genders, but disproportionately impacts women and LGBTQ+ individuals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>You have the right to report and seek protection without fear of retaliation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span>Support services include counseling, legal aid, and safe spaces</span>
                </li>
              </ul>
            </div>

            {/* Bawal Bastos */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-red-200">
              <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mb-4">
                <X className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Bawal Bastos!
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Unwanted touching</strong> or physical contact is harassment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Sexual jokes, comments, or gestures</strong> create a hostile environment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Sharing intimate images</strong> without consent is a crime</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span><strong>No means no</strong> — consent must be clear, voluntary, and ongoing</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-red-50/50 rounded-lg border border-red-100">
                <p className="text-xs font-medium text-red-700 text-center">
                  Remember: Respect is not optional. Bastos behavior has consequences.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="max-w-2xl mx-auto">
              <p className="text-xl font-bold text-gray-900 mb-2">
                Know your rights. Speak up.
              </p>
              <p className="text-gray-600 mb-6">
                You are not alone.
              </p>
              <Link
                to="/awareness"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#1D9E75] to-emerald-600 hover:from-[#178F65] hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <BookOpen className="h-5 w-5" />
                Learn More About Your Rights
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-6">
            <img src="/LOGO.png" alt="GC Logo" className="w-10 h-10 object-contain" />
            <span className="font-bold text-gray-700 text-lg">SpeakUp GC</span>
          </div>
          <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <Link to="/privacy" className="text-sm text-gray-600 hover:text-[#1D9E75] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-gray-600 hover:text-[#1D9E75] transition-colors">Terms & Conditions</Link>
              <Link to="/mission" className="text-sm text-gray-600 hover:text-[#1D9E75] transition-colors">Mission</Link>
            </div>
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} SpeakUp GC · Complaints handled under RA 11313 (Safe Spaces Act) &amp; RA 7877 (Anti-Sexual Harassment Act)</p>
          </div>
        </div>
      </footer>

      <WalkthroughModal
        isOpen={showWalkthrough}
        onClose={() => { setShowWalkthrough(false); setWalkthroughInitialView(undefined); }}
        initialView={walkthroughInitialView}
      />
    </div>
  );
};

export default Landing;
