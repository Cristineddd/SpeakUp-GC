import React, { useState, useEffect } from "react";
import { Mail, Key, User, Bell, Shield, CheckCircle2, Loader2, Pencil, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "../compat/router";
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
import { PushNotificationSettings } from "../components/notifications/PushNotificationSettings";

type NotifPref = "email" | "in-app" | "both";

const NOTIF_OPTIONS: { value: NotifPref; label: string; desc: string }[] = [
  { value: "email",  label: "Email only",         desc: "Updates sent to your registered email" },
  { value: "in-app", label: "In-app only",        desc: "Notifications inside SpeakUp GC" },
  { value: "both",   label: "Both (recommended)", desc: "Email + in-app notifications" },
];

const Account = () => {
  const { toast } = useToast();
  const { user, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
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

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    navigate('/');
    setShowLogoutDialog(false);
    toast({
      title: "Logged Out",
      description: "You have been safely logged out of your account.",
    });
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
    <div className="min-h-full">
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your identity, notifications, and security settings.</p>
        </div>

        {/* ── Profile Setup Status Banner ── */}
        {!profileLoading && (
          <div className={cn(
            "flex items-start gap-3 p-4 rounded-2xl border text-sm",
            profileSetupComplete
              ? "bg-[#F0FDF4] border-[#1D9E75]/25 text-[#178F65]"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
          )}>
            {profileSetupComplete
              ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#1D9E75]" />
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
            <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ════ LEFT COLUMN ════ */}
            <div className="space-y-5">

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
                        className="bg-[#1D9E75] hover:bg-[#178F65] text-white rounded-lg"
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

            </div>

            {/* ════ RIGHT COLUMN ════ */}
            <div className="space-y-5">

            {/* ── Notification Preference Card ── */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4 text-blue-600" />
                      Notification Preference
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      How you receive updates about your case status.
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-semibold">
                    System Default
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">
                        Both (Recommended)
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Email + in-app notifications
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-blue-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">This setting is locked to ensure you never miss important case updates</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <PushNotificationSettings />

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
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", privacyAccepted ? "text-[#1D9E75]" : "text-gray-300")} />
                  <div>
                    <p className={cn("text-sm font-medium", privacyAccepted ? "text-[#178F65]" : "text-gray-500")}>
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

            {/* ── Sign Out Section ── */}
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-3 border-b border-red-100">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-red-700">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </CardTitle>
                <CardDescription className="text-xs">Log out of your SpeakUp GC account.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">End your session</p>
                    <p className="text-xs text-gray-500 mt-0.5">You can log back in anytime</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setShowLogoutDialog(true)} 
                    className="rounded-lg bg-red-600 hover:bg-red-700"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            </div>
          </div>
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

        {/* ── Logout Confirmation Dialog ── */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be safely logged out of your SpeakUp GC account. You can log back in anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                Yes, Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
};

export default Account;
