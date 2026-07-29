/**
 * ProfileSetupModal — SpeakUp GC
 *
 * Shown once on first login. Guides the user through:
 *   1. Alias / Pseudonym
 *   2. Privacy Notice acceptance
 *
 * Notification preference is automatically set to "both" (email + in-app).
 *
 * An AI assistant (persona: "Laya") walks the user through each step
 * with warm, reassuring messages — no Gemini API call needed here,
 * the prompts are scripted for reliability and speed.
 *
 * On completion, writes { alias, notificationPreference: "both", profileSetupComplete: true }
 * to Firestore users/{uid} and closes the modal.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { Shield, Bell, User, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "alias" | "terms" | "privacy" | "done";
type NotifPref = "email" | "in-app" | "both";

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: (alias?: string) => void;
}

// ─── Scripted AI messages per step ───────────────────────────────────────────
const STEP_MESSAGES: Record<Step, string> = {
  alias:
    "Hi! I'm Laya, your SpeakUp GC guide. 👋\n\nFirst, let's set up your alias — a pseudonym that will be used to protect your identity in any complaint case. It doesn't have to be your real name. You can use something like \"BlueStar22\" or any name that feels comfortable to you.\n\nYou can change this anytime from My Profile.",
  terms:
    "Perfect! Now, let's review the Terms & Conditions. 📋\n\nThese terms outline acceptable use, your rights, and the legal framework governing SpeakUp GC under Philippine law (RA 11313) and Gordon College CODI.\n\nPlease read carefully and confirm your agreement to proceed.",
  privacy:
    "Thank you for accepting the terms! 🔒\n\nNow, please review our Privacy Policy below.\n\nSpeakUp GC is committed to protecting your personal data in compliance with the Data Privacy Act of 2012 (RA 10173). Your information is handled with strict confidentiality.\n\nYou must separately agree to our privacy practices as required by Philippine law.",
  done: "You're all set! 🌟\n\nWelcome to SpeakUp GC. Your profile is ready and your privacy is protected. You can now access your dashboard anytime.\n\nRemember: you are not alone, and it's safe to speak up.",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileSetupModal({ isOpen, onComplete }: ProfileSetupModalProps) {
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>("alias");
  const [alias, setAlias] = useState("");
  const [aliasError, setAliasError] = useState("");
  const notifPref: NotifPref = "both"; // Always set to "both"
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Typewriter state for the AI bubble
  const [displayedText, setDisplayedText] = useState("");
  const [typing, setTyping] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Run typewriter whenever step changes
  useEffect(() => {
    if (!isOpen) return;
    const fullText = STEP_MESSAGES[step];
    setDisplayedText("");
    setTyping(true);
    let i = 0;

    const tick = () => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i < fullText.length) {
        typewriterRef.current = setTimeout(tick, 14);
      } else {
        setTyping(false);
      }
    };
    typewriterRef.current = setTimeout(tick, 100);
    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, [step, isOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Step progress ───────────────────────────────────────────────────────────
  const steps: Step[] = ["alias", "terms", "privacy", "done"];
  const stepIndex = steps.indexOf(step);

  const stepMeta = [
    { icon: User,        label: "Alias"         },
    { icon: Shield,      label: "Terms"         },
    { icon: Bell,        label: "Privacy"       },
    { icon: CheckCircle2,label: "Done"          },
  ];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAliasNext = () => {
    const trimmed = alias.trim();
    if (!trimmed) { setAliasError("Please enter an alias before continuing."); return; }
    if (trimmed.length < 3) { setAliasError("Your alias must be at least 3 characters."); return; }
    if (trimmed.length > 30) { setAliasError("Your alias must be 30 characters or fewer."); return; }
    setAliasError("");
    setStep("terms");
  };

  const handleTermsNext = () => {
    if (!termsAccepted) return;
    setStep("privacy");
  };

  const handlePrivacyNext = async () => {
    if (!privacyAccepted || !currentUser?.uid) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", currentUser.uid);
      const snap = await getDoc(ref);
      const payload = {
        alias: alias.trim(),
        notificationPreference: notifPref,
        termsAccepted: true,
        privacyAccepted: true,
        profileSetupComplete: true,
        profileSetupCompletedAt: new Date().toISOString(),
      };
      if (snap.exists()) {
        await updateDoc(ref, payload);
      } else {
        await setDoc(ref, {
          ...payload,
          uid: currentUser.uid,
          email: currentUser.email ?? "",
          isActive: true,
          isDeleted: false,
        });
      }
      setStep("done");
    } catch (err) {
      console.error("ProfileSetupModal: could not save profile", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden speakup-modal-shell">

        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-[#1D9E75] to-[#178F65] px-6 pt-6 pb-8">
          <p className="text-white/80 text-xs font-medium uppercase tracking-widest mb-1">SpeakUp GC</p>
          <h2 className="text-white text-xl font-bold">Profile Setup</h2>
          <p className="text-white/70 text-xs mt-0.5">Quick one-time setup to protect your identity</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-5">
            {stepMeta.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === stepIndex;
              const isDone = i < stepIndex;
              return (
                <React.Fragment key={s.label}>
                  <div className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    isActive ? "bg-white text-[#1D9E75]" :
                    isDone   ? "bg-white/30 text-white" :
                               "bg-white/10 text-white/40"
                  )}>
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < stepMeta.length - 1 && (
                    <div className={cn("flex-1 h-px", isDone ? "bg-white/50" : "bg-white/20")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* AI Bubble */}
          <div className="px-6 -mt-4 pt-1 pb-2">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-[#1D9E75]/20 bg-[#E8F5EE]">
              <img src="/speakup_gc_chatbot_3d_1.png" alt="Laya" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#1D9E75] mb-1">Laya · SpeakUp GC Guide</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line max-h-[min(28vh,180px)] overflow-y-auto pr-1">
                {displayedText}
                {typing && <span className="inline-block w-1 h-3.5 bg-[#1D9E75] ml-0.5 animate-pulse rounded-sm" />}
              </p>
            </div>
          </div>
        </div>

          {/* Step Content */}
          <div className="px-6 pt-2 pb-4 space-y-4">

          {/* ── ALIAS ── */}
          {step === "alias" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 block">
                Your Alias / Pseudonym
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => { setAlias(e.target.value); setAliasError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleAliasNext(); }}
                placeholder="e.g. BlueStar22"
                maxLength={30}
                className={cn(
                  "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors",
                  "focus:ring-2 focus:ring-[#1D9E75]/30 focus:border-[#1D9E75]",
                  aliasError ? "border-red-400" : "border-gray-200"
                )}
              />
              {aliasError && <p className="text-xs text-red-500">{aliasError}</p>}
              <p className="text-xs text-gray-400">
                This alias protects your identity in cases. You can change it anytime from My Profile.
              </p>
            </div>
          )}

          {/* ── TERMS & CONDITIONS ── */}
          {step === "terms" && (
            <div className="space-y-3">
              <div className="bg-[#F0FDF4] border border-[#1D9E75]/20 rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-2 max-h-[min(35vh,240px)] overflow-y-auto">
                <p className="font-semibold text-[#178F65] text-sm">Terms & Conditions — SpeakUp GC</p>
                
                <p className="font-semibold text-gray-700 mt-3">1. Acceptable Use</p>
                <p>
                  SpeakUp GC is a platform for reporting gender-based violence and harassment incidents in accordance with Philippine law. You agree to use this platform only for legitimate reporting purposes and not for false, malicious, or defamatory complaints.
                </p>

                <p className="font-semibold text-gray-700 mt-3">2. Eligibility</p>
                <p>
                  This platform is available to students, faculty, staff, and authorized personnel of Gordon College. By using SpeakUp GC, you confirm that you are eligible to file complaints under the Gordon College Committee on Decorum and Investigation (CODI).
                </p>

                <p className="font-semibold text-gray-700 mt-3">3. Prohibited Actions</p>
                <p>
                  You may not use SpeakUp GC to: (a) submit false or fabricated reports; (b) harass, threaten, or defame any individual; (c) violate any applicable laws or regulations; or (d) interfere with the proper functioning of the platform.
                </p>

                <p className="font-semibold text-gray-700 mt-3">4. Governing Law</p>
                <p>
                  This platform operates under <strong>Republic Act No. 11313 (Safe Spaces Act)</strong>, <strong>Republic Act No. 7877 (Anti-Sexual Harassment Act)</strong>, and the <strong>Gordon College Committee on Decorum and Investigation (GC-CODI)</strong> procedures. All complaints are subject to investigation and resolution in accordance with these legal frameworks.
                </p>

                <p className="font-semibold text-gray-700 mt-3">5. Modifications</p>
                <p>
                  Gordon College reserves the right to modify these terms at any time. Continued use of the platform constitutes acceptance of any changes.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1D9E75] shrink-0"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-snug">
                  I have read and agree to the Terms & Conditions.
                </span>
              </label>
            </div>
          )}

          {/* ── PRIVACY POLICY ── */}
          {step === "privacy" && (
            <div className="space-y-3">
              <div className="bg-[#F0FDF4] border border-[#1D9E75]/20 rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-2 max-h-[min(35vh,240px)] overflow-y-auto">
                <p className="font-semibold text-[#178F65] text-sm">Privacy Policy — SpeakUp GC</p>
                
                <p className="font-semibold text-gray-700 mt-3">Data Collection & Use</p>
                <p>
                  All complaints submitted through SpeakUp GC are handled with <strong>strict confidentiality</strong> by the Diversity, Equity, and Inclusion Unit (DEIU) of Gordon College. Your identity will <strong>never be disclosed</strong> to respondents or any other party without your explicit consent.
                </p>

                <p className="font-semibold text-gray-700 mt-3">Legal Compliance</p>
                <p>
                  This system complies with <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong>, <strong>Republic Act No. 11313 (Safe Spaces Act)</strong>, and the <strong>Gordon College Committee on Decorum and Investigation (CODI)</strong>.
                </p>

                <p className="font-semibold text-gray-700 mt-3">Data Security</p>
                <p>
                  You may file complaints as an identified complainant or anonymously. Your data is stored securely using industry-standard encryption and accessed only by authorized DEIU personnel for investigation purposes.
                </p>

                <p className="font-semibold text-gray-700 mt-3">Your Rights</p>
                <p>
                  Under RA 10173, you have the right to access, correct, and request deletion of your personal data. You may also withdraw consent at any time, subject to legal and contractual restrictions.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1D9E75] shrink-0"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-snug">
                  I have read and understood the Privacy Policy. I consent to my information being stored and processed by the DEIU in accordance with RA 10173.
                </span>
              </label>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div className="text-center space-y-4 py-2">
              <div className="flex justify-center">
                <div className="bg-[#F0FDF4] rounded-full p-4 border-4 border-[#1D9E75]/20">
                  <CheckCircle2 className="h-10 w-10 text-[#1D9E75]" />
                </div>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">You're all set, {alias}!</p>
                <p className="text-sm text-gray-500 mt-1">Your profile is ready. Welcome to SpeakUp GC.</p>
              </div>
              <div className="flex gap-2 text-xs text-gray-400 justify-center flex-wrap">
                <span className="bg-gray-100 rounded-full px-3 py-1">Alias: <strong className="text-gray-700">{alias}</strong></span>
                <span className="bg-gray-100 rounded-full px-3 py-1">Notifications: <strong className="text-gray-700 capitalize">{notifPref}</strong></span>
                <span className="bg-green-50 text-green-700 rounded-full px-3 py-1">✓ Terms accepted</span>
                <span className="bg-green-50 text-green-700 rounded-full px-3 py-1">✓ Privacy accepted</span>
              </div>
            </div>
          )}

          </div>
        </div>

        {/* Sticky footer — buttons always visible */}
        <div className="shrink-0 px-6 pb-6 pt-3 border-t border-gray-100 bg-white">
          {step === "alias" && (
            <Button
              onClick={handleAliasNext}
              className="w-full bg-[#1D9E75] hover:bg-[#178F65] text-white rounded-xl"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === "terms" && (
            <Button
              onClick={handleTermsNext}
              disabled={!termsAccepted}
              className="w-full bg-[#1D9E75] hover:bg-[#178F65] text-white rounded-xl disabled:opacity-50"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === "privacy" && (
            <Button
              onClick={handlePrivacyNext}
              disabled={!privacyAccepted || saving}
              className="w-full bg-[#1D9E75] hover:bg-[#178F65] text-white rounded-xl disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <>Complete Setup <CheckCircle2 className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          )}
          {step === "done" && (
            <Button
              onClick={() => onComplete(alias.trim())}
              className="w-full bg-[#1D9E75] hover:bg-[#178F65] text-white rounded-xl"
            >
              Go to My Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
