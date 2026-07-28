/**
 * ProfileSetupGate — SpeakUp GC
 *
 * Mounts Laya's ProfileSetupModal once for first-time users after signup/login.
 * Lives in the protected layout so it shows on any authenticated page, not only
 * the dashboard (where overflow clipping / silent getDoc failures used to hide it).
 */
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useRepresentativeRole } from "../hooks/useRepresentativeRole";
import ProfileSetupModal from "./ProfileSetupModal";

export default function ProfileSetupGate() {
  const { currentUser, isAdmin } = useAuth();
  const { role: repRole, loading: repLoading } = useRepresentativeRole();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid || repLoading) return;

    // Staff / admins skip complainant onboarding
    if (
      isAdmin ||
      repRole === "admin" ||
      repRole === "handler" ||
      repRole === "codi"
    ) {
      setChecked(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (cancelled) return;
        // Show Laya walkthrough when doc is missing OR setup not finished
        if (!snap.exists() || !snap.data()?.profileSetupComplete) {
          setShowProfileSetup(true);
        }
      } catch (err) {
        console.warn("ProfileSetupGate: profile check failed, showing setup anyway", err);
        // Fail open — permission / network errors must not hide first-login setup
        if (!cancelled) setShowProfileSetup(true);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, isAdmin, repRole, repLoading]);

  if (!checked && !showProfileSetup) return null;

  return (
    <ProfileSetupModal
      isOpen={showProfileSetup}
      onComplete={(completedAlias?: string) => {
        setShowProfileSetup(false);
        if (completedAlias && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("speakup:profile-setup-complete", {
              detail: { alias: completedAlias },
            })
          );
        }
      }}
    />
  );
}
