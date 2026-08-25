import React, { useEffect, useRef, useState } from "react";
import {
  Lock, GraduationCap, Menu, X, MessageCircle, ClipboardList,
  Activity, EyeOff, BookOpen, HeadphonesIcon, CheckCircle2,
  ArrowRight, ShieldCheck, Users,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "../compat/router";
import { useRouter } from "next/navigation";
import WalkthroughModal from "../components/WalkthroughModal";
import { ThemeToggle } from "../components/ThemeToggle";

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

const SHELL = "w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24";

const QUICK_ACTIONS = [
  { icon: ClipboardList, title: "File a Complaint", desc: "Submit securely under RA 11313 & RA 7877." },
  { icon: Activity, title: "Track Your Case", desc: "Real-time status updates at every milestone." },
  { icon: MessageCircle, title: "Direct Messaging", desc: "Encrypted chat with DEIU administrators." },
  { icon: BookOpen, title: "Know Your Rights", desc: "Guides, policies, and legal protections." },
];

const STEPS = [
  { n: "01", title: "Submit", desc: "Fill out the secure form. Stay anonymous or identify yourself." },
  { n: "02", title: "Track", desc: "Get real-time updates at each stage of your case." },
  { n: "03", title: "Resolve", desc: "Communicate with DEIU through encrypted messaging." },
];

const DID_YOU_KNOW = [
  {
    icon: ShieldCheck,
    color: "green",
    title: "Safe Spaces Act (RA 11313)",
    points: ["Protects from gender-based harassment in public & online spaces", "Covers catcalling, unwanted remarks, and cyber harassment", "Schools must establish complaint mechanisms"],
  },
  {
    icon: Users,
    color: "purple",
    title: "Gender-Based Violence",
    points: ["Includes physical, sexual, and psychological abuse", "Right to report without fear of retaliation", "Support: counseling, legal aid, and safe spaces"],
  },
  {
    icon: X,
    color: "red",
    title: "Bawal Bastos!",
    points: ["Unwanted touching is harassment", "Sexual jokes create a hostile environment", "No means no — consent must be clear and ongoing"],
  },
];

const Landing = () => {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughInitialView, setWalkthroughInitialView] = useState<
    "choose" | "login" | "signup-email" | undefined
  >(undefined);
  const [searchParams] = useSearchParams();
  const router = useRouter();
  const consumedAuthRef = useRef(false);

  useEffect(() => {
    if (consumedAuthRef.current) return;
    const authParam = searchParams.get("auth");
    if (authParam === "login" || authParam === "signup") {
      consumedAuthRef.current = true;
      setWalkthroughInitialView(authParam === "login" ? "login" : "signup-email");
      setShowWalkthrough(true);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

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

  const aboutRef = useInView();

  const openWalkthrough = (view?: "login") => {
    setWalkthroughInitialView(view);
    setShowWalkthrough(true);
  };

  // ── Inline Header (kept as-is) ───────────────────────────────────
  const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    return (
      <header className="fixed top-0 z-50 w-full">
        <div className={`${SHELL} pt-4`}>
          <div className="flex h-14 items-center justify-between bg-white/90 dark:bg-[#111614]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl px-5 shadow-lg shadow-gray-900/5 dark:shadow-black/40">
            <Link to="/" className="flex items-center gap-3">
              <img src="/LOGO.png" alt="GC Logo" className="w-10 h-10 object-contain" />
              <span className="text-lg font-bold text-gray-900 tracking-tight">SpeakUp GC</span>
            </Link>
            <nav className="hidden lg:flex items-center gap-1">
              <Link to="#" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-3 py-1.5 text-sm font-medium text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors">Home</Link>
              <Link to="/#features" className="px-3 py-1.5 text-sm font-medium text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors">Features</Link>
              <Link to="/#about" className="px-3 py-1.5 text-sm font-medium text-gray-500 rounded-lg hover:text-gray-900 hover:bg-gray-100 transition-colors">About</Link>
            </nav>
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              <button
                className="text-sm font-medium text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={() => openWalkthrough("login")}
              >Log in</button>
              <button
                className="text-sm font-semibold bg-[#1D9E75] hover:bg-[#178F65] text-white rounded-xl px-4 py-2 transition-colors"
                onClick={() => openWalkthrough()}
                title="Sign up to file a complaint"
              >Get Started</button>
            </div>
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {isMenuOpen && (
            <div className="lg:hidden mt-2 bg-white/95 dark:bg-[#111614]/95 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden">
              <nav className="flex flex-col p-3 gap-1">
                <Link to="/#features" className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>Features</Link>
                <Link to="/#about" className="px-3 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100" onClick={() => setIsMenuOpen(false)}>About</Link>
                <div className="border-t border-gray-100 mt-1 pt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1 py-1">
                    <span className="text-xs font-medium text-gray-500">Appearance</span>
                    <ThemeToggle />
                  </div>
                  <button className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                    onClick={() => { setIsMenuOpen(false); openWalkthrough("login"); }}>Log in</button>
                  <button className="w-full py-2.5 text-sm font-semibold bg-[#1D9E75] text-white rounded-xl hover:bg-[#178F65]"
                    onClick={() => { setIsMenuOpen(false); openWalkthrough(); }}>Get Started</button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] dark:bg-[#0f1412] text-gray-900 font-sans">
      <Header />

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white dark:bg-[#111614] border-b border-gray-200 dark:border-white/10 pt-28 pb-10 lg:pt-36 lg:pb-16">
        {/* Soft mint mesh — organic blobs sitting behind the headline */}
        <div className="absolute inset-0 pointer-events-none dark:opacity-[0.18]" aria-hidden="true">
          <div
            className="absolute -left-32 -top-24 h-[26rem] w-[38rem] bg-gradient-to-br from-[#1D9E75]/25 via-emerald-200/40 to-transparent blur-3xl"
            style={{ borderRadius: "58% 42% 46% 54% / 52% 44% 56% 48%" }}
          />
          <div
            className="absolute -left-10 top-40 h-[22rem] w-[30rem] bg-gradient-to-tr from-teal-200/40 via-[#1D9E75]/15 to-transparent blur-3xl"
            style={{ borderRadius: "44% 56% 62% 38% / 48% 58% 42% 52%" }}
          />
          <div
            className="absolute -right-24 -top-28 h-[30rem] w-[30rem] bg-gradient-to-bl from-emerald-100/60 via-[#1D9E75]/10 to-transparent blur-3xl"
            style={{ borderRadius: "50% 50% 42% 58% / 56% 46% 54% 44%" }}
          />
        </div>
        {/* Subtle dot pattern — fades out toward the right of the viewport */}
        <div
          className="absolute inset-y-0 left-0 w-2/3 pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(circle, #1D9E75 0.5px, transparent 0.5px)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(to right, black 30%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, black 30%, transparent 100%)",
          }}
        />
        <div className={`relative ${SHELL}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-20 items-center">
              {/* Left: Text */}
              <div className="max-w-2xl">
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-gray-900 mb-4">SpeakUp GC</h1>
                <p className="text-base sm:text-lg text-gray-500 leading-relaxed mb-7">
                  A confidential platform for Gordon College students to file complaints, track cases, and communicate directly with DEIU — anonymously if you choose. Protected under Philippine law.
                </p>
                <div className="flex flex-wrap gap-3 mb-8">
                  <button
                    onClick={() => openWalkthrough()}
                    className="inline-flex items-center gap-2 bg-[#1D9E75] hover:bg-[#178F65] text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-[#1D9E75]/20 transition-colors"
                  >
                    Get Started <ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href="#about"
                    className="inline-flex items-center gap-1.5 border border-gray-300 dark:border-white/15 text-gray-700 font-medium text-sm px-6 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Learn more
                  </a>
                </div>
                <div className="flex flex-wrap gap-5">
                  {[
                    { icon: ShieldCheck, label: "Encrypted" },
                    { icon: EyeOff, label: "Anonymous" },
                    { icon: Users, label: "DEIU managed" },
                  ].map((t) => (
                    <span key={t.label} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <t.icon className="w-3.5 h-3.5 text-[#1D9E75]" /> {t.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: Dashboard Illustration */}
              <div className="hidden lg:block w-full max-w-xl ml-auto">
                <div className="bg-white dark:bg-[#18241f] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.55)] border border-gray-200 dark:border-white/10 overflow-hidden">
                  <div className="bg-green-50 dark:bg-[#1D9E75]/15 border-b border-green-200 dark:border-[#1D9E75]/25 px-5 py-3 flex items-start gap-3">
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Complaint Filed!</p>
                      <p className="text-xs text-gray-600">CASE-002 is now active</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-[#141a18] dark:to-[#1c2a24] border border-gray-200 dark:border-white/10 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-[#1D9E75] uppercase tracking-wide">Active Case</p>
                          <p className="text-xl font-black text-gray-900 mt-0.5">CASE-002</p>
                          <p className="text-xs text-gray-500 mt-0.5">Sexual harassment in classroom</p>
                        </div>
                        <div className="bg-[#1D9E75] rounded-lg px-3 py-1.5">
                          <p className="text-[10px] text-white font-bold">Anonymous Mode</p>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { done: true, title: "Complaint Filed", sub: "Jan 14, 2026" },
                          { done: true, title: "Under Review", sub: "Jan 15, 2026" },
                          { active: true, title: "Investigation Ongoing", sub: "In progress" },
                          { pending: true, title: "Decision Pending", sub: "" },
                        ].map((step) => (
                          <div key={step.title} className={`flex items-center gap-3 ${step.pending ? "opacity-40" : ""}`}>
                            {step.done ? (
                              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            ) : step.active ? (
                              <div className="w-5 h-5 bg-[#1D9E75] rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0" />
                            )}
                            <div>
                              <p className={`text-sm font-bold ${step.active ? "text-[#1D9E75]" : step.pending ? "text-gray-400" : "text-gray-900"}`}>{step.title}</p>
                              {step.sub && <p className={`text-xs ${step.active ? "text-green-600 font-medium" : "text-gray-500"}`}>{step.sub}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </section>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <section id="features" className="pt-8 pb-6">
        <div className={SHELL}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((item) => (
              <button
                key={item.title}
                onClick={() => openWalkthrough()}
                className="group text-left bg-white dark:bg-[#18241f] border border-gray-200 dark:border-white/10 hover:border-[#1D9E75]/50 rounded-xl p-4 transition-all hover:shadow-md"
              >
                <div className="w-9 h-9 bg-green-50 dark:bg-white/5 rounded-lg flex items-center justify-center mb-2 group-hover:bg-green-100 dark:group-hover:bg-white/10 transition-colors">
                  <item.icon className="w-4.5 h-4.5 text-[#1D9E75]" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-0.5">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-snug">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Banner ───────────────────────────────────────────── */}
      <section className="pb-6">
        <div className={SHELL}>
          <div className="bg-white dark:bg-[#18241f] border border-gray-200 dark:border-white/10 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 bg-green-50 dark:bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#1D9E75]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 mb-0.5">Protected & confidential records</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                All complaints handled under RA 11313 &amp; RA 7877. End-to-end encrypted with anonymous filing options — your identity is never disclosed without consent.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 flex-shrink-0">
              {[
                { icon: ShieldCheck, label: "Encrypted" },
                { icon: EyeOff, label: "Anonymous" },
                { icon: Users, label: "DEIU managed" },
              ].map((t) => (
                <span key={t.label} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <t.icon className="w-3.5 h-3.5 text-[#1D9E75]" /> {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section className="pb-6">
        <div className={SHELL}>
          <div className="bg-white dark:bg-[#18241f] border border-gray-200 dark:border-white/10 rounded-xl p-5 sm:p-6">
            <p className="text-[10px] font-bold text-[#1D9E75] uppercase tracking-widest mb-1">Process</p>
            <h2 className="text-lg font-black text-gray-900 mb-4">Three steps to resolution</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {STEPS.map((s) => (
                <div key={s.n} className="bg-gray-50 dark:bg-white/[0.05] rounded-lg p-3">
                  <p className="text-2xl font-black text-[#1D9E75]/30 leading-none mb-1">{s.n}</p>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-xs text-gray-500 leading-snug">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── About (compact) ────────────────────────────────────────── */}
      <section id="about" className="pb-6">
        <div
          ref={aboutRef.ref as React.RefObject<HTMLDivElement>}
          className={SHELL}
        >
          <div className={`bg-white dark:bg-[#18241f] border border-gray-200 dark:border-white/10 rounded-xl p-5 sm:p-6 transition-all duration-500 ${aboutRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div>
                <p className="text-[10px] font-bold text-[#1D9E75] uppercase tracking-widest mb-1">About & Mission</p>
                <h2 className="text-lg font-black text-gray-900 mb-2">
                  Every student deserves to be <span className="text-[#1D9E75]">heard.</span>
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  SpeakUp GC empowers Gordon College students with a safe, confidential channel to raise concerns under the Safe Spaces Act (RA 11313) and Anti-Sexual Harassment Act (RA 7877). We bridge the gap between students and DEIU — ensuring every complaint is heard, tracked, and resolved with care.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {[
                  { icon: Lock, title: "Secure & Private", desc: "End-to-end encryption with anonymous filing." },
                  { icon: HeadphonesIcon, title: "DEIU-Backed Support", desc: "Trained administrators guide every step." },
                  { icon: GraduationCap, title: "Know Your Rights", desc: "Resources on RA 11313, RA 7877, and policies." },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3 bg-gray-50 dark:bg-white/[0.05] rounded-lg p-3">
                    <div className="w-8 h-8 bg-white dark:bg-[#1c2a24] border border-gray-200 dark:border-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-[#1D9E75]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{item.title}</p>
                      <p className="text-[11px] text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Did You Know (compact) ─────────────────────────────────── */}
      <section className="pb-6">
        <div className={SHELL}>
          <div className="mb-4">
            <h2 className="text-lg font-black text-gray-900">Did You Know?</h2>
            <p className="text-xs text-gray-500">Important facts about your rights under Philippine law</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DID_YOU_KNOW.map((card) => {
              const colorMap = {
                green: { bg: "bg-green-50 dark:bg-[#1D9E75]/15", icon: "text-green-600 dark:text-emerald-400", check: "text-green-600 dark:text-emerald-400" },
                purple: { bg: "bg-purple-50 dark:bg-purple-500/15", icon: "text-purple-600 dark:text-purple-300", check: "text-purple-600 dark:text-purple-300" },
                red: { bg: "bg-red-50 dark:bg-red-500/15", icon: "text-red-600 dark:text-red-400", check: "text-red-600 dark:text-red-400" },
              }[card.color];
              return (
                <div key={card.title} className="bg-white dark:bg-[#18241f] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                  <div className={`w-9 h-9 ${colorMap.bg} rounded-lg flex items-center justify-center mb-2`}>
                    <card.icon className={`w-4 h-4 ${colorMap.icon}`} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{card.title}</h3>
                  <ul className="space-y-1.5">
                    {card.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-1.5 text-[11px] text-gray-600 leading-snug">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${colorMap.check} flex-shrink-0 mt-0.5`} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Know Your Rights CTA */}
          <div className="landing-signin-bar mt-4 border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[#1D9E75]" />
              <div>
                <p className="text-sm font-bold text-gray-900">Sign in to access the full knowledge base</p>
                <p className="text-xs text-gray-500">Complete guides, policies, FAQs, and step-by-step procedures</p>
              </div>
            </div>
            <Link
              to="/?auth=login"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#1D9E75] hover:bg-[#178F65] text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0"
            >
              Sign In <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compact Footer ─────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#111614] border-t border-gray-200 dark:border-white/10">
        <div className={`${SHELL} py-8`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/LOGO.png" alt="GC Logo" className="w-8 h-8 object-contain flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-gray-900 text-sm block">SpeakUp GC</span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A confidential platform for Gordon College students to file complaints and communicate with DEIU.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <h4 className="text-xs font-bold text-gray-900 mb-2 sm:text-right">Quick Links</h4>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
                <li><Link to="/#features" className="text-xs text-gray-500 hover:text-[#1D9E75] whitespace-nowrap">Features</Link></li>
                <li><Link to="/#about" className="text-xs text-gray-500 hover:text-[#1D9E75] whitespace-nowrap">About</Link></li>
                <li><Link to="/privacy" className="text-xs text-gray-500 hover:text-[#1D9E75] whitespace-nowrap">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-xs text-gray-500 hover:text-[#1D9E75] whitespace-nowrap">Terms & Conditions</Link></li>
                <li><Link to="/mission" className="text-xs text-gray-500 hover:text-[#1D9E75] whitespace-nowrap">Mission</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] text-gray-400 text-center">
              © {new Date().getFullYear()} SpeakUp GC · Complaints handled under RA 11313 (Safe Spaces Act) &amp; RA 7877 (Anti-Sexual Harassment Act)
            </p>
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
