import React, { useState, useEffect } from "react";
import { Mail, Key, User, Bell, Shield, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { cn } from "../lib/utils";
import { NotificationService } from "../services/notificationService";

type NotifPref = "email" | "in-app" | "both";

const NOTIF_OPTIONS: { value: NotifPref; label: string; desc: string }[] = [
  { value: "email",  label: "Email only",         desc: "Updates sent to your registered email" },
  { value: "in-app", label: "In-app only",        desc: "Notifications inside SpeakUp GC" },
  { value: "both",   label: "Both (recommended)", desc: "Email + in-app notifications" },
];

const Account = () => {
  const { toast } = useToast();
  const { user, currentUser } = useAuth();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // ── Profile data from Firestore ──────────────────────────────────────────
  const [profileLoading, setProfileLoading] = useState(true);
  const [alias, setAlias] = useState("");
  const [notifPref, setNotifPref] = useState<NotifPref>("both");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [profileSetupComplete, setProfileSetupComplete] = useState(false);
  const [setupDate, setSetupDate] = useState<string | null>(null);

  // ── Edit states ──────────────────────────────────────────────────────────
  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasError, setAliasError] = useState("");
  const [savingAlias, setSavingAlias] = useState(false);

  const [editingNotif, setEditingNotif] = useState(false);
  const [notifInput, setNotifInput] = useState<NotifPref>("both");
  const [savingNotif, setSavingNotif] = useState(false);

  // ── Load Firestore profile ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          setAlias(data.alias ?? "");
          setNotifPref(data.notificationPreference ?? "both");
          setPrivacyAccepted(data.privacyAccepted ?? false);
          setProfileSetupComplete(data.profileSetupComplete ?? false);
          setSetupDate(data.profileSetupCompletedAt ?? null);
        }
      } catch (err) {
        console.error("Account: could not load profile", err);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [currentUser?.uid]);

  // ── Save alias ───────────────────────────────────────────────────────────
  const handleSaveAlias = async () => {
    const trimmed = aliasInput.trim();
    if (!trimmed) { setAliasError("Alias cannot be empty."); return; }
    if (trimmed.length < 3) { setAliasError("Alias must be at least 3 characters."); return; }
    if (trimmed.length > 30) { setAliasError("Alias must be 30 characters or fewer."); return; }
    setAliasError("");
    setSavingAlias(true);
    try {
      await updateDoc(doc(db, "users", currentUser!.uid), { alias: trimmed });
      setAlias(trimmed);
      setEditingAlias(false);
      toast({ title: "Alias updated", description: `Your alias is now "${trimmed}".` });
    } catch {
      toast({ title: "Error", description: "Could not update alias. Please try again.", variant: "destructive" });
    } finally {
      setSavingAlias(false);
    }
  };

  // ── Save notification preference ─────────────────────────────────────────
  const handleSaveNotif = async () => {
    setSavingNotif(true);
    try {
      // 1. Save simple preference label to the user's document
      await updateDoc(doc(db, "users", currentUser!.uid), { notificationPreference: notifInput });

      // 2. Sync to the notificationPreferences collection that notificationService reads
      await NotificationService.updatePreferences(
        currentUser!.uid,
        user?.email ?? "",
        {
          emailEnabled: notifInput === "email" || notifInput === "both",
          inAppEnabled: notifInput === "in-app" || notifInput === "both",
          // Always send immediately — no digest delay
          emailDigest: (notifInput === "email" || notifInput === "both") ? "immediate" : "never",
        }
      );

      setNotifPref(notifInput);
      setEditingNotif(false);
      toast({ title: "Notification preference updated" });
    } catch {
      toast({ title: "Error", description: "Could not update preference. Please try again.", variant: "destructive" });
    } finally {
      setSavingNotif(false);
    }
  };

  // ── Reset password ───────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!user?.email) {
      toast({ title: "Error", description: "No email address found.", variant: "destructive" });
      return;
    }
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setShowResetDialog(false);
      toast({
        title: "✨ Reset Email Sent!",
        description: `A password reset link has been sent to ${user.email}. Check your inbox (and spam folder).`,
      });
    } catch (error: any) {
      let errorMessage = "Failed to send reset email. Please try again.";
      if (error.code === "auth/too-many-requests") errorMessage = "Too many requests. Please try again later.";
      toast({ title: "❌ Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your identity, notifications, and security settings.</p>
        </div>

        {/* ── Profile Setup Status Banner ── */}
        {!profileLoading && (
          <div className={cn(
            "flex items-start gap-3 p-4 rounded-2xl border text-sm",
            profileSetupComplete
              ? "bg-[#F0FDF4] border-[#16A34A]/25 text-[#15803D]"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
          )}>
            {profileSetupComplete
              ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#16A34A]" />
              : <Shield className="h-4 w-4 shrink-0 mt-0.5 text-yellow-600" />
            }
            <div>
              <p className="font-semibold">
                {profileSetupComplete ? "Profile setup complete" : "Profile setup incomplete"}
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                {profileSetupComplete
                  ? setupDate
                    ? `Completed on ${new Date(setupDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                    : "Your profile has been set up."
                  : "Some profile fields are missing. You can fill them in below."
                }
              </p>
            </div>
          </div>
        )}

        {profileLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#16A34A]" />
          </div>
        ) : (
          <>
            {/* ── Alias Card ── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  Alias / Pseudonym
                </CardTitle>
                <CardDescription className="text-xs">
                  This alias protects your identity in complaint cases. It is never shown to respondents.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {editingAlias ? (
                  <div className="space-y-3">
                    <Input
                      value={aliasInput}
                      onChange={(e) => { setAliasInput(e.target.value); setAliasError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveAlias(); if (e.key === "Escape") setEditingAlias(false); }}
                      placeholder="e.g. BlueStar22"
                      maxLength={30}
                      autoFocus
                      className={cn("rounded-xl", aliasError ? "border-red-400" : "")}
                    />
                    {aliasError && <p className="text-xs text-red-500">{aliasError}</p>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveAlias}
                        disabled={savingAlias}
                        className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg"
                      >
                        {savingAlias ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingAlias(false); setAliasError(""); }} className="rounded-lg">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      {alias ? (
                        <p className="font-semibold text-gray-900">{alias}</p>
                      ) : (
                        <p className="text-gray-400 italic text-sm">No alias set yet</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">Used to protect your identity in cases</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setAliasInput(alias); setEditingAlias(true); }}
                      className="shrink-0 rounded-lg flex items-center gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Notification Preference Card ── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  Notification Preference
                </CardTitle>
                <CardDescription className="text-xs">
                  How you receive updates about your case status.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {editingNotif ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {NOTIF_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setNotifInput(opt.value)}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                            notifInput === opt.value
                              ? "border-[#16A34A] bg-[#F0FDF4] text-[#15803D]"
                              : "border-gray-200 hover:border-gray-300 text-gray-700"
                          )}
                        >
                          <span className="font-medium">{opt.label}</span>
                          <span className="block text-xs text-gray-400 mt-0.5">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNotif}
                        disabled={savingNotif}
                        className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg"
                      >
                        {savingNotif ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingNotif(false)} className="rounded-lg">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">
                        {NOTIF_OPTIONS.find(o => o.value === notifPref)?.label ?? "Not set"}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {NOTIF_OPTIONS.find(o => o.value === notifPref)?.desc ?? ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setNotifInput(notifPref); setEditingNotif(true); }}
                      className="shrink-0 rounded-lg flex items-center gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Privacy Status Card ── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-500" />
                  Privacy Notice
                </CardTitle>
                <CardDescription className="text-xs">
                  Your acceptance of SpeakUp GC's confidentiality policy.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  privacyAccepted ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", privacyAccepted ? "text-[#16A34A]" : "text-gray-300")} />
                  <div>
                    <p className={cn("text-sm font-medium", privacyAccepted ? "text-[#15803D]" : "text-gray-500")}>
                      {privacyAccepted ? "Privacy notice accepted" : "Privacy notice not yet accepted"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      RA 11313 (Safe Spaces Act) · Gordon College CODI
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-100">
                  All complaints are handled with strict confidentiality by the DEIU. Your identity is never disclosed to respondents without your explicit consent. You may file complaints identified or anonymously.
                </div>
              </CardContent>
            </Card>

            {/* ── Account Info Card ── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  Account Information
                </CardTitle>
                <CardDescription className="text-xs">Your registered email address (cannot be changed).</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-gray-50 cursor-not-allowed rounded-xl"
                />
              </CardContent>
            </Card>

            {/* ── Security Card ── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4 text-gray-500" />
                  Security
                </CardTitle>
                <CardDescription className="text-xs">Manage your password.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Password</p>
                    <p className="text-xs text-gray-500 mt-0.5">Send a reset link to your email</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} className="rounded-lg">
                    Reset Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Reset Password Dialog ── */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Password</AlertDialogTitle>
              <AlertDialogDescription>
                We will send a password reset link to <strong>{user?.email}</strong>.
                Please check your email and follow the instructions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetPassword} disabled={isResetting}>
                {isResetting ? "Sending..." : "Send Reset Link"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
};

export default Account;
