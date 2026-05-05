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
                className="text-sm font-semibold bg-[#1a7a45] hover:bg-[#155f36] text-white rounded-xl px-4 py-2 transition-colors"
                onClick={() => { setWalkthroughInitialView(undefined); setShowWalkthrough(true); }}
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
                  <button className="w-full py-2.5 text-sm font-semibold bg-[#1a7a45] text-white rounded-xl hover:bg-[#155f36]"
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
      <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-20 overflow-hidden bg-white">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(circle, #d1e8db 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        {/* Soft green glow top-left */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#1a7a45]/8 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 border border-[#1a7a45]/30 bg-[#e8f5ee] rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a7a45] animate-pulse" />
              <span className="text-[#1a7a45] text-xs font-semibold tracking-wide uppercase">Gordon College · DEIU Platform · RA 11313 &amp; RA 7877</span>
            </div>

            {/* Headline */}
            <h1 className="text-[clamp(3rem,8vw,6.5rem)] font-black leading-[0.9] tracking-tight text-gray-900 mb-8">
              Speak up.<br />
              <span className="text-[#1a7a45]">Be heard.</span><br />
              <span className="text-gray-400">Be safe.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed max-w-xl mb-10">
              A confidential platform for Gordon College students to file complaints under the <span className="font-semibold text-gray-700">Safe Spaces Act (RA 11313)</span> and the <span className="font-semibold text-gray-700">Anti-Sexual Harassment Act (RA 7877)</span> — track cases, and communicate directly with DEIU, anonymously if you choose.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-14">
              <button
                onClick={() => setShowWalkthrough(true)}
                className="group inline-flex items-center justify-center gap-2.5 bg-[#1a7a45] hover:bg-[#155f36] text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all duration-200 shadow-sm"
              >
                Get Started — It's Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => { setWalkthroughInitialView("login"); setShowWalkthrough(true); }}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium text-base px-8 py-4 rounded-2xl transition-all duration-200 shadow-sm"
              >
                Log In
              </button>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap gap-4">
              {[
                { icon: <ShieldCheck className="w-4 h-4" />, label: "End-to-end encrypted" },
                { icon: <EyeOff className="w-4 h-4" />,      label: "Anonymous filing" },
                { icon: <Users className="w-4 h-4" />,        label: "DEIU managed" },
              ].map((t) => (
                <span key={t.label} className="flex items-center gap-1.5 text-sm text-gray-400">
                  <span className="text-[#1a7a45]">{t.icon}</span>
                  {t.label}
                </span>
              ))}
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
      <section id="features" className="bg-white py-28 lg:py-36 border-t border-gray-100">
        <div
          ref={featuresRef.ref as React.RefObject<HTMLDivElement>}
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          {/* Section label */}
          <div className={`mb-16 transition-all duration-700 ${featuresRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold text-[#1a7a45] uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight max-w-lg">
              Built for students.<br />Backed by law &amp; trust.
            </h2>
          </div>

          {/* Bento grid — consistent card language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Large card */}
            <div className={`lg:row-span-2 bg-gray-50 border border-gray-200 rounded-3xl p-8 flex flex-col justify-between min-h-[300px] transition-all duration-700 delay-100 ${featuresRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>                <div>
                <div className="w-11 h-11 bg-[#1a7a45] rounded-2xl flex items-center justify-center mb-6">
                  <ClipboardList className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">File a Complaint</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Submit securely and confidentially under <span className="font-semibold text-gray-700">RA 11313 (Safe Spaces Act)</span> or <span className="font-semibold text-gray-700">RA 7877 (Anti-Sexual Harassment Act)</span>. Stay anonymous or identify yourself — the choice is always yours.</p>
              </div>
              <ul className="mt-8 space-y-2.5">
                {["Anonymous or identified", "Secure document upload", "Evidence attachment"].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1a7a45] flex-shrink-0" /> {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Standard cards — same background, same border, same radius */}
            {[
              {
                icon: <Activity className="w-5 h-5 text-[#1a7a45]" />,
                title: "Real-Time Tracker",
                desc: "Monitor your case status live. Get notified at every milestone.",
                delay: "delay-150",
              },
              {
                icon: <MessageCircle className="w-5 h-5 text-[#1a7a45]" />,
                title: "Direct Messaging",
                desc: "Communicate securely with DEIU administrators — encrypted and private.",
                delay: "delay-200",
              },
              {
                icon: <Lock className="w-5 h-5 text-[#1a7a45]" />,
                title: "Privacy First",
                desc: "End-to-end encryption. Your data is yours alone.",
                delay: "delay-250",
              },
              {
                icon: <BookOpen className="w-5 h-5 text-[#1a7a45]" />,
                title: "Resources Hub",
                desc: "Policy guides on RA 11313 and RA 7877, FAQs, and support articles to help you navigate your rights and the complaint process.",
                delay: "delay-300",
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`bg-gray-50 border border-gray-200 rounded-3xl p-7 transition-all duration-700 ${card.delay} ${featuresRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              >
                <div className="w-11 h-11 bg-white border border-gray-200 rounded-2xl flex items-center justify-center mb-5">
                  {card.icon}
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section className="bg-white py-28 lg:py-36 border-t border-gray-100">
        <div
          ref={stepsRef.ref as React.RefObject<HTMLDivElement>}
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className={`mb-20 transition-all duration-700 ${stepsRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold text-[#1a7a45] uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight">
              Three steps<br />to resolution.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { n: "01", title: "Submit",  desc: "Fill out the secure complaint form. Choose to stay anonymous or identify yourself." },
              { n: "02", title: "Track",   desc: "Get real-time status updates and notifications at each stage of your case." },
              { n: "03", title: "Resolve", desc: "Communicate with DEIU administrators directly through secure, encrypted messaging." },
            ].map((s, i) => (
              <div
                key={i}
                className={`relative bg-gray-50 border border-gray-200 rounded-3xl px-8 py-10 overflow-hidden transition-all duration-700 ${stepsRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Decorative number backdrop (higher contrast) */}
                <div className="absolute -top-6 -left-6 w-36 h-36 rounded-[2.25rem] bg-gradient-to-br from-[#1a7a45]/12 to-transparent" />
                <p className="relative text-7xl font-black text-[#1a7a45] mb-6 leading-none select-none">
                  {s.n}
                </p>
                <h3 className="relative text-xl font-black text-gray-900 mb-3">{s.title}</h3>
                <p className="relative text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About & Mission ──────────────────────────────────────────── */}
      <section id="about" className="bg-white py-28 lg:py-36 border-t border-gray-100">
        <div
          ref={missionRef.ref as React.RefObject<HTMLDivElement>}
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <div className={`transition-all duration-700 ${missionRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <p className="text-xs font-bold text-[#1a7a45] uppercase tracking-widest mb-4">About & Mission</p>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight mb-8">
                Every student<br />deserves to be<br /><span className="text-[#1a7a45]">heard.</span>
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
                { icon: <Lock className="w-5 h-5 text-[#1a7a45]" />, title: "Secure & Private", desc: "End-to-end encryption with anonymous filing options. Your identity is always protected." },
                { icon: <HeadphonesIcon className="w-5 h-5 text-[#1a7a45]" />, title: "DEIU-Backed Support", desc: "Direct access to trained DEIU administrators who guide you through every step." },
                { icon: <GraduationCap className="w-5 h-5 text-[#1a7a45]" />, title: "Know Your Rights", desc: "Educational resources on RA 11313 and RA 7877, policies, and guides to help you understand the complaint process and your legal protections." },
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
      <section id="mission" className="bg-white py-28 lg:py-36 border-t border-gray-100">
        <div
          ref={ctaRef.ref as React.RefObject<HTMLDivElement>}
          className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className={`bg-[#1a7a45] rounded-3xl px-10 py-20 sm:px-20 sm:py-24 text-center transition-all duration-700 ${ctaRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-5">Ready?</p>
            <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight mb-6">
              Make your voice<br />heard today.
            </h2>
            <p className="text-white/70 text-base sm:text-lg max-w-md mx-auto leading-relaxed mb-10">
              Join Gordon College students building a safer, more accountable community through transparent action — guided by the Safe Spaces Act (RA 11313) and Anti-Sexual Harassment Act (RA 7877).
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowWalkthrough(true)}
                className="group inline-flex items-center justify-center gap-2.5 bg-white text-[#1a7a45] hover:bg-gray-50 font-bold text-base px-8 py-4 rounded-2xl transition-all duration-200"
              >
                Get Started — It's Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => { setWalkthroughInitialView("login"); setShowWalkthrough(true); }}
                className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/10 border border-white/30 text-white font-medium text-base px-8 py-4 rounded-2xl transition-all duration-200"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3">
            <img src="/LOGO.png" alt="GC Logo" className="w-8 h-8 object-contain opacity-70" />
            <span className="font-bold text-gray-400 text-base">SpeakUp GC</span>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link to="/privacy" className="hover:text-gray-700 transition-colors">Privacy Policy</Link>
              <Link to="/terms"   className="hover:text-gray-700 transition-colors">Terms</Link>
              <Link to="/mission" className="hover:text-gray-700 transition-colors">Mission</Link>
            </div>
            <p className="text-xs text-gray-300">© {new Date().getFullYear()} SpeakUp GC · Complaints handled under RA 11313 (Safe Spaces Act) &amp; RA 7877 (Anti-Sexual Harassment Act)</p>
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
